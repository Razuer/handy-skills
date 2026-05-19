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
