---
name: presentation-builder
description: Produce a polished, customizable HTML presentation deck plus matching teleprompter script from a topic, outline, paper, notes, or source material. Use when the user wants to build, draft, generate, write, redesign, or re-theme a presentation, slide deck, seminar, lecture, conference talk, lightning talk, thesis defence, journal-club talk, product keynote, launch talk, or speaker script. Chooses `seminar`, `university`, or `keynote`, writes source-driven `deck.yaml`, supports 25 slide patterns including `custom` layouts for photo groups, asymmetric evidence boards, mixed media, and one-off diagrams, then generates `deck.html` and `script.md`.
---

# Presentation Builder

You build a source-driven presentation package: **`deck.yaml` is the source of truth**, `deck.html` is the generated browser deck, and `script.md` is the generated/readable teleprompter script. The deck is the artifact; the script is the performance.

Treat this as one job, not two. The script is written from the same outline as the deck, in the same voice, in the same order. They ship together.

If you edit this skill's instructions or references, restart OpenCode before relying on the new behavior so the updated skill content is loaded.

## When to engage

Trigger on any request that resembles building slides, writing a talk, or preparing a presentation — including when the user is vague ("help me prepare for Friday's seminar"), when they hand you a paper or notes and ask for "slides", when they ask for just a speaker script for an existing deck, or when they want to redesign / re-theme an existing deck of this style.

Don't trigger for: requests to *review* slides without producing new ones, generic writing tasks unrelated to presenting, or non-slide visual design (posters, infographics, etc.).

## The workflow

The work happens in six phases. Do them in order. Don't skip the intake — bad inputs make bad decks.

### 1. Pick a template

Read `references/templates.md` to see the registry of available templates and what each one is good for. Match the user's brief against the listed strengths:

- If exactly one template is a clear fit, use it and tell the user which one and why in one sentence.
- If two or more could fit, ask the user to choose, briefly characterizing each option.
- If none clearly fits but one is close, propose it and offer to deviate from its default slide set.

The registry currently has three entries:
- **`seminar`** — generic academic style, fully customizable colors/fonts/density, no institutional branding.
- **`university`** — Politechnika Wrocławska (Wrocław University of Science and Technology) brand-locked template with bilingual EN/PL support and partner logos. Pick this if the user is a PWR student/staff or asks for "my university template", "Polish university", a bilingual deck, etc.
- **`keynote`** — dark/editorial product-keynote style with large titles, Instrument Serif emphasis, paper mode, accent presets, and strong visual rhythm. Pick this for launch talks, product narratives, and conference keynotes.

Write the chosen template into the output folder's `README.md` so it is obvious later.

### 2. Intake

Before drafting anything, you need four things. Ask for whatever is missing in a single batched question (use `AskUserQuestion`), not one at a time:

1. **Topic and angle.** What's the talk about, and what's the one thing the audience should walk away with? If they gave a paper/notes, read those first and propose the angle yourself for confirmation.
2. **Audience and duration.** Who's in the room? How long do they have to talk (and how long for Q&A)? Duration sets slide count — see `references/best-practices.md` for the rule of thumb.
3. **Source material.** Is there a paper, draft, repo, or set of notes you should base this on? Read it before drafting. If they only have a topic, that's fine — flag that you'll be writing more from general knowledge.
4. **Style preferences.** Light or dark? Accent color (or "pick one")? Density (compact / regular / spacious)? Title style (topic-style nouns or action-style sentences)? Font swap? Footer on or off? For university: language (`en`, `pl`, or bilingual) and partner/footer preferences. It's fine for the user to say "you pick" — make reasonable choices and note them.

If the user already gave most of this in their initial message, only ask for what's actually missing. Don't make them repeat themselves.

### 3. Plan the deck structure

Before authoring `deck.yaml`, write a slide-by-slide outline in plain text and show it to the user for sign-off. Each line: slide number, slide pattern (from the patterns catalog), one-sentence purpose.

The point of this step is to surface structural problems while they're cheap to fix. If you write 14 full slides and *then* the user says "actually I don't want a section on related work", you've wasted both of your time.

Read `references/best-practices.md` for guidance on narrative arc, pacing, and how to map duration to slide count. Read `references/slide-patterns.md` and `references/pattern-schema.md` to know which slide patterns are available and what fields each accepts. Use `pattern: custom` when the fixed catalog is close but too rigid, such as photo groups, asymmetric evidence boards, mixed media plus callouts, or one-off diagrams that should still inherit template chrome and typography. For diagrams plus cards, prefer the Elm-like custom layout (`layout.mode: elm`, nested `row`/`column`/`stack` blocks, `width: fill`, `height: fill`) before `freeform`; freeform is last-resort because absolute positioning is more likely to overlap.

Once the user signs off (or after a reasonable wait if they said "just go"), proceed.

### 4. Author `deck.yaml` and generate the deck

Create a new output folder (default: the user's current working directory, inside a subfolder named after the topic). Author `deck.yaml` in that folder. This YAML file owns:

- v1 deck metadata under `metadata` (`title`, optional `subtitle`, `speaker`, `date`, optional `footer`, and `language.default` / `language.available`);
- selected template and implemented theme knobs (`density`, `dark`, `footer`, `codeTheme`, `classes`, plus template-specific fields);
- localization values as `{en, pl}` objects where needed;
- the ordered `slides[]` array, with one pattern name and pattern-specific fields per slide;
- image/diagram sources via `image.src` or `images[].src` for `full-bleed`, `image-led`, `image-grid`, and `custom` blocks; local paths are resolved relative to `deck.yaml`, copied into the output folder, and passed to `<image-slot src="...">`;
- small layout/type tuning fields such as `contentScale`, `titleSize`, `bodySize`, and custom-block `scale`, `valueSize`, `padding`, `gap` when a slide needs final fitting without raw CSS;
- `slides[].script` text/cues for the speaker script;
- README notes such as template choice and customizations.

Use these references while authoring:
- `references/deck-yaml.md` — top-level schema, localized objects, examples.
- `references/pattern-schema.md` — per-pattern field contracts and capacity hints.
- `references/slide-patterns.md` — pattern intent, class contracts, capacity guidance.
- `references/customization.md` — theme knobs and renderer behavior.

Then run the generator from the installed skill path:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja
```

Use `--check` for structural validation when you want to verify the source without rewriting generated files:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja --check
```

The generator copies the chosen template support files and referenced local media assets, renders `deck.html`, emits `script.md`, and synchronizes generated details such as slide numbering, page totals, speaker-notes JSON, footer/header chrome, `data-label` values, and support assets. Do **not** hand-renumber slides or manually sync speaker notes as the default workflow; fix the source YAML and regenerate.

Manual HTML override is an escape hatch only after `pattern: custom` cannot express the layout or for a renderer bug. If you must patch generated `deck.html`, document the reason in `README.md`, keep the patch minimal, and prefer adding generator/schema support in a follow-up.

If the user asks for a PowerPoint/editable handoff, export after successful HTML generation:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/export_pptx.js ./prezentacja/deck.html --out ./prezentacja/deck.pptx
```

This default `editable` export maps rendered DOM text, simple boxes, and images to native PPTX objects. It is approximate by design; use `--mode=raster` when pixel fidelity matters more than moving individual elements.

If the user asks for a PDF, export after successful HTML generation:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/export_pdf.js ./prezentacja/deck.html --out ./prezentacja/deck.pdf
```

This drives headless Chromium's native `--print-to-pdf`, relying on the deck-stage `@media print` rule that paginates one slide per page at the authored 1920×1080 canvas. The output is 1:1 with the on-screen deck and the **text stays selectable/searchable** (vector, not screenshots). It resolves a Chromium binary from the system, falling back to the one bundled with Playwright, so it works without a separately installed browser. Prefer this over screenshot-stitched PDFs — only fall back to rastering slides if a renderer bug makes the print path drift from the screen render.

### 5. Verify generated `deck.html` and `script.md`

Open/read the generated artifacts, not just the YAML:

- Confirm `deck.html` contains the expected title, speaker, template chrome, body classes, and support-file links.
- Confirm `script.md` has one section per slide unless the user explicitly opted out of a script.
- Confirm the generated `README.md` records template, theme/language choices, generation command, and any manual override.

Do not print the full HTML or script into chat — link the user to the files.

### 6. Verify nothing overflows — REQUIRED

Each slide is a fixed `1920×1080` canvas with `overflow: hidden`. Content that doesn't fit isn't shrunk — it's silently clipped, and the user only sees the damage when they open the deck in a browser. To catch this before shipping, run the bundled overflow/chrome-overlap check against the generated HTML:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/check_overflow.js ./prezentacja/deck.html
```

- Exit `0` means every slide fits cleanly; the deck is shippable after visual review.
- Exit `1` means at least one slide has clipped content, content overlapping template chrome, sibling custom blocks overlapping each other, or a divider title/meta collision. The output names each offending slide, the relevant element, the collision type, and a snippet of its text.
- Pass `--screenshots=out/` to save PNGs of broken slides, and `--json` to get machine-readable output.

Fix overflows in `deck.yaml` first: apply compact density, split slides, reduce per-pattern item counts, shorten labels, or move dense content to an appendix. Regenerate, then re-run the check until it passes. Only use a manual HTML override for unsupported renderer behavior.

**Visual verification.** The overflow check confirms layout fits, not that it *reads* well. After substantive content changes — and at minimum before declaring the deck done — render a contact sheet and inspect it:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/render_slides.js ./prezentacja/deck.html --contact-sheet --width=960
```

Then use the `Read` tool on the resulting PNG(s). This catches awkward wraps, bad visual balance, tables that technically fit but do not read, or accent colors that clash.

## Output

Deliver, in the output folder:
- `deck.yaml` — source of truth for the deck and script.
- `deck.html` — generated browser deck.
- `script.md` — generated/readable speaker script, unless the user explicitly opted out.
- `README.md` — template used, customizations, language, generation command, verification commands, and any manual override.
- Optional `deck.pptx` — PowerPoint handoff when requested; editable mode is approximate, raster mode is faithful but not element-editable.
- Optional `deck.pdf` — PDF handoff when requested; vector/selectable text, 1:1 with the on-screen deck, one slide per page.
- Support files generated/copied by the renderer, typically `deck-stage.js`, `image-slot.js`, `tweaks-panel.jsx`.
- Local media referenced by `image.src` / `images[].src`, copied into the output folder and listed in `README.md`.
- For the `university` template: `assets/uni/` folder with all PWR logos and partner badges copied verbatim.

Tell the user where the files are and how to view them. The default viewing instruction is: open `deck.html` in a browser.

## Adding more templates later

When adding a new template, append an entry to `references/templates.md`, drop template shell/renderer assets into `assets/templates/<id>/`, and add any new pattern contracts to `references/pattern-schema.md` plus narrative guidance in `references/slide-patterns.md`. Restart OpenCode after skill changes.

## Reference files

- `references/templates.md` — registry of available templates and what each renderer/shell provides.
- `references/deck-yaml.md` — `deck.yaml` schema, localized objects, examples.
- `references/pattern-schema.md` — per-pattern field contracts and capacity hints.
- `references/best-practices.md` — narrative arc, slide count per duration, density, type hierarchy, what to avoid, non-English sizing, verification.
- `references/slide-patterns.md` — catalog of 25 slide patterns, intent, class contracts, and capacity hints.
- `references/customization.md` — theme knobs in `deck.yaml`, renderer body classes/CSS variables, brand and capacity guidance.
- `references/script-style.md` — how `slides[].script` maps to `script.md`; voice, transitions, pacing, examples.

## Scripts

- `scripts/generate_deck.js` — source-to-artifacts generator. Expected CLI: `node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja [--check]`.
- `scripts/check_overflow.js` — REQUIRED final-step layout verifier. Renders generated `deck.html` in headless Chromium and reports clipping plus chrome overlaps.
- `scripts/render_slides.js` — visual inspection. Renders specific slides or a contact sheet to PNG so the model can `Read` them.
- `scripts/export_pptx.js` — optional PowerPoint handoff. `--mode=editable` creates approximate native text boxes/shapes/images; `--mode=raster` creates faithful screenshot slides.
- `scripts/export_pdf.js` — optional PDF handoff via headless Chromium `--print-to-pdf`. One slide per page at the authored canvas, vector/selectable text, 1:1 with the screen render. `node scripts/export_pdf.js ./prezentacja/deck.html [--out deck.pdf]`.
