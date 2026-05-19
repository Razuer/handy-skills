#!/usr/bin/env node
/**
 * render_slides.js — render slides to PNG for visual inspection.
 *
 * Lets the agent (or any user) visually inspect generated decks without
 * opening a browser. Each requested slide is rendered at its native
 * 1920×1080 resolution and saved as a PNG. The agent can then Read those
 * PNGs to verify layout, typography, and content.
 *
 * Like check_overflow.js, this forces every slide visible during render
 * so each one captures correctly regardless of which slide deck-stage
 * has navigated to.
 *
 * Usage:
 *   node render_slides.js path/to/deck.html
 *     → renders ALL slides into ./slide-shots/ next to the deck
 *
 *   node render_slides.js deck.html --slides=3,14,17
 *     → renders only slides 3, 14, and 17
 *
 *   node render_slides.js deck.html --range=1-5
 *     → renders slides 1 through 5 inclusive
 *
 *   node render_slides.js deck.html --out=/tmp/shots/
 *     → custom output directory
 *
 *   node render_slides.js deck.html --width=960
 *     → render at half-resolution (default: 1920) — useful for quick
 *       thumbnails; height scales proportionally
 *
 *   node render_slides.js deck.html --contact-sheet
 *     → also produces a single grid image (contact sheet) of every slide,
 *       useful for spotting odd ones at a glance
 *
 * Exit code is 0 on success, 1 on rendering failure, 2 on argument error.
 */

const path = require('path');
const fs = require('fs');

function parseSlideSelector(spec, total) {
  // "3,14,17" or "1-5" or "1-5,8,11-13"
  const out = new Set();
  for (const tok of spec.split(',')) {
    const t = tok.trim();
    if (!t) continue;
    if (t.includes('-')) {
      const [a, b] = t.split('-', 2).map((x) => parseInt(x, 10));
      if (Number.isFinite(a) && Number.isFinite(b)) {
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) {
          if (i >= 1 && i <= total) out.add(i);
        }
      }
    } else {
      const n = parseInt(t, 10);
      if (Number.isFinite(n) && n >= 1 && n <= total) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}

function parseArgs(argv) {
  const args = { deck: null, slides: null, range: null, out: null, width: 1920, contactSheet: false };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--slides=')) args.slides = a.split('=', 2)[1];
    else if (a.startsWith('--range=')) args.range = a.split('=', 2)[1];
    else if (a.startsWith('--out=')) args.out = a.split('=', 2)[1];
    else if (a.startsWith('--width=')) args.width = parseInt(a.split('=', 2)[1], 10) || 1920;
    else if (a === '--contact-sheet') args.contactSheet = true;
    else if (!args.deck) args.deck = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.deck) {
    console.error('Usage: render_slides.js <deck.html> [--slides=1,3,5] [--range=1-5] [--out=dir/] [--width=1920] [--contact-sheet]');
    process.exit(2);
  }
  const deckPath = path.resolve(args.deck);
  if (!fs.existsSync(deckPath)) {
    console.error(`Deck not found: ${deckPath}`);
    process.exit(2);
  }
  const outDir = args.out
    ? path.resolve(args.out)
    : path.join(path.dirname(deckPath), 'slide-shots');
  fs.mkdirSync(outDir, { recursive: true });

  const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright'));

  function findChromium() {
    const candidates = [];
    const cache = path.join(process.env.HOME || '', '.cache', 'ms-playwright');
    if (fs.existsSync(cache)) {
      for (const entry of fs.readdirSync(cache)) {
        if (entry.startsWith('chromium-')) {
          candidates.push(path.join(cache, entry, 'chrome-linux', 'chrome'));
        }
      }
    }
    candidates.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
    return candidates.find((p) => fs.existsSync(p));
  }
  const executablePath = findChromium();
  const browser = await chromium.launch(executablePath ? { executablePath } : {});

  // Render at native canvas size; scale down via --width if requested.
  const SLIDE_W = 1920;
  const SLIDE_H = 1080;
  const deviceScale = args.width / SLIDE_W;
  const renderW = args.width;
  const renderH = Math.round(SLIDE_H * deviceScale);

  const ctx = await browser.newContext({
    viewport: { width: renderW, height: renderH },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto('file://' + deckPath, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(200);

  // deck-stage is a web component that wraps slides in a shadow-DOM
  // viewer with its own rail/chrome. For clean per-slide screenshots we
  // bypass it: move every <section class="slide"> out of <deck-stage>
  // into the document body, then hide the deck-stage. CSS positions
  // exactly one slide at the viewport top-left at a time.
  await page.evaluate(() => {
    const stage = document.querySelector('deck-stage');
    if (stage) {
      const slides = Array.from(stage.querySelectorAll(':scope > section.slide'));
      slides.forEach((s) => document.body.appendChild(s));
      stage.style.display = 'none';
    }
    // Also hide any tweaks panel that the template mounts.
    const tweaks = document.getElementById('tweaks-mount');
    if (tweaks) tweaks.style.display = 'none';
  });

  await page.addStyleTag({ content: `
    html, body { margin: 0; padding: 0; overflow: hidden; }
    section.slide {
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      visibility: hidden !important;
      transform: ${deviceScale === 1 ? 'none' : `scale(${deviceScale})`} !important;
      transform-origin: top left !important;
    }
    section.slide.__render-active { visibility: visible !important; }
  ` });
  await page.waitForTimeout(150);

  const slideInfo = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('section.slide')).map((s, i) => ({
      index: i + 1,
      label: s.getAttribute('data-label') || `Slide ${i + 1}`,
    }));
  });
  const total = slideInfo.length;

  // Decide which slides to render.
  let targets;
  if (args.slides) targets = parseSlideSelector(args.slides, total);
  else if (args.range) targets = parseSlideSelector(args.range, total);
  else targets = slideInfo.map((s) => s.index);

  if (targets.length === 0) {
    console.error('No slides selected. Deck has ' + total + ' slide(s).');
    await browser.close();
    process.exit(2);
  }

  console.log(`Rendering ${targets.length} / ${total} slide(s) at ${renderW}×${renderH} → ${outDir}`);

  const rendered = [];
  for (const n of targets) {
    const info = slideInfo[n - 1];
    const safeLabel = info.label.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const fname = `slide-${String(n).padStart(2, '0')}-${safeLabel || 'slide'}.png`;
    const fpath = path.join(outDir, fname);
    try {
      await page.evaluate((idx) => {
        const slides = document.querySelectorAll('section.slide');
        slides.forEach((s, i) => s.classList.toggle('__render-active', i === idx));
      }, n - 1);
      await page.waitForTimeout(80);
      await page.screenshot({ path: fpath, clip: { x: 0, y: 0, width: renderW, height: renderH } });
      rendered.push({ index: n, label: info.label, path: fpath });
      console.log(`  ✓ slide ${String(n).padStart(2, '0')}: ${fname}`);
    } catch (e) {
      console.error(`  ✗ slide ${n} failed: ${e.message}`);
    }
  }

  if (args.contactSheet && rendered.length > 1) {
    // Compose contact sheet using a second headless page.
    const sheetPage = await ctx.newPage();
    const cols = Math.min(4, Math.ceil(Math.sqrt(rendered.length)));
    const rows = Math.ceil(rendered.length / cols);
    const tileW = 480, tileH = 270;
    const pad = 12;
    const sheetW = cols * tileW + (cols + 1) * pad;
    const sheetH = rows * (tileH + 28) + (rows + 1) * pad;
    // Embed each rendered PNG as a base64 data URI — local file:// images
    // don't load inside setContent's about:blank context.
    const tiles = rendered.map((r) => {
      const b64 = fs.readFileSync(r.path).toString('base64');
      return `<div class="tile"><img src="data:image/png;base64,${b64}"><div class="lbl">${r.index.toString().padStart(2,'0')} · ${r.label.replace(/</g, '&lt;')}</div></div>`;
    }).join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body { margin: 0; background: #1a1a1a; font: 12px/1.3 -apple-system, sans-serif; color: #e8e6e0; }
      .grid { display: grid; grid-template-columns: repeat(${cols}, ${tileW}px); gap: ${pad}px; padding: ${pad}px; }
      .tile { background: #000; }
      .tile img { width: ${tileW}px; height: ${tileH}px; display: block; object-fit: cover; }
      .lbl { padding: 6px 4px; color: #bdb9b0; font-family: ui-monospace, monospace; }
    </style></head><body><div class="grid">${tiles}</div></body></html>`;
    await sheetPage.setViewportSize({ width: sheetW, height: sheetH });
    await sheetPage.setContent(html, { waitUntil: 'networkidle' });
    const sheetPath = path.join(outDir, 'contact-sheet.png');
    await sheetPage.screenshot({ path: sheetPath, fullPage: true });
    console.log(`  ✓ contact sheet: ${sheetPath}`);
  }

  await browser.close();
  console.log(`Done. ${rendered.length} slide(s) rendered to ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
