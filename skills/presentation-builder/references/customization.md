# Customization guide

Customize the deck in `deck.yaml`. The renderer converts v1 `theme` fields into body classes, CSS variables, localized text wrappers, and copied support assets in generated `deck.html`. Do not edit generated HTML for routine theming; update YAML and regenerate.

## Shared v1 theme knobs

```yaml
schemaVersion: 1
template: seminar
metadata:
  title: "Example talk"
  speaker: "Speaker Name"
  language:
    default: en
    available: [en]
theme:
  dark: false              # true | false
  density: regular         # compact | regular | spacious
  footer: true             # true | false
  codeTheme: dark          # dark | light
  classes: []              # extra safe body classes
```

Renderer behavior:
- `dark: true` → `body.dark`.
- `density: compact|spacious` → `body.compact` or `body.spacious`; `regular` emits neither.
- `footer: false` → `body.no-footer`.
- `codeTheme: light` → `body.code-light`.
- `classes` are appended to the rendered body class list.

## Seminar template

Seminar is the customizable, non-institutional template.

```yaml
theme:
  dark: true
  density: compact
  footer: true
  codeTheme: light
  accent: "#3756f5"
  fontPair: grotesk      # plex | grotesk | dm | serif
  titleStyle: action     # topic | action
```

| YAML field | Rendered class / variable | Effect |
|---|---|---|
| `theme.dark: true` | `body.dark` | Dark theme. |
| `theme.density: compact` | `body.compact` | Tighter padding/gaps for dense talks. |
| `theme.density: spacious` | `body.spacious` | Looser keynote/lightning spacing. |
| `theme.titleStyle: action` | `body.action-titles` | Shows assertive title phrasing. |
| `theme.footer: false` | `body.no-footer` | Hides footer chrome. |
| `theme.codeTheme: light` | `body.code-light` | Light code panels. |
| `theme.accent` | `--accent` | One accent color. |
| `theme.fontPair` | font CSS variables | Selects implemented font stack. |

Implemented `fontPair` values:
- `plex` — IBM Plex Sans/Mono defaults.
- `grotesk` — Space Grotesk-style display pairing.
- `dm` — DM Sans/Mono pairing.
- `serif` — more classical/editorial display.

Suggested accents:

| Mood | Accent |
|---|---|
| Editorial blue | `#2a5d8a` |
| Forest | `#2e6b4a` |
| Burgundy | `#8a2a3a` |
| Coral | `#d97757` |
| Electric blue | `#3756f5` |
| Amber for dark decks | `#f0a830` |

## University template

The university template is brand-locked for Politechnika Wrocławska / Wrocław University of Science and Technology.

```yaml
schemaVersion: 1
template: university
metadata:
  title:
    en: "Example"
    pl: "Przykład"
  speaker:
    en: "Speaker Name"
    pl: "Speaker Name"
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
  partners: true          # showPartners is also accepted
  codeTheme: dark
  bullets: diamond        # diamond | square | dash
```

Renderer behavior:
- `metadata.language.default: en|pl` → `body.lang-en` or `body.lang-pl`.
- `metadata.language.available: [en, pl]` declares bilingual localized values for runtime language switching.
- `theme.partners: false` or `theme.showPartners: false` → `body.no-partners`.
- `theme.bullets: square|dash` → `body.bullets-square` or `body.bullets-dash`; `diamond` is the default brand marker.
- PWR logos and partner marks are copied to `assets/uni/`.

Brand tokens such as PWR red `#9A342D` and cream `#F1D1A2` are locked. Use `theme.red` or `theme.pwrRed` only when the user explicitly requests a brand exception; usually the right answer is to switch to `seminar` for custom colors.

## Keynote template

Keynote is the editorial/product-talk template. It defaults to a dark warm-black stage and can switch to a paper/light mode.

```yaml
template: keynote
theme:
  accent: "#ff5836"
  paper: false          # true for light/paper mode; theme.dark: false also works
  density: regular     # compact | regular | spacious
  footer: true
  italics: true         # false disables serif italic emphasis styling
```

Renderer behavior:
- `theme.accent` → `--accent`.
- `theme.paper: true` or `theme.dark: false` → `body.paper`.
- `theme.density: compact|spacious` → `body.compact` or `body.spacious`.
- `theme.footer: false` → `body.no-footer`.
- `theme.italics: false` → `body.no-italics`.

Inline emphasis: in keynote content strings, wrap emphasized words with `*asterisks*`; the renderer converts them to the template's serif accent span. Example: `title: "A field guide to *calm* software."`

## Localized objects

Use localized YAML objects for bilingual content under `metadata` and `slides[]`:

```yaml
metadata:
  title:
    en: "Retrieval-augmented generation"
    pl: "Generowanie wspomagane wyszukiwaniem"
  language:
    default: en
    available: [en, pl]
slides:
  - id: failure-mode
    pattern: bullets
    title:
      en: "Retrieval changes the failure mode"
      pl: "Wyszukiwanie zmienia tryb awarii"
```

The renderer expands these into the template's language mechanism. For single-language university decks, include only the language requested unless future reuse needs both.

## Capacity guidance and tightening

Prefer structural fixes in YAML over CSS hacks:

1. Start dense or non-English decks with `theme.density: compact`.
2. Split long lists/tables/references into additional slides.
3. Shorten labels and table headers before reducing font size.
4. Use `fitFooter` for footer-specific fitting issues and `allowOverflowRisk` only to acknowledge intentional capacity risk.
5. Manual CSS/HTML overrides are last-resort escape hatches for unsupported patterns and must be documented in `README.md`.

Rules of thumb:
- bullets: 3–6 items;
- contributions/limitations: 3–4 cards/rows;
- references: about 8 per slide;
- code: 12–18 lines;
- tables: 4–7 columns and 4–8 rows.

Polish, Czech, Hungarian, Finnish, and similar languages often need 10–15% more room. Plan one fewer bullet than in English and verify with `check_overflow.js`.

## Mapping user cues to YAML

| User says | Set |
|---|---|
| "keynote" / "launch" / "product talk" | `template: keynote`, dark default or `theme.paper: true` |
| "modern" / "tech" | `template: seminar`, electric accent, `theme.fontPair: grotesk` |
| "warm" | coral accent, warm light background if supported |
| "serious" / "academic" | defaults, `theme.fontPair: plex`, editorial blue |
| "dark room" | `theme.dark: true` |
| "lots of content" | `theme.density: compact` |
| "minimal" | `theme.density: spacious`, fewer slides |
| "assertive titles" | `theme.titleStyle: action` |
| "no footer" | `theme.footer: false` |
| "Polish too" / "bilingual" | `template: university`, `metadata.language.available: [en, pl]`, localized objects |
| "PWR / Politechnika Wrocławska" | `template: university` |
