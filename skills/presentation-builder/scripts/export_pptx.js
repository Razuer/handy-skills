#!/usr/bin/env node
/**
 * export_pptx.js - export generated deck.html to a PowerPoint .pptx file.
 *
 * Modes:
 *   editable - approximate editable handoff: text boxes, simple rectangles, and images.
 *   raster   - faithful fallback: one PNG screenshot per slide.
 *
 * This intentionally avoids extra npm dependencies. It writes the small OOXML
 * package directly as an uncompressed ZIP and uses Playwright only for DOM
 * geometry/screenshots.
 */

const fs = require('fs');
const path = require('path');

const SLIDE_W = 1920;
const SLIDE_H = 1080;
const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;
const EMU_PER_PX = SLIDE_CX / SLIDE_W;
const REL_NS = 'http://schemas.openxmlformats.org/package/2006/relationships';
const OFFICE_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

function usage() {
  return 'Usage: node export_pptx.js deck.html --out deck.pptx [--mode=editable|raster] [--slides=1,3] [--range=2-5]';
}

function parseArgs(argv) {
  const args = { deck: null, out: null, mode: 'editable', slides: null, range: null, quiet: false };
  const input = argv.slice(2);
  for (let i = 0; i < input.length; i += 1) {
    const arg = input[i];
    if (arg === '--quiet') args.quiet = true;
    else if (arg.startsWith('--out=')) args.out = arg.split('=', 2)[1];
    else if (arg === '--out') args.out = input[++i];
    else if (arg.startsWith('--mode=')) args.mode = arg.split('=', 2)[1];
    else if (arg.startsWith('--slides=')) args.slides = arg.split('=', 2)[1];
    else if (arg.startsWith('--range=')) args.range = arg.split('=', 2)[1];
    else if (arg.startsWith('--')) throw new Error(`Unknown option '${arg}'. ${usage()}`);
    else if (!args.deck) args.deck = arg;
  }
  if (!args.deck) throw new Error(`Missing deck.html path. ${usage()}`);
  if (!args.out) args.out = path.join(path.dirname(path.resolve(args.deck)), 'deck.pptx');
  if (!['editable', 'raster'].includes(args.mode)) throw new Error(`--mode must be editable or raster (got '${args.mode}').`);
  return args;
}

function parseSlideSelector(spec, total) {
  const out = new Set();
  if (!spec) return [];
  for (const token of spec.split(',')) {
    const t = token.trim();
    if (!t) continue;
    if (t.includes('-')) {
      const [a, b] = t.split('-', 2).map((x) => parseInt(x, 10));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        for (let i = Math.min(a, b); i <= Math.max(a, b); i += 1) if (i >= 1 && i <= total) out.add(i);
      }
    } else {
      const n = parseInt(t, 10);
      if (Number.isFinite(n) && n >= 1 && n <= total) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function attr(value) { return xmlEscape(value); }
function pxToEmu(value) { return Math.max(0, Math.round(value * EMU_PER_PX)); }
function ptToSz(pt) { return Math.max(100, Math.round(pt * 100)); }

function safeName(value, fallback = 'Presentation') {
  return String(value || fallback).replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) || fallback;
}

function colorParts(css) {
  const value = String(css || '').trim();
  if (!value || value === 'transparent') return null;
  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return { hex: h.slice(0, 6).toUpperCase(), alpha: h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  const rgba = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgba) return null;
  const parts = rgba[1].split(',').map((p) => p.trim());
  const r = Math.max(0, Math.min(255, parseFloat(parts[0]) || 0));
  const g = Math.max(0, Math.min(255, parseFloat(parts[1]) || 0));
  const b = Math.max(0, Math.min(255, parseFloat(parts[2]) || 0));
  const a = parts[3] == null ? 1 : Math.max(0, Math.min(1, parseFloat(parts[3])));
  return { hex: [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase(), alpha: a };
}

function solidFill(color) {
  const c = colorParts(color);
  if (!c || c.alpha < 0.05) return '<a:noFill/>';
  const alpha = c.alpha < 0.995 ? `<a:alpha val="${Math.round(c.alpha * 100000)}"/>` : '';
  return `<a:solidFill><a:srgbClr val="${c.hex}">${alpha}</a:srgbClr></a:solidFill>`;
}

function firstFont(fontFamily) {
  const raw = String(fontFamily || 'Arial').split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  return raw || 'Arial';
}

function alignValue(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'center') return 'ctr';
  if (v === 'right' || v === 'end') return 'r';
  if (v === 'justify') return 'just';
  return 'l';
}

function rectXml(item) {
  const line = colorParts(item.borderColor) && item.borderWidth > 0
    ? `<a:ln w="${Math.round(item.borderWidth * EMU_PER_PX)}">${solidFill(item.borderColor)}</a:ln>`
    : '<a:ln><a:noFill/></a:ln>';
  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${item.id}" name="${attr(item.name)}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="${pxToEmu(item.x)}" y="${pxToEmu(item.y)}"/><a:ext cx="${pxToEmu(item.w)}" cy="${pxToEmu(item.h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${solidFill(item.fill)}${line}</p:spPr>
  </p:sp>`;
}

function textXml(item) {
  const c = colorParts(item.color) || { hex: '111111', alpha: 1 };
  const b = item.bold ? ' b="1"' : '';
  const i = item.italic ? ' i="1"' : '';
  const paragraphs = String(item.text || '').split(/\n+/).filter(Boolean);
  const paraXml = (paragraphs.length ? paragraphs : ['']).map((line) => `<a:p><a:pPr algn="${alignValue(item.align)}"/><a:r><a:rPr lang="en-US" sz="${ptToSz(item.fontSizePt)}"${b}${i}><a:solidFill><a:srgbClr val="${c.hex}"/></a:solidFill><a:latin typeface="${attr(firstFont(item.fontFamily))}"/></a:rPr><a:t>${xmlEscape(line)}</a:t></a:r><a:endParaRPr lang="en-US" sz="${ptToSz(item.fontSizePt)}"/></a:p>`).join('');
  return `<p:sp>
    <p:nvSpPr><p:cNvPr id="${item.id}" name="${attr(item.name)}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>
    <p:spPr><a:xfrm><a:off x="${pxToEmu(item.x)}" y="${pxToEmu(item.y)}"/><a:ext cx="${pxToEmu(item.w)}" cy="${pxToEmu(item.h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></p:spPr>
    <p:txBody><a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0"/><a:lstStyle/>${paraXml}</p:txBody>
  </p:sp>`;
}

function imageXml(item) {
  return `<p:pic>
    <p:nvPicPr><p:cNvPr id="${item.id}" name="${attr(item.name)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr>
    <p:blipFill><a:blip r:embed="${attr(item.rId)}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>
    <p:spPr><a:xfrm><a:off x="${pxToEmu(item.x)}" y="${pxToEmu(item.y)}"/><a:ext cx="${pxToEmu(item.w)}" cy="${pxToEmu(item.h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
  </p:pic>`;
}

function groupShapeXml() {
  return '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';
}

function slideXml(items) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${OFFICE_REL}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${groupShapeXml()}${items.map((item) => item.kind === 'image' ? imageXml(item) : (item.kind === 'text' ? textXml(item) : rectXml(item))).join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
}

function relsXml(rels) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="${REL_NS}">${rels.map((rel) => `<Relationship Id="${attr(rel.id)}" Type="${attr(rel.type)}" Target="${attr(rel.target)}"/>`).join('')}</Relationships>`;
}

function contentTypesXml(slideCount, mediaFiles) {
  const mediaDefaults = new Set(mediaFiles.map((file) => path.extname(file).slice(1).toLowerCase()).filter(Boolean));
  const defaults = [
    ['rels', 'application/vnd.openxmlformats-package.relationships+xml'],
    ['xml', 'application/xml'],
    ...[...mediaDefaults].map((ext) => [ext, ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`]),
  ];
  const overrides = [
    ['/docProps/app.xml', 'application/vnd.openxmlformats-officedocument.extended-properties+xml'],
    ['/docProps/core.xml', 'application/vnd.openxmlformats-package.core-properties+xml'],
    ['/ppt/presentation.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml'],
    ['/ppt/slideMasters/slideMaster1.xml', 'application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml'],
    ['/ppt/slideLayouts/slideLayout1.xml', 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml'],
    ['/ppt/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml'],
  ];
  for (let i = 1; i <= slideCount; i += 1) overrides.push([`/ppt/slides/slide${i}.xml`, 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml']);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${defaults.map(([ext, type]) => `<Default Extension="${ext}" ContentType="${type}"/>`).join('')}${overrides.map(([part, type]) => `<Override PartName="${part}" ContentType="${type}"/>`).join('')}</Types>`;
}

function presentationXml(slideCount) {
  const ids = Array.from({ length: slideCount }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${OFFICE_REL}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${ids}</p:sldIdLst><p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}" type="wide"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
}

function staticParts(slideCount, mediaFiles, title) {
  const presentationRels = [{ id: 'rId1', type: `${OFFICE_REL}/slideMaster`, target: 'slideMasters/slideMaster1.xml' }];
  for (let i = 1; i <= slideCount; i += 1) presentationRels.push({ id: `rId${i + 1}`, type: `${OFFICE_REL}/slide`, target: `slides/slide${i}.xml` });
  return {
    '[Content_Types].xml': contentTypesXml(slideCount, mediaFiles),
    '_rels/.rels': relsXml([
      { id: 'rId1', type: `${OFFICE_REL}/officeDocument`, target: 'ppt/presentation.xml' },
      { id: 'rId2', type: 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', target: 'docProps/core.xml' },
      { id: 'rId3', type: `${OFFICE_REL}/extended-properties`, target: 'docProps/app.xml' },
    ]),
    'docProps/core.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(title)}</dc:title><dc:creator>presentation-builder</dc:creator><cp:lastModifiedBy>presentation-builder</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:modified></cp:coreProperties>`,
    'docProps/app.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>presentation-builder</Application><PresentationFormat>Widescreen</PresentationFormat><Slides>${slideCount}</Slides></Properties>`,
    'ppt/presentation.xml': presentationXml(slideCount),
    'ppt/_rels/presentation.xml.rels': relsXml(presentationRels),
    'ppt/slideMasters/slideMaster1.xml': slideMasterXml(),
    'ppt/slideMasters/_rels/slideMaster1.xml.rels': relsXml([
      { id: 'rId1', type: `${OFFICE_REL}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' },
      { id: 'rId2', type: `${OFFICE_REL}/theme`, target: '../theme/theme1.xml' },
    ]),
    'ppt/slideLayouts/slideLayout1.xml': slideLayoutXml(),
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels': relsXml([{ id: 'rId1', type: `${OFFICE_REL}/slideMaster`, target: '../slideMasters/slideMaster1.xml' }]),
    'ppt/theme/theme1.xml': themeXml(),
  };
}

function slideLayoutXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${OFFICE_REL}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${groupShapeXml()}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
}

function slideMasterXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${OFFICE_REL}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree>${groupShapeXml()}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle/><p:bodyStyle/><p:otherStyle/></p:txStyles></p:sldMaster>`;
}

function themeXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="presentation-builder"><a:themeElements><a:clrScheme name="pb"><a:dk1><a:srgbClr val="111111"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="333333"/></a:dk2><a:lt2><a:srgbClr val="F7F7F7"/></a:lt2><a:accent1><a:srgbClr val="3756F5"/></a:accent1><a:accent2><a:srgbClr val="9A342D"/></a:accent2><a:accent3><a:srgbClr val="2E6B4A"/></a:accent3><a:accent4><a:srgbClr val="D97757"/></a:accent4><a:accent5><a:srgbClr val="2A5D8A"/></a:accent5><a:accent6><a:srgbClr val="F0A830"/></a:accent6><a:hlink><a:srgbClr val="3756F5"/></a:hlink><a:folHlink><a:srgbClr val="8A2A3A"/></a:folHlink></a:clrScheme><a:fontScheme name="pb"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="pb"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/></a:schemeClr></a:solidFill><a:solidFill><a:schemeClr val="phClr"><a:shade val="95000"/></a:schemeClr></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="lt1"/></a:solidFill><a:solidFill><a:schemeClr val="lt2"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();
function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipDateTime(date = new Date()) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

function writeZip(entries, outFile) {
  const chunks = [];
  const central = [];
  let offset = 0;
  const dt = zipDateTime();
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(String(entry.data), 'utf8');
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dt.time, 10);
    local.writeUInt16LE(dt.date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    chunks.push(local, name, data);

    const cent = Buffer.alloc(46);
    cent.writeUInt32LE(0x02014b50, 0);
    cent.writeUInt16LE(20, 4);
    cent.writeUInt16LE(20, 6);
    cent.writeUInt16LE(0, 8);
    cent.writeUInt16LE(0, 10);
    cent.writeUInt16LE(dt.time, 12);
    cent.writeUInt16LE(dt.date, 14);
    cent.writeUInt32LE(crc, 16);
    cent.writeUInt32LE(data.length, 20);
    cent.writeUInt32LE(data.length, 24);
    cent.writeUInt16LE(name.length, 28);
    cent.writeUInt16LE(0, 30);
    cent.writeUInt16LE(0, 32);
    cent.writeUInt16LE(0, 34);
    cent.writeUInt16LE(0, 36);
    cent.writeUInt32LE(0, 38);
    cent.writeUInt32LE(offset, 42);
    central.push(cent, name);
    offset += local.length + name.length + data.length;
  }
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, Buffer.concat([...chunks, ...central, end]));
}

function findChromium() {
  const candidates = [];
  const cache = path.join(process.env.HOME || '', '.cache', 'ms-playwright');
  if (fs.existsSync(cache)) {
    for (const entry of fs.readdirSync(cache)) {
      if (entry.startsWith('chromium-')) candidates.push(path.join(cache, entry, 'chrome-linux', 'chrome'));
    }
  }
  candidates.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
  return candidates.find((p) => fs.existsSync(p));
}

async function preparePage(deckPath) {
  const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright'));
  const executablePath = findChromium();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});
  const ctx = await browser.newContext({ viewport: { width: SLIDE_W, height: SLIDE_H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + deckPath, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const stage = document.querySelector('deck-stage');
    if (stage) {
      const slides = Array.from(stage.querySelectorAll(':scope > section.slide'));
      slides.forEach((slide) => document.body.appendChild(slide));
      stage.style.display = 'none';
    }
    const tweaks = document.getElementById('tweaks-mount');
    if (tweaks) tweaks.style.display = 'none';
  });
  await page.addStyleTag({ content: `
    html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; width: ${SLIDE_W}px; height: ${SLIDE_H}px; }
    .export-hidden, #tweaks-mount { display: none !important; }
    section.slide { position: fixed !important; top: 0 !important; left: 0 !important; visibility: hidden !important; transform: none !important; }
    section.slide.__export-active { visibility: visible !important; }
  ` });
  const slideInfo = await page.evaluate(() => Array.from(document.querySelectorAll('section.slide')).map((slide, i) => ({ index: i + 1, label: slide.getAttribute('data-label') || `Slide ${i + 1}` })));
  return { browser, page, slideInfo };
}

async function activateSlide(page, index) {
  await page.evaluate((idx) => {
    const slides = document.querySelectorAll('section.slide');
    slides.forEach((slide, i) => slide.classList.toggle('__export-active', i === idx));
  }, index - 1);
  await page.waitForTimeout(80);
}

async function rasterSlide(page, index) {
  await activateSlide(page, index);
  return page.screenshot({ clip: { x: 0, y: 0, width: SLIDE_W, height: SLIDE_H } });
}

async function snapshotEditableSlide(page, index) {
  await activateSlide(page, index);
  return page.evaluate((idx) => {
    const slide = document.querySelectorAll('section.slide')[idx - 1];
    const slideRect = slide.getBoundingClientRect();
    let nextId = 2;

    function rectOf(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left - slideRect.left, y: r.top - slideRect.top, w: r.width, h: r.height };
    }
    function shown(el) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.02 && r.width > 1 && r.height > 1;
    }
    function rgbaAlpha(value) {
      if (!value || value === 'transparent') return 0;
      const m = String(value).match(/^rgba?\(([^)]+)\)$/i);
      if (!m) return value.startsWith('#') ? 1 : 0;
      const parts = m[1].split(',').map((p) => p.trim());
      return parts[3] == null ? 1 : Math.max(0, Math.min(1, parseFloat(parts[3]) || 0));
    }
    function directText(el) {
      return Array.from(el.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.nodeValue.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .join(' ');
    }
    function cssNumber(value) { return parseFloat(value) || 0; }
    function absoluteUrl(src) {
      try { return new URL(src, document.baseURI).href; } catch (_) { return src; }
    }

    const bg = getComputedStyle(slide).backgroundColor || '#ffffff';
    const shapes = [{ kind: 'rect', id: nextId++, name: 'Slide background', x: 0, y: 0, w: 1920, h: 1080, fill: bg, borderWidth: 0, borderColor: 'transparent' }];
    const texts = [];
    const images = [];
    const seenText = new Set();

    for (const el of Array.from(slide.querySelectorAll('*'))) {
      if (!shown(el)) continue;
      if (['SCRIPT', 'STYLE', 'TEMPLATE'].includes(el.tagName)) continue;
      const cs = getComputedStyle(el);
      const r = rectOf(el);
      if (r.x > 1920 || r.y > 1080 || r.x + r.w < 0 || r.y + r.h < 0) continue;

      const isImg = el.tagName === 'IMG';
      const isSlot = el.tagName === 'IMAGE-SLOT';
      if (isImg && el.currentSrc) {
        images.push({ kind: 'image', id: nextId++, name: el.getAttribute('alt') || 'Image', x: r.x, y: r.y, w: r.w, h: r.h, src: absoluteUrl(el.currentSrc) });
        continue;
      }
      if (isSlot) {
        const src = el.getAttribute('src') || (el.shadowRoot && el.shadowRoot.querySelector('img') && el.shadowRoot.querySelector('img').currentSrc);
        if (src) images.push({ kind: 'image', id: nextId++, name: el.getAttribute('aria-label') || el.id || 'Image slot', x: r.x, y: r.y, w: r.w, h: r.h, src: absoluteUrl(src) });
        else {
          shapes.push({ kind: 'rect', id: nextId++, name: el.id || 'Image slot', x: r.x, y: r.y, w: r.w, h: r.h, fill: cs.backgroundColor || 'rgba(0,0,0,0.04)', borderWidth: 1, borderColor: cs.borderTopColor || '#cccccc' });
          const placeholder = el.getAttribute('placeholder');
          if (placeholder) texts.push({ kind: 'text', id: nextId++, name: 'Image placeholder', x: r.x + r.w * 0.15, y: r.y + r.h * 0.42, w: r.w * 0.7, h: Math.max(24, r.h * 0.16), text: placeholder, color: cs.color, fontFamily: cs.fontFamily, fontSizePt: 9, bold: false, italic: false, align: 'center' });
        }
        continue;
      }

      const bgAlpha = rgbaAlpha(cs.backgroundColor);
      const borderWidth = Math.max(cssNumber(cs.borderTopWidth), cssNumber(cs.borderRightWidth), cssNumber(cs.borderBottomWidth), cssNumber(cs.borderLeftWidth));
      if ((bgAlpha > 0.04 || borderWidth > 0.4) && r.w * r.h > 900 && !el.closest('image-slot')) {
        shapes.push({ kind: 'rect', id: nextId++, name: el.className || el.tagName, x: r.x, y: r.y, w: r.w, h: r.h, fill: bgAlpha > 0.04 ? cs.backgroundColor : 'transparent', borderWidth, borderColor: cs.borderTopColor });
      }

      const text = directText(el);
      if (text && !seenText.has(el)) {
        seenText.add(el);
        const weight = cs.fontWeight === 'bold' ? 700 : parseInt(cs.fontWeight, 10) || 400;
        texts.push({ kind: 'text', id: nextId++, name: el.className || el.tagName, x: r.x, y: r.y, w: r.w, h: r.h + 4, text, color: cs.color, fontFamily: cs.fontFamily, fontSizePt: Math.max(6, (parseFloat(cs.fontSize) || 16) * 0.75), bold: weight >= 600, italic: cs.fontStyle === 'italic', align: cs.textAlign });
      }
    }

    return { shapes, images, texts };
  }, index);
}

function localImageFromSrc(src, deckDir) {
  if (!src) return null;
  if (src.startsWith('data:')) {
    const match = src.match(/^data:([^;,]+)(;base64)?,(.*)$/);
    if (!match || !match[2]) return null;
    const mime = match[1].toLowerCase();
    const ext = mime.includes('jpeg') ? 'jpg' : mime.split('/').pop();
    return { buffer: Buffer.from(match[3], 'base64'), ext };
  }
  if (src.startsWith('file://')) {
    const file = new URL(src);
    const ext = path.extname(file.pathname).slice(1).toLowerCase();
    if (!['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return null;
    return { buffer: fs.readFileSync(file), ext };
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return null;
  const abs = path.resolve(deckDir, src);
  const ext = path.extname(abs).slice(1).toLowerCase();
  if (!fs.existsSync(abs) || !['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return null;
  return { buffer: fs.readFileSync(abs), ext };
}

async function buildPptx(args) {
  const deckPath = path.resolve(args.deck);
  if (!fs.existsSync(deckPath)) throw new Error(`Deck not found: ${deckPath}`);
  const deckDir = path.dirname(deckPath);
  const outFile = path.resolve(args.out);
  const { browser, page, slideInfo } = await preparePage(deckPath);
  const total = slideInfo.length;
  const targets = args.slides ? parseSlideSelector(args.slides, total) : (args.range ? parseSlideSelector(args.range, total) : slideInfo.map((s) => s.index));
  if (!targets.length) throw new Error(`No slides selected. Deck has ${total} slide(s).`);

  const slideParts = [];
  const media = [];
  const title = await page.title();
  let mediaId = 1;

  try {
    for (const slideIndex of targets) {
      const items = [];
      const rels = [{ id: 'rId1', type: `${OFFICE_REL}/slideLayout`, target: '../slideLayouts/slideLayout1.xml' }];

      if (args.mode === 'raster') {
        const buffer = await rasterSlide(page, slideIndex);
        const mediaName = `ppt/media/image${mediaId++}.png`;
        media.push({ name: mediaName, data: buffer });
        rels.push({ id: 'rId2', type: `${OFFICE_REL}/image`, target: `../media/${path.basename(mediaName)}` });
        items.push({ kind: 'image', id: 2, name: `Slide ${slideIndex} raster`, x: 0, y: 0, w: SLIDE_W, h: SLIDE_H, rId: 'rId2' });
      } else {
        const snap = await snapshotEditableSlide(page, slideIndex);
        items.push(...snap.shapes);
        let relIndex = 2;
        for (const image of snap.images) {
          const file = localImageFromSrc(image.src, deckDir);
          if (!file) continue;
          const ext = file.ext === 'jpeg' ? 'jpg' : file.ext;
          const mediaName = `ppt/media/image${mediaId++}.${ext}`;
          media.push({ name: mediaName, data: file.buffer });
          const rId = `rId${relIndex++}`;
          rels.push({ id: rId, type: `${OFFICE_REL}/image`, target: `../media/${path.basename(mediaName)}` });
          items.push({ ...image, rId });
        }
        items.push(...snap.texts);
      }

      slideParts.push({ xml: slideXml(items), rels: relsXml(rels) });
      if (!args.quiet) console.log(`  exported slide ${slideIndex} (${args.mode})`);
    }
  } finally {
    await browser.close();
  }

  const parts = staticParts(slideParts.length, media.map((m) => m.name), title || safeName(path.basename(deckPath, '.html')));
  const entries = Object.entries(parts).map(([name, data]) => ({ name, data }));
  slideParts.forEach((slide, index) => {
    entries.push({ name: `ppt/slides/slide${index + 1}.xml`, data: slide.xml });
    entries.push({ name: `ppt/slides/_rels/slide${index + 1}.xml.rels`, data: slide.rels });
  });
  entries.push(...media);
  writeZip(entries, outFile);
  if (!args.quiet) console.log(`✓ Exported ${slideParts.length} slide(s) to ${outFile}`);
  return { outFile, slides: slideParts.length, mode: args.mode };
}

if (require.main === module) {
  buildPptx(parseArgs(process.argv)).catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { buildPptx, parseArgs, writeZip };
