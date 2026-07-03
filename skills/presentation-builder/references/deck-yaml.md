# `deck.yaml` authoring schema

`deck.yaml` is the source of truth for a generated presentation package. The v1 generator reads this file and emits `deck.html`, `script.md`, `README.md`, copied runtime files, and template assets.

## Minimal v1 shape

```yaml
schemaVersion: 1
template: seminar              # seminar | university | keynote
metadata:
  title: "Retrieval-augmented generation"
  subtitle: "Useful memory, brittle retrieval"
  speaker: "Adam Mikol"
  date: "2026-05-19"
  footer: "CS Reading Group · 20 min + Q&A"
  language:
    default: en
    available: [en]
theme:
  dark: false
  density: regular            # compact | regular | spacious
  titleStyle: action           # seminar: topic | action
  accent: "#2a5d8a"            # seminar
slides:
  - id: cover
    pattern: cover
    title: "RAG is a retrieval problem first"
    subtitle: "Why the hard part moved outside the LLM"
    script: |
      Thanks for being here. I'm Adam.
      The one idea I want to leave you with is that RAG succeeds or fails at retrieval time.
  - id: agenda
    pattern: agenda
    title: "Roadmap"
    items:
      - title: "Why RAG exists"
        body: "hallucination and stale knowledge"
      - title: "How it works"
        body: "retriever, reader, vector DB"
```

## Top-level fields

| Field | Required | Notes |
|---|---:|---|
| `schemaVersion` | yes | Use `1`. |
| `template` | yes | `seminar`, `university`, or `keynote`. |
| `metadata` | yes | Deck-level title/speaker/date/footer/language. |
| `theme` | no | Implemented theme fields; see `customization.md`. |
| `slides` | yes | Ordered list; one object per slide. |

### `metadata`

```yaml
metadata:
  title: "Talk title"
  subtitle: "Optional subtitle"
  speaker: "Speaker Name"
  date: "2026-05-19"
  footer: "Lab / course / event"
  language:
    default: en      # en | pl
    available: [en]  # or [en, pl]
```

`metadata.language.default` selects the rendered/default locale. `metadata.language.available` declares which localized values may be present. There is no top-level scalar language field in v1.

## Localized objects

Any displayed text may be a string or an object keyed by locale:

```yaml
metadata:
  title:
    en: "Edge AI under real constraints"
    pl: "Edge AI w rzeczywistych ograniczeniach"
  speaker: "Katarzyna Nowak"
  language:
    default: pl
    available: [en, pl]
```

For `template: university` with `metadata.language.available: [en, pl]`, provide localized objects for rendered audience-facing strings; `--check` fails scalar visible text so the language toggle cannot silently drift. For single-language decks, one locale is enough.

## Theme examples

```yaml
theme:
  dark: true
  density: compact
  titleStyle: action
  codeTheme: light
  accent: "#3756f5"
  fontPair: grotesk       # seminar: plex | grotesk | dm | serif
  footer: true
  classes: ["custom-safe-class"]
```

```yaml
schemaVersion: 1
template: university
metadata:
  title:
    en: "TinyML in industrial sensing"
    pl: "TinyML w czujnikach przemysłowych"
  speaker:
    en: "Katarzyna Nowak"
    pl: "Katarzyna Nowak"
  date:
    en: "19 May 2026"
    pl: "19 maja 2026"
  language:
    default: pl
    available: [en, pl]
theme:
  dark: false
  density: compact
  footer: true
  partners: true       # showPartners is also accepted
  bullets: square      # diamond | square | dash
```

Use `theme.red` or `theme.pwrRed` only as an explicit PWR brand exception.

## Slide fields

Every slide must include `pattern`. Prefer adding a stable `id`; image slot ids are derived from `slide.id` when `slotId` is not provided. Most slides should include `title`. Optional common fields:

| Field | Notes |
|---|---|
| `id` | Stable slide identifier; helps derived image slots and debugging. |
| `label` | Short rail/thumb label; generated from title if omitted. |
| `eyebrow` | Section marker or short context line. In seminar decks this feeds the top-left chrome by default, not a repeated body label. |
| `contentEyebrow` | Optional small body label when a slide truly needs one in addition to chrome. |
| `subtitle` | One-sentence framing. |
| `actionTitle` | Assertive alternate title for action-title mode. |
| `section` | Section number/name for dividers and chrome. |
| `variant` | Renderer-supported variant such as `tight`, `inverted`, `highlight`. |
| `script` | String or object with `cue`, `text`, `transition`. |
| `fitFooter` | Escape hatch when generated footer spacing needs special handling. |
| `allowOverflowRisk` | Escape hatch to acknowledge intentional/known capacity risk. |
| `contentScale` | Scale the rendered body area without changing slide chrome. Useful values: `0.88`–`1.05`. |
| `titleSize`, `subtitleSize`, `bodySize` | Per-slide type overrides in pixels or CSS lengths. Also available: `smallSize`, `monoSize`, `captionSize`, `coverTitleSize`, `dividerTitleSize`. |

## Images and diagrams

Use `image.src` or `images[].src` when the deck should ship with a specific visual. Paths are resolved relative to `deck.yaml`; local files are copied into the generated output folder. Remote URLs and data URIs are passed through unchanged. If `src` is omitted, the renderer leaves a fillable slot that can be populated later in the browser.

For diagrams, prefer `fit: contain` so labels are not cropped. For photos, keep the default `cover` or set `fit: cover`.

```yaml
- id: architecture-visual
  pattern: image-led
  title: "The architecture is easier to explain as a figure"
  items:
    - title: "Inputs"
      body: "Raw data enters on the left."
    - title: "Processing"
      body: "The middle blocks transform and score it."
    - title: "Decision"
      body: "The right edge is the user-visible output."
  image:
    src: assets/architecture.png
    fit: contain
    alt: "Architecture diagram"
    placeholder: "Drop or replace the architecture diagram"
  caption: "Local image copied from assets/architecture.png during generation."
  notes: "Flexible visual slide. Replace src, bullets, caption, or fit per deck."
  script:
    text: "I will walk through this from left to right: input, processing, and decision."
```

Supported image slot fields: `src`, `slotId`, `placeholder`, `fit` (`cover`, `contain`, `fill`), `position`, `shape` (`rect`, `rounded`, `circle`, `pill`), `radius`, `mask`, and `alt`.

## Custom layouts

Use `pattern: custom` when the slide needs a layout that is not covered by the fixed patterns, but should still be generated from `deck.yaml` and inherit the selected template style.

```yaml
- id: photo-evidence
  pattern: custom
  title: "The evidence is visual, but asymmetric"
  layout:
    columns: "1.3fr 0.8fr"
    areas:
      - "gallery metric"
      - "gallery note"
    gap: 28px
  blocks:
    - type: gallery
      area: gallery
      cols: 2
      images:
        - src: assets/a.png
          caption: "Example A"
          fit: cover
        - src: assets/b.png
          caption: "Example B"
          fit: cover
    - type: metric
      area: metric
      value: "4×"
      label: "more examples than image-led"
      valueSize: 132
    - type: card
      area: note
      padding: 22
      titleSize: 34
      bodySize: 24
      kicker: "Takeaway"
      title: "The layout is custom; the deck is still generated"
      body: "Speaker notes, media copying, template chrome, and overflow checks still work."
  script:
    text: "This custom slide keeps the template while arranging the evidence differently."
```

Supported block types: `text`, `card`, `metric`, `quote`, `image`, `gallery`, `list`, `group`, `row`, `column`, `stack`, `rule`, and `spacer`. Prefer `layout.mode: grid` with named `areas` or `layout.mode: elm`/`row`/`column` for diagram-and-card compositions; use `freeform` only for precise one-off placement. For bilingual `university` decks, localize visible block text exactly as in other patterns.

Elm-like layout example:

```yaml
- id: diagram-with-cards
  pattern: custom
  title: "Diagram stays below the cards"
  layout:
    mode: elm
    direction: column
    spacing: 28
  blocks:
    - type: row
      spacing: 22
      height: shrink
      blocks:
        - type: card
          width: fill
          title: "Input"
          body: "Short explanation."
        - type: card
          width: fill
          title: "Process"
          body: "Short explanation."
        - type: card
          width: fill
          title: "Output"
          body: "Short explanation."
    - type: image
      height: fill
      src: assets/diagram.png
      fit: contain
```

Use block-level tuning when a custom slide needs small visual fixes:

```yaml
- type: card
  title: "Dense but controlled"
  body: "Reduce the card instead of hacking generated HTML."
  scale: 0.92
  titleSize: 32
  bodySize: 22
  padding: 20
  gap: 10
```

## Script mapping

```yaml
script:
  cue: "pause for two beats"
  text: |
    Here's the issue.
    The slide shows the symptoms, but the cause is retrieval.
  transition: "With that in mind, let's look at the pipeline."
```

The generator emits one `script.md` section per slide in order. Current generated format is:

```markdown
## Slajd 3 - Retrieval changes the failure mode

Cue: pause for two beats

Here's the issue.

Transition: With that in mind, let's look at the pipeline.
```

Target ~140 words/minute overall.

## Bilingual university example

```yaml
schemaVersion: 1
template: university
metadata:
  title:
    en: "TinyML in industrial sensing"
    pl: "TinyML w czujnikach przemysłowych"
  speaker:
    en: "Katarzyna Nowak"
    pl: "Katarzyna Nowak"
  date:
    en: "19 May 2026"
    pl: "19 maja 2026"
  footer:
    en: "Faculty of Information and Communication Technology"
    pl: "Wydział Informatyki i Telekomunikacji"
  language:
    default: pl
    available: [en, pl]
slides:
  - id: edge-budget
    pattern: bullets
    title:
      en: "The edge budget is the real constraint"
      pl: "Budżet urządzenia brzegowego jest kluczowym ograniczeniem"
    items:
      - title:
          en: "Power"
          pl: "Energia"
        body:
          en: "Battery life dominates model choice."
          pl: "Czas pracy na baterii determinuje wybór modelu."
    script:
      text:
        en: "The first constraint is power. We cannot treat it as an afterthought."
        pl: "Pierwszym ograniczeniem jest energia. Nie możemy traktować jej jako dodatku."
```

## Generation commands

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja --check
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja
```

Then validate generated layout:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/check_overflow.js ./prezentacja/deck.html
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/render_slides.js ./prezentacja/deck.html --contact-sheet --width=960
```

Optional PowerPoint handoff:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/export_pptx.js ./prezentacja/deck.html --out ./prezentacja/deck.pptx
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/export_pptx.js ./prezentacja/deck.html --out ./prezentacja/deck-raster.pptx --mode=raster
```

The default PPTX export is an editable approximation: text, simple rectangles, and images become native PPTX objects. Use raster mode for visual fidelity when element-level editing is not needed.
