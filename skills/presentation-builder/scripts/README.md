# Skill scripts

Helper scripts for the `presentation-builder` skill. Run from anywhere; pass source/output paths explicitly. The expected installed path is `/home/razuer/.config/opencode/skills/presentation-builder/scripts/`.

## `generate_deck.js` — deck.yaml compiler

Parses and validates `deck.yaml`, then generates the synchronized presentation package. `deck.yaml` is the source of truth; do not hand-edit generated `deck.html` as the normal workflow.

```bash
# Structural validation only; exits nonzero on schema/source errors
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja --check

# Full generation
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja
```

Generated outputs include `deck.html`, `script.md`, `README.md`, copied runtime assets, template assets such as `assets/uni/*.png`, and the source `deck.yaml`. Structural validation checks required metadata, duplicate slide IDs, known patterns, notes/script coverage, capacity hints, table alignment metadata, custom layout block shape, image slot IDs, theme values, and university language metadata. Full layout validation still belongs to `check_overflow.js` and `render_slides.js` after generation.

## `test_structure.js` — deterministic regression

Runs non-Playwright fixture checks. It always validates fixture schemas and `--check`; when the HTML renderer is present it also generates each fixture into a temp directory and asserts required output files, speaker notes count, page counters, placeholder cleanup, and university asset copying.

```bash
npm test
```

## `check_overflow.js` — REQUIRED final check

Verifies every slide in a generated deck fits within its `1920×1080` canvas **and** that no content collides with the slide chrome (header / footer / cover strips / Q&A bottom rail). Renders the deck in headless Chromium, force-shows all slides (deck-stage hides non-current slides with `visibility: hidden`), and walks every descendant of every `<section class="slide">`.

Two failure modes are reported separately:

- **`[CLIPPED]`** — element's bounding rect extends past the 1920×1080 slide boundary. The slide has `overflow: hidden`, so this content is invisibly cropped.
- **`[OVERLAPS CHROME …]`** — element's visible text or media collides with the absolute-positioned chrome (e.g. a caption that wraps onto two lines and lands on the footer). The chrome rectangles are: `.slide-header`, `.slide-footer`, `.cover-top`, `.cover-bottom`, `.cover-strip`, `.qa-bottom`, `.bleed-chrome`, `.bleed-cred`, plus `.rail` and `.footer` for the university template.

The chrome-collision check filters out false positives: only elements that actually render text directly (leaf elements with text, or elements with text-node children) are considered, and the overlap must exceed both ~12px of vertical reach and ~40% of the chrome's height. Line-box padding around glyphs does not trigger.

```bash
# Basic check — exit 0 = clean, exit 1 = at least one slide overflows
node check_overflow.js path/to/deck.html

# Save PNG screenshots of offending slides for visual inspection
node check_overflow.js path/to/deck.html --screenshots=./overflow-shots/

# Machine-readable output (for CI / piping into other tools)
node check_overflow.js path/to/deck.html --json
```

Installed-path example:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/check_overflow.js ./prezentacja/deck.html
```

### What the output looks like

```
✗ Overflow check FAILED — 2 slide(s) have clipped content.

──  Slide 14: 14 Twarde realia  ────────────────────────────────────────────
    <ul class="limits">
      bottom +77.9px
      "! Eclipse 2023: logika sterowania była częstszym workloadem edge…"

──  Slide 17: 17 Bibliografia  ─────────────────────────────────────────────
    <ol class="refs">
      bottom +144.1px
      "[1] Parlament Europejski…"
```

Each entry names the slide, the outermost element that overflows (children of overflowing parents are suppressed), the direction(s) and pixel amount of overflow, and a snippet of the visible text so you can locate it in the HTML.

### How to fix overflows

In order of preference — keep the user's content; reach for trimming only when structural levers fail:

1. **`body.compact`** — drops vertical padding from 110px → 70px (~80px/slide). Especially useful for Polish/Czech/Hungarian etc.
2. **Split the slide in `deck.yaml`** — refs into 2 parts, long bullets into a chapter split. Regenerate so page numbers and speaker notes stay synchronized.
3. **Use a renderer-supported tight variant** in `deck.yaml` if the pattern supports one.
4. **Manual CSS/HTML override** only for unsupported renderer behavior; document it in `README.md`.
5. **Trim content** as a last resort, only with user agreement.

Re-run the check after each fix until exit code 0.

## `render_slides.js` — visual inspection

Renders one, many, or all slides as PNGs for visual review. Useful when the model needs to "see" what it just generated — typography, balance, color, whether the content actually reads the way the layout suggests it does. Like `check_overflow.js`, this bypasses deck-stage's navigation: it moves slides directly into `<body>` and toggles which one is visible per shot.

```bash
# Render ALL slides at full 1920×1080 into ./slide-shots/ next to the deck
node render_slides.js path/to/deck.html

# Just specific slides
node render_slides.js path/to/deck.html --slides=3,14,17

# Range
node render_slides.js path/to/deck.html --range=1-5

# Half-resolution thumbnails for quick scanning (960×540)
node render_slides.js path/to/deck.html --width=960

# Also produce a contact-sheet grid showing every slide at a glance
node render_slides.js path/to/deck.html --contact-sheet

# Custom output directory
node render_slides.js path/to/deck.html --out=/tmp/shots/
```

Installed-path contact-sheet example:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/render_slides.js ./prezentacja/deck.html --contact-sheet --width=960
```

Output filenames include the index and a sanitized version of the slide's `data-label`, e.g. `slide-06-06-Macierz-dojrza-o-ci.png`.

**When the model should run this:**
- After every meaningful content change, to confirm the slide actually looks the way you intended.
- After fixing overflows, as a second pair of eyes — the overflow check verifies layout, but render_slides verifies *readability*.
- Before declaring the deck done, run with `--contact-sheet --width=960` to scan all slides in one screenshot.

Pair it with `Read` of the resulting PNGs to actually see the output. Don't run it speculatively across the whole deck on every micro-edit — it's ~0.5s per slide.

## `export_pptx.js` — PowerPoint handoff

Exports a generated `deck.html` to `.pptx` for users who need to continue work in PowerPoint, Keynote, LibreOffice, or Google Slides.

```bash
# Approximate editable export: native text boxes, rectangles, and images
node export_pptx.js path/to/deck.html --out path/to/deck.pptx

# Faithful fallback: one rendered PNG per slide, not element-editable
node export_pptx.js path/to/deck.html --out path/to/deck-raster.pptx --mode=raster

# Export a subset
node export_pptx.js path/to/deck.html --out path/to/selected.pptx --slides=1,3,8
node export_pptx.js path/to/deck.html --out path/to/section.pptx --range=4-9
```

Use `--mode=editable` by default. It reads the rendered DOM with Playwright and maps visible text, simple background/border boxes, `<img>`, and `<image-slot src="...">` elements into native PPTX objects. This is a handoff format, not a pixel-perfect renderer: CSS grid/flex, web fonts, shadows, clipping, masks, and complex browser layout can differ. If visual fidelity matters more than editability, use `--mode=raster`.

## Setup

Playwright is bundled in `scripts/node_modules/` (run `npm install` here if missing). The script auto-detects a usable Chromium binary in this order:

1. `~/.cache/ms-playwright/chromium-*/chrome-linux/chrome`
2. `/usr/bin/chromium`, `/usr/bin/chromium-browser`, `/usr/bin/google-chrome`

If none exists, install: `npx playwright install chromium`.

## Focused test/validation commands

For a generated deck package:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja --check
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/check_overflow.js ./prezentacja/deck.html
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/render_slides.js ./prezentacja/deck.html --contact-sheet --width=960
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/export_pptx.js ./prezentacja/deck.html --out ./prezentacja/deck.pptx
```

Use the first command for structural source validation, the second for Playwright/Chromium layout and chrome-overlap validation, the third for human/model visual review of rendered slides, and the fourth only when the user wants a PowerPoint handoff.

## Adding new scripts

When adding a new helper here, document it in this README with: purpose, CLI signature, exit codes, and an example run.
