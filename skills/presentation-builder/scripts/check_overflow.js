#!/usr/bin/env node
/**
 * check_overflow.js — verify no element overflows its slide.
 *
 * Renders the deck in headless Chromium at 1920×1080 and, for every
 * <section class="slide">, walks all descendants and flags any whose
 * bounding rect extends past the slide bounds (which would be clipped
 * by `overflow: hidden`).
 *
 * Usage:
 *   node check_overflow.js path/to/deck.html
 *   node check_overflow.js path/to/deck.html --screenshots=out/
 *   node check_overflow.js path/to/deck.html --json
 *
 * Exits 0 if clean, 1 if any overflow is detected (so it can gate CI / a
 * pre-commit hook). Reports the offending slide number, label, and the
 * outermost element that overflows (children of overflowing elements are
 * suppressed to keep output focused).
 */

const path = require('path');
const fs = require('fs');

function parseArgs(argv) {
  const args = { deck: null, screenshots: null, json: false };
  for (const a of argv.slice(2)) {
    if (a === '--json') args.json = true;
    else if (a.startsWith('--screenshots=')) args.screenshots = a.split('=', 2)[1];
    else if (!args.deck) args.deck = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.deck) {
    console.error('Usage: check_overflow.js <deck.html> [--screenshots=dir] [--json]');
    process.exit(2);
  }
  const deckPath = path.resolve(args.deck);
  if (!fs.existsSync(deckPath)) {
    console.error(`Deck not found: ${deckPath}`);
    process.exit(2);
  }

  const { chromium } = require(path.join(__dirname, 'node_modules', 'playwright'));
  // Prefer system / cached chromium. Playwright's bundled chrome-headless-shell
  // is frequently mismatched against the installed library version, so we
  // search the well-known cache + system paths and use whichever exists.
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
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const page = await ctx.newPage();
  await page.goto('file://' + deckPath, { waitUntil: 'networkidle' });

  // Wait for fonts to settle — overflow depends on glyph metrics.
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.waitForTimeout(200);

  // deck-stage hides every slide except the current one with
  // `visibility: hidden` and stacks them in place. Inject a stylesheet
  // that forces all slides visible and arranges them in a column so each
  // one has a proper bounding rect we can measure.
  await page.addStyleTag({ content: `
    section.slide { visibility: visible !important; }
    deck-stage::part(track) { transform: none !important; }
  ` });
  // Also explicitly walk slides and clear inline visibility / transform
  // that the web component sets on its shadow children.
  await page.evaluate(() => {
    document.querySelectorAll('section.slide').forEach((s) => {
      s.style.visibility = 'visible';
    });
  });
  await page.waitForTimeout(100);

  const report = await page.evaluate(() => {
    const TOL = 1.5; // px tolerance — subpixel rendering can produce ~1px noise

    // Chrome (header/footer/cover/QA/bleed) is absolute-positioned and
    // sits OVER the slide's content area. Content that grows downward
    // (long captions, oversized lists) can collide with the footer
    // without exceeding the slide's outer 1920×1080 bounds, so we need
    // a second check: does any non-chrome element overlap any chrome
    // element's rect?
    const CHROME_SELECTORS = [
      '.slide-header', '.slide-footer',          // seminar chrome
      '.cover-top', '.cover-bottom', '.cover-strip', // cover chrome
      '.qa-bottom',                              // QA closer
      '.bleed-chrome', '.bleed-cred',            // full-bleed chrome
      '.rail', '.footer',                        // university chrome
    ];

    function isVisible(el) {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    }

    // True when an element renders visible text glyphs or media of its
    // own — as opposed to being a pure layout container whose bounding
    // rect is incidental. Used to suppress false-positive chrome
    // overlaps where a flex/grid container's box happens to touch a
    // chrome rect even though no visible content goes there.
    function elementHoldsVisibleText(el) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'img' || tag === 'svg' || tag === 'canvas' || tag === 'video') return true;
      // Element renders text directly (text nodes as direct children).
      for (const node of el.childNodes) {
        if (node.nodeType === 3 && node.textContent.trim().length > 0) return true;
      }
      // Leaf element with text content.
      if (el.children.length === 0 && (el.textContent || '').trim().length > 0) return true;
      return false;
    }

    function elementHasOwnVisiblePaint(el) {
      if (elementHoldsVisibleText(el)) return true;
      const s = getComputedStyle(el);
      if (s.boxShadow && s.boxShadow !== 'none') return true;
      return ['Top', 'Right', 'Bottom', 'Left'].some((side) => {
        const width = parseFloat(s[`border${side}Width`] || '0');
        const style = s[`border${side}Style`];
        return width > 0 && style && style !== 'none' && style !== 'hidden';
      });
    }

    function elementPaintsOverlap(el, r, ovl) {
      const s = getComputedStyle(el);
      if (s.boxShadow && s.boxShadow !== 'none') return true;
      const edgeTol = 3;
      const borderVisible = (side) => {
        const width = parseFloat(s[`border${side}Width`] || '0');
        const style = s[`border${side}Style`];
        return width > 0 && style && style !== 'none' && style !== 'hidden';
      };
      return (borderVisible('Top') && ovl.top <= r.top + edgeTol)
        || (borderVisible('Bottom') && ovl.bottom >= r.bottom - edgeTol)
        || (borderVisible('Left') && ovl.left <= r.left + edgeTol)
        || (borderVisible('Right') && ovl.right >= r.right - edgeTol);
    }

    // Returns the overlap rect between two rects, or null if they don't
    // overlap. Used to filter out line-box false positives — text
    // bounding rects include line-height padding that doesn't visually
    // collide.
    function overlapRect(a, b) {
      const left = Math.max(a.left, b.left);
      const right = Math.min(a.right, b.right);
      const top = Math.max(a.top, b.top);
      const bottom = Math.min(a.bottom, b.bottom);
      if (right <= left || bottom <= top) return null;
      return { left, right, top, bottom, width: right - left, height: bottom - top };
    }

    function rectInfo(r, sr) {
      return {
        top: +(r.top - sr.top).toFixed(1),
        left: +(r.left - sr.left).toFixed(1),
        right: +(r.right - sr.left).toFixed(1),
        bottom: +(r.bottom - sr.top).toFixed(1),
      };
    }

    const slides = Array.from(document.querySelectorAll('section.slide'));
    const out = [];
    slides.forEach((slide, idx) => {
      const sr = slide.getBoundingClientRect();

      // Find chrome elements within this slide.
      const chromeEls = [];
      const chromeSet = new Set();
      CHROME_SELECTORS.forEach((sel) => {
        slide.querySelectorAll(sel).forEach((c) => {
          if (!isVisible(c)) return;
          chromeEls.push({ el: c, rect: c.getBoundingClientRect(), sel });
          chromeSet.add(c);
        });
      });

      function inChrome(el) {
        for (const { el: c } of chromeEls) {
          if (c === el || c.contains(el)) return true;
        }
        return false;
      }

      const all = slide.querySelectorAll('*');
      const overflowing = new Set();     // out of slide bounds
      const overlapping = new Map();     // el → array of {chromeSel, chromeRect}

      all.forEach((el) => {
        if (!isVisible(el)) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;

        // 1) Outside slide bounds (clipped by slide's overflow:hidden).
        const overR = r.right - sr.right;
        const overB = r.bottom - sr.bottom;
        const overL = sr.left - r.left;
        const overT = sr.top - r.top;
        if (overR > TOL || overB > TOL || overL > TOL || overT > TOL) {
          overflowing.add(el);
        }

        // 2) Overlaps slide chrome (content colliding with header/footer).
        //    Two filters to suppress false positives:
        //    a) The element must have its own visible text/media or paint
        //       such as a border/box-shadow. Pure layout containers can
        //       touch chrome by coincidence without visible collision.
        //    b) Text overlap must be more than a single line-box's worth
        //       of typographic slack (≈12px). Text rects include
        //       line-height padding above/below the glyphs.
        const holdsText = elementHoldsVisibleText(el);
        const hasOwnPaint = elementHasOwnVisiblePaint(el);
        if (!inChrome(el) && hasOwnPaint) {
          for (const ch of chromeEls) {
            const ovl = overlapRect(r, ch.rect);
            if (!ovl) continue;
            const chromeH = ch.rect.bottom - ch.rect.top;
            const chromeW = ch.rect.right - ch.rect.left;
            const textTrigger =
              holdsText && ovl.height >= 12 && (
                (chromeH > 0 && ovl.height / chromeH > 0.4) ||
                (chromeW > 0 && ovl.width / chromeW > 0.6)
              );
            const paintedBoxTrigger = !holdsText && elementPaintsOverlap(el, r, ovl) && ovl.height >= 4 && ovl.width >= 8;
            const trigger = textTrigger || paintedBoxTrigger;
            if (trigger) {
              if (!overlapping.has(el)) overlapping.set(el, []);
              overlapping.get(el).push({
                sel: ch.sel,
                chromeRect: ch.rect,
                overlapH: +ovl.height.toFixed(1),
                overlapW: +ovl.width.toFixed(1),
              });
            }
          }
        }
      });

      // Dedupe overflowing: only outermost element.
      const overflowingTop = [];
      overflowing.forEach((el) => {
        let anc = el.parentElement;
        let suppress = false;
        while (anc && anc !== slide) {
          if (overflowing.has(anc)) { suppress = true; break; }
          anc = anc.parentElement;
        }
        if (!suppress) overflowingTop.push(el);
      });

      // Dedupe overlapping: ALWAYS report the deepest (leaf-most) element
      // for chrome collisions. A parent container's box may intersect the
      // footer rect even when the actual visible/text descendant is
      // somewhere else inside it — flagging just the parent hides which
      // content is the problem, while the leaf points at exactly what
      // text wraps into chrome.
      const overlappingDeep = [];
      overlapping.forEach((_, el) => {
        let hasDescendantOverlapping = false;
        for (const other of overlapping.keys()) {
          if (other !== el && el.contains(other)) { hasDescendantOverlapping = true; break; }
        }
        if (!hasDescendantOverlapping) overlappingDeep.push(el);
      });

      const overflows = [];
      overflowingTop.forEach((el) => {
        const r = el.getBoundingClientRect();
        const ri = rectInfo(r, sr);
        overflows.push({
          kind: 'clipped',
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 80),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
          ...ri,
          overRight:  +(r.right - sr.right).toFixed(1),
          overBottom: +(r.bottom - sr.bottom).toFixed(1),
          overLeft:   +(sr.left - r.left).toFixed(1),
          overTop:    +(sr.top - r.top).toFixed(1),
        });
      });
      overlappingDeep.forEach((el) => {
        const r = el.getBoundingClientRect();
        const ri = rectInfo(r, sr);
        const hits = overlapping.get(el);
        const maxH = Math.max(...hits.map((h) => h.overlapH));
        overflows.push({
          kind: 'overlaps-chrome',
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 80),
          text: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
          chromeHits: [...new Set(hits.map((h) => h.sel))],
          overlapH: +maxH.toFixed(1),
          ...ri,
        });
      });

      if (overflows.length) {
        out.push({
          index: idx + 1,
          label: slide.getAttribute('data-label') || `Slide ${idx + 1}`,
          slideRect: { width: +sr.width.toFixed(1), height: +sr.height.toFixed(1) },
          overflows,
        });
      }
    });
    return out;
  });

  // Optional screenshots of offending slides.
  if (args.screenshots && report.length) {
    fs.mkdirSync(args.screenshots, { recursive: true });
    for (const item of report) {
      const handle = await page.locator(`section.slide:nth-of-type(${item.index})`).first();
      const fname = path.join(args.screenshots, `slide-${String(item.index).padStart(2, '0')}-overflow.png`);
      try {
        await handle.screenshot({ path: fname });
        item.screenshot = fname;
      } catch (e) {
        item.screenshotError = String(e);
      }
    }
  }

  await browser.close();

  if (args.json) {
    process.stdout.write(JSON.stringify({ ok: report.length === 0, issues: report }, null, 2) + '\n');
    process.exit(report.length === 0 ? 0 : 1);
  }

  if (report.length === 0) {
    console.log('✓ Overflow check passed — all slides fit within 1920×1080.');
    process.exit(0);
  }

  const clippedCount = report.reduce((n, it) => n + it.overflows.filter((o) => o.kind === 'clipped').length, 0);
  const overlapCount = report.reduce((n, it) => n + it.overflows.filter((o) => o.kind === 'overlaps-chrome').length, 0);
  console.log(`✗ Overflow check FAILED — ${report.length} slide(s) with issues (${clippedCount} clipped past slide bounds, ${overlapCount} overlapping chrome).\n`);
  for (const item of report) {
    console.log(`──  Slide ${item.index}: ${item.label}  ` + '─'.repeat(Math.max(0, 60 - String(item.label).length)));
    for (const o of item.overflows) {
      if (o.kind === 'clipped') {
        const dirs = [];
        if (o.overRight  > 1.5) dirs.push(`right +${o.overRight}px`);
        if (o.overBottom > 1.5) dirs.push(`bottom +${o.overBottom}px`);
        if (o.overLeft   > 1.5) dirs.push(`left +${o.overLeft}px`);
        if (o.overTop    > 1.5) dirs.push(`top +${o.overTop}px`);
        console.log(`    [CLIPPED] <${o.tag}${o.cls ? ' class="' + o.cls + '"' : ''}>`);
        console.log(`      past slide bounds: ${dirs.join(', ')}`);
      } else {
        console.log(`    [OVERLAPS CHROME ${o.chromeHits.join(', ')}] <${o.tag}${o.cls ? ' class="' + o.cls + '"' : ''}>`);
        console.log(`      collision: ${o.overlapH}px of vertical overlap (rect top=${o.top}, bottom=${o.bottom})`);
      }
      if (o.text) console.log(`      "${o.text}${o.text.length === 100 ? '…' : ''}"`);
    }
    if (item.screenshot) console.log(`    screenshot: ${item.screenshot}`);
    console.log();
  }
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(2); });
