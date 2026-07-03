#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { loadDeck, DeckValidationError } = require("./lib/load-deck");
const { renderScript } = require("./lib/render-script");
const { renderReadme } = require("./lib/render-readme");
const { copyTemplateAssets } = require("./lib/copy-template-assets");

const DISPLAY_SCRIPTS_DIR = "/home/razuer/.config/opencode/skills/presentation-builder/scripts";

function usage() {
  return "Usage: node scripts/generate_deck.js deck.yaml --out ./prezentacja [--template seminar|university|keynote] [--check] [--normalized]";
}

function parseArgs(argv) {
  const args = { check: false, normalized: false };
  const positional = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--check") args.check = true;
    else if (arg === "--normalized") args.normalized = true;
    else if (arg === "--out") args.out = argv[++i];
    else if (arg === "--template") args.template = argv[++i];
    else if (arg.startsWith("--")) throw new Error(`Unknown option '${arg}'. ${usage()}`);
    else positional.push(arg);
  }
  if (positional.length !== 1) throw new Error(`Missing deck YAML path. ${usage()}`);
  if (!args.out) throw new Error(`Missing required --out directory. ${usage()}`);
  args.source = positional[0];
  return args;
}

function requireRenderer() {
  const rendererPath = path.join(__dirname, "lib", "render-html.js");
  if (!fs.existsSync(rendererPath)) {
    throw new Error(`HTML renderer is not installed yet: ${rendererPath}. Renderer worker must provide module export renderHtml(deck, options).`);
  }
  const renderer = require(rendererPath);
  if (!renderer || typeof renderer.renderHtml !== "function") throw new Error(`HTML renderer must export renderHtml(deck, options): ${rendererPath}`);
  return renderer.renderHtml;
}

function writeFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

function isExternalMediaSrc(src) {
  const value = String(src || "").trim();
  return !value || value.startsWith("#") || value.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function toPosixPath(filePath) {
  return filePath.split(path.sep).join("/");
}

function insideDirectory(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function safeMediaRel(absSource, used) {
  const ext = path.extname(absSource);
  const stem = (path.basename(absSource, ext).replace(/[^A-Za-z0-9._-]+/g, "-") || "image").replace(/^-+|-+$/g, "") || "image";
  let candidate = `assets/media/${stem}${ext}`;
  let index = 2;
  while (used.has(candidate)) {
    candidate = `assets/media/${stem}-${index}${ext}`;
    index += 1;
  }
  used.add(candidate);
  return candidate;
}

function copyReferencedMedia(deck, sourcePath, outDir) {
  const sourceDir = path.dirname(sourcePath);
  const copied = [];
  const used = new Set();
  const byAbs = new Map();

  function copyOne(src) {
    if (typeof src !== "string" || isExternalMediaSrc(src)) return src;
    const raw = src.trim();
    const absSource = path.isAbsolute(raw) ? raw : path.resolve(sourceDir, raw);
    if (!fs.existsSync(absSource)) throw new Error(`Referenced media file not found: ${src}`);
    if (!fs.statSync(absSource).isFile()) throw new Error(`Referenced media path is not a file: ${src}`);
    if (byAbs.has(absSource)) return byAbs.get(absSource);

    const normalized = path.normalize(raw);
    const canPreserveRelative = !path.isAbsolute(raw) && normalized !== ".." && !normalized.startsWith(`..${path.sep}`);
    let relOut = canPreserveRelative ? toPosixPath(normalized) : safeMediaRel(absSource, used);
    let dest = path.resolve(outDir, relOut);
    if (!insideDirectory(outDir, dest)) {
      relOut = safeMediaRel(absSource, used);
      dest = path.resolve(outDir, relOut);
    }

    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (path.resolve(absSource) !== path.resolve(dest)) fs.copyFileSync(absSource, dest);
    byAbs.set(absSource, relOut);
    copied.push({ from: absSource, to: relOut });
    return relOut;
  }

  function visit(value, keyName) {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i += 1) {
        if (keyName === "images" && typeof value[i] === "string") value[i] = { src: copyOne(value[i]) };
        else visit(value[i]);
      }
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "src") value[key] = copyOne(child);
      else if (key === "image" && typeof child === "string") value[key] = { src: copyOne(child) };
      else visit(child, key);
    }
  }

  for (const slide of deck.slides || []) visit(slide);
  return copied;
}

function build(argv = process.argv.slice(2)) {
  const started = Date.now();
  const args = parseArgs(argv);
  const sourcePath = path.resolve(args.source);
  const outDir = path.resolve(args.out);
  const deck = loadDeck(sourcePath, { template: args.template });
  if (args.check) {
    console.log(`✓ Structural validation passed for ${sourcePath} (${deck.slideCount} slides, template: ${deck.template})`);
    return { deck, checked: true };
  }

  const renderHtml = requireRenderer();
  fs.mkdirSync(outDir, { recursive: true });
  copyTemplateAssets(deck.template, outDir);
  const mediaAssets = copyReferencedMedia(deck, sourcePath, outDir);
  fs.copyFileSync(sourcePath, path.join(outDir, "deck.yaml"));
  writeFile(path.join(outDir, "deck.normalized.json"), `${JSON.stringify(deck, null, 2)}\n`);

  const html = renderHtml(deck, { outDir, sourcePath });
  if (typeof html !== "string" || !html.trim()) throw new Error("renderHtml(deck, options) returned empty/non-string HTML.");
  const script = renderScript(deck);
  const elapsedMs = Date.now() - started;
  const readme = renderReadme(deck, {
    sourceFile: "deck.yaml",
    scriptsDir: DISPLAY_SCRIPTS_DIR,
    wordCount: script.wordCount,
    mediaAssets,
    buildSummary: `Structural validation passed; generated in ${elapsedMs} ms.`,
  });

  writeFile(path.join(outDir, "deck.html"), html);
  writeFile(path.join(outDir, "script.md"), script.markdown);
  writeFile(path.join(outDir, "README.md"), readme);
  console.log(`✓ Generated ${deck.slideCount} slides in ${outDir}`);
  return { deck, outDir };
}

if (require.main === module) {
  try {
    build();
  } catch (error) {
    if (error instanceof DeckValidationError) console.error(error.message);
    else console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { build, parseArgs };
