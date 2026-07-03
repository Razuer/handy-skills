# Template registry

Each entry below is one template available to this skill. To pick a template, match the user's brief against the "best for" line and the strengths/weaknesses.

`deck.yaml` is the authoring surface. Templates are renderer/shell targets selected by `template: <id>`; the generator expands YAML fields into `deck.html`, `script.md`, `README.md`, and support files. Do not hand-edit template HTML as the default workflow.

When adding a new template:
1. Drop its renderer shell and support files into `assets/templates/<id>/` (and any image/logo dependencies in a nested folder).
2. Append a new section here following the format below.
3. If the template introduces slide patterns that don't already exist, add their source fields to `pattern-schema.md` and guidance to `slide-patterns.md`.

---

## seminar

- **ID:** `seminar`
- **Folder:** `assets/templates/seminar/`
- **Renderer/shell:** seminar HTML shell rendered from `deck.yaml`; not the default file to edit by hand.
- **Generated/support files:** `deck.html`, `script.md`, `README.md`, `deck-stage.js`, `image-slot.js`, `tweaks-panel.jsx`; optional `deck.pptx` via `scripts/export_pptx.js`
- **Asset dependencies:** none — fully self-contained, only Google Fonts over the network.
- **Aspect / resolution:** 1920 × 1080 (16:9)
- **Default deck length:** 25+ slides, depending on whether a custom evidence/layout slide is useful.
- **Default fonts:** IBM Plex Sans (display + body), IBM Plex Mono (chrome/labels). Plex Serif available for italic math variables.
- **Default palette:** off-white background `#fafaf7`, near-black foreground `#1a1a1a`, slate-blue accent `#2a5d8a`. Dark mode swaps to `#111111` / `#f3f1eb`.

**Best for**
- Academic seminars, thesis defences, conference talks, journal-club presentations, workshop walkthroughs, lab meetings.
- Anything where text density is moderate and credibility matters more than spectacle.
- Talks with a clear narrative arc: background → method → results → discussion → next steps.
- When the speaker is **not** representing a specific institution that mandates a brand.

**Strengths**
- Serious editorial typography; reads like a research paper, not a sales pitch.
- Rich primitives for the slide types academics actually need: definition card, numbered/bulleted lists, pull-quote, full-bleed photo intro, pipeline/process diagram, 2- and 3-column comparison, equation showcase, syntax-highlighted code, big-number stat, bar chart, data table with delta highlighting, image-led layout, 6-tile image grid, custom layout grid/gallery/card/metric blocks, numbered contributions cards, paired limitation-with-mitigation list, timeline, two-column references list, acknowledgements, formal Q&A closer, dark appendix divider.
- Built-in v1 theme tokens: `dark`, three density variants (`compact`/regular/`spacious`), action-style vs topic-style titles, footer toggle, light vs dark code blocks, customizable accent color, and implemented font pairs.

**Weaknesses / when not to pick**
- Not designed for product/marketing decks — feels too dry for sales.
- Not built for very short (≤5 min) talks; the chrome and structural slides assume 15–60 min.
- No animation. If the user wants kinetic typography or build-ins, this template won't deliver.
- No institutional branding — pick `university` if the user needs PWR (Wrocław Tech) chrome.

**Available slide patterns** (see `slide-patterns.md` for intent and `pattern-schema.md` for fields)
`cover`, `agenda`, `section-divider`, `definition`, `bullets`, `quote`, `full-bleed`, `pipeline`, `comparison`, `comparison-3col`, `equation`, `code`, `big-number`, `bar-chart`, `table`, `image-led`, `image-grid`, `custom`, `contributions`, `limitations`, `timeline`, `acknowledgements`, `references`, `qa`, `appendix-divider`.

**Built-in customization knobs** (set in `deck.yaml`, rendered as body classes/CSS variables; see `customization.md`)
- `theme.dark: true|false`
- `theme.density: compact|regular|spacious`
- `theme.titleStyle: action|topic`
- `theme.footer: true|false`
- `theme.codeTheme: dark|light`
- `theme.accent`, `theme.fontPair: plex|grotesk|dm|serif`, `theme.classes`

---

## university

- **ID:** `university`
- **Folder:** `assets/templates/university/`
- **Renderer/shell:** university HTML shell rendered from `deck.yaml`; not the default file to edit by hand.
- **Generated/support files:** `deck.html`, `script.md`, `README.md`, `deck-stage.js`, `image-slot.js`, `tweaks-panel.jsx`, `assets/uni/*.png`; optional `deck.pptx` via `scripts/export_pptx.js`
- **Asset dependencies:** `assets/uni/*.png` — official PWR (Politechnika Wrocławska / Wrocław University of Science and Technology) logos and partner marks. **These must be copied alongside the HTML** for the deck to render correctly. Filenames the HTML expects:
  - `pwr-en-horiz.png`, `pwr-pl-horiz.png` — horizontal lockups (cover, English/Polish)
  - `pwr-en-horiz-white.png`, `pwr-pl-horiz-white.png` — horizontal lockups on red rail (white versions, all non-cover slides)
  - `pwr-en-vert.png`, `pwr-pl-vert.png`, `pwr-en-vert-white.png`, `pwr-pl-vert-white.png` — vertical eagle marks for cover panel
  - `hr-excellence.png`, `unite.png`, `iep-evaluated.png` — partner badges on cover footer strip
- **Aspect / resolution:** 1920 × 1080 (16:9)
- **Default deck length:** 25+ slides (mirrors seminar, with optional custom layout slides)
- **Default fonts:** Trebuchet MS (official PWR font) with Source Sans 3 web fallback; JetBrains Mono for code/chrome; Source Serif 4 for italic math.
- **Default palette:** PWR red `#9A342D` (Pantone 484) on cream `#F1D1A2` (Pantone 156) — these are **brand-mandated** and should not be overridden. Black ink on white. Dark mode inverts to deep brown background with cream ink.

**Best for**
- Any presentation given as a Politechnika Wrocławska / Wrocław University of Science and Technology affiliate (student, PhD candidate, faculty).
- Thesis defences, MSc/PhD seminars, project reviews, conference talks where institutional affiliation should be visible on every slide.
- **Bilingual EN/PL talks** — localized text is declared with `{en, pl}` objects and `metadata.language.available: [en, pl]`; generated HTML wraps translatable strings for the template language mechanism.

**Strengths**
- Locked, audit-able brand. Top red rail with white horizontal lockup, footer with partner logos (HR Excellence, Unite!, IEP), red-paneled cover with vertical eagle.
- Same pattern catalog as seminar, with PWR-styled chrome on every slide, including custom layout bodies.
- First-class i18n: write content twice (EN + PL) under localized objects; the default locale is selected by `metadata.language.default` and rendered as `body.lang-en` / `body.lang-pl`.

**Weaknesses / when not to pick**
- Only appropriate for PWR-affiliated speakers. Using PWR chrome without affiliation is brand misuse.
- The brand palette dominates — if the user wants a custom color scheme, `seminar` is the better base.
- The cover slide layout is hard-coded around the eagle logo and red panel; can't be substantially restructured without breaking the brand.

**Available slide patterns** (see `slide-patterns.md` for intent and `pattern-schema.md` for fields)
Same catalog as seminar, but with PWR chrome: `cover`, `agenda`, `section-divider`, `definition`, `bullets`, `quote`, `full-bleed`, `pipeline`, `comparison`, `comparison-3col`, `equation`, `code`, `big-number`, `bar-chart`, `table`, `image-led`, `image-grid`, `custom`, `contributions`, `limitations`, `timeline`, `acknowledgements`, `references`, `qa`, `appendix-divider`.

**Built-in customization knobs** (set in `deck.yaml`, rendered as body classes/CSS variables; see `customization.md`)
- `metadata.language.default: en|pl`, `metadata.language.available: [en, pl]`, and localized objects for translatable text
- `theme.dark: true|false`
- `theme.density: compact|regular|spacious`
- `theme.footer: true|false`, `theme.partners` or `theme.showPartners`
- `theme.codeTheme: dark|light`
- `theme.bullets: diamond|square|dash`
- Brand tokens are locked: use `theme.red` / `theme.pwrRed` only when the user explicitly invokes a brand exception.

---

## keynote

- **ID:** `keynote`
- **Folder:** `assets/templates/keynote/`
- **Renderer/shell:** generated from the preserved source file `keynote-template.html`; generator materializes the shell at build time.
- **Generated/support files:** `deck.html`, `script.md`, `README.md`, `deck-stage.js`, `image-slot.js`, `tweaks-panel.jsx`; optional `deck.pptx` via `scripts/export_pptx.js`
- **Asset dependencies:** none in the current HTML; if future images/fonts are added, keep relative paths under `assets/templates/keynote/assets/`.
- **Aspect / resolution:** 1920 × 1080 (16:9)
- **Default deck length:** 23 slides in the original source template.
- **Default fonts:** Geist + Geist Mono, with Instrument Serif for italic editorial emphasis.
- **Default palette:** warm black background, cream foreground, coral accent `#ff5836`; optional paper/light mode.

**Best for**
- Product keynotes, conference talks, launches, narrative talks, and visually stronger presentations where the tone should feel editorial rather than academic.
- Talks that benefit from large titles, serif emphasis, dramatic dividers, and a polished dark/paper aesthetic.

**Strengths**
- Strong keynote-style visual identity with large editorial typography.
- Built-in dark and paper modes, accent color presets, density variants, footer toggle, and italic emphasis toggle.
- Supports the shared generator catalog: cover, agenda, dividers, definition, bullets, quote, full-bleed image, pipeline, comparison, equation, code, headline stat, chart, table, image layouts, custom layouts, claims, limitations, timeline, references, Q&A.

**Weaknesses / when not to pick**
- Less conservative than `seminar`; not ideal for dense academic material or formal institutional decks.
- Uses online Google Fonts unless fonts are cached or swapped manually.
- No institutional branding; choose `university` for PWR-branded decks.

**Available slide patterns**
`cover`, `agenda`, `section-divider`, `definition`, `bullets`, `quote`, `full-bleed`, `pipeline`, `comparison`, `comparison-3col`, `equation`, `code`, `big-number`, `bar-chart`, `table`, `image-led`, `image-grid`, `custom`, `contributions`, `limitations`, `timeline`, `acknowledgements`, `references`, `qa`, `appendix-divider`.

**Built-in customization knobs**
- `theme.accent`
- `theme.paper: true|false` or `theme.dark: false` for paper/light mode
- `theme.density: compact|regular|spacious`
- `theme.footer: true|false`
- `theme.italics: true|false`

---

## Choosing between them

| User cue                                                          | Pick         |
|-------------------------------------------------------------------|--------------|
| Mentions PWR, Politechnika Wrocławska, Wrocław Tech, W11/C-16, "my university", a Polish university context | `university` |
| Needs Polish/English bilingual deck                               | `university` |
| Product keynote, launch talk, visually editorial conference talk   | `keynote`    |
| Wants custom colors / specific brand palette                      | `seminar`    |
| Generic academic talk with no affiliation requirement             | `seminar`    |
| Reading group, lab meeting, journal club, workshop                | `seminar`    |
| Conference talk where they want to advertise a specific institution that *isn't* PWR | `seminar` (or add a new template) |
| Ambiguous                                                         | Ask          |
