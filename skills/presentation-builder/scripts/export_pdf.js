#!/usr/bin/env node
/*
 * export_pdf.js — render a generated deck.html to a paginated, text-selectable
 * PDF (one slide per page, at the deck's authored 1920x1080 canvas).
 *
 * This drives a headless Chromium with --print-to-pdf and relies on the
 * deck-stage component's built-in `@media print` rule, which lays every slide
 * out as its own page at the authored size. Because it uses the browser's
 * native print path (not screenshots), the resulting text stays selectable and
 * searchable — and it looks 1:1 with the on-screen deck.
 *
 * Usage:
 *   node export_pdf.js ./prezentacja/deck.html
 *   node export_pdf.js ./prezentacja/deck.html --out ./prezentacja/deck.pdf
 *
 * Chromium resolution order: system chromium/chrome, then the Chromium that
 * ships with the bundled Playwright (same logic as render_slides.js), so this
 * works even on machines without a system browser installed.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let i = 0; i < argv.slice(2).length; i += 1) {
    const a = argv.slice(2)[i];
    if (a === '--out') args.out = argv.slice(2)[++i];
    else if (a.startsWith('--out=')) args.out = a.split('=').slice(1).join('=');
    else if (a.startsWith('--')) { console.error(`Unknown option '${a}'.`); process.exit(2); }
    else positional.push(a);
  }
  args.deck = positional[0];
  return args;
}

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
  candidates.unshift(
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome'
  );
  return candidates.find((p) => p && fs.existsSync(p));
}

function fileUrl(p) {
  // Encode spaces and other URL-unsafe chars; keep slashes.
  return 'file://' + p.split('/').map(encodeURIComponent).join('/');
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.deck) {
    console.error('Usage: export_pdf.js <deck.html> [--out deck.pdf]');
    process.exit(2);
  }
  const deckPath = path.resolve(args.deck);
  if (!fs.existsSync(deckPath)) {
    console.error(`Deck not found: ${deckPath}`);
    process.exit(2);
  }
  const outPath = path.resolve(args.out || deckPath.replace(/\.html?$/i, '') + '.pdf');

  const chrome = findChromium();
  if (!chrome) {
    console.error('No Chromium/Chrome binary found. Install chromium, or run the ' +
      'overflow/render scripts once so Playwright downloads its bundled Chromium.');
    process.exit(1);
  }

  const profileDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'deck-pdf-'));
  const flags = [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--allow-file-access-from-files',
    '--no-pdf-header-footer',
    `--user-data-dir=${profileDir}`,
    `--print-to-pdf=${outPath}`,
    fileUrl(deckPath),
  ];

  const res = spawnSync(chrome, flags, { stdio: ['ignore', 'pipe', 'pipe'] });
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch (_) {}

  if (res.status !== 0 || !fs.existsSync(outPath)) {
    // Some Chromium builds reject --headless=new; retry with legacy --headless.
    const legacy = flags.map((f) => (f === '--headless=new' ? '--headless' : f));
    const profileDir2 = fs.mkdtempSync(path.join(require('os').tmpdir(), 'deck-pdf-'));
    legacy[legacy.findIndex((f) => f.startsWith('--user-data-dir'))] = `--user-data-dir=${profileDir2}`;
    const res2 = spawnSync(chrome, legacy, { stdio: ['ignore', 'pipe', 'pipe'] });
    try { fs.rmSync(profileDir2, { recursive: true, force: true }); } catch (_) {}
    if (res2.status !== 0 || !fs.existsSync(outPath)) {
      console.error('Chromium print-to-pdf failed.');
      if (res.stderr) console.error(res.stderr.toString().trim());
      if (res2.stderr) console.error(res2.stderr.toString().trim());
      process.exit(1);
    }
  }

  const bytes = fs.statSync(outPath).size;
  console.log(`✓ Wrote PDF (${(bytes / 1024 / 1024).toFixed(1)} MB, selectable text) → ${outPath}`);
  console.log(`  via ${chrome}`);
}

main();
