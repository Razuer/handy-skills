# Slide patterns

Catalog of the 25 slide patterns available across the bundled templates. This file explains *when to use* each pattern, the renderer class contract to expect in generated `deck.html`, and capacity hints. Author content in `deck.yaml`; do not copy/paste HTML snippets as the default workflow.

For exact source fields, see `pattern-schema.md`. The generator owns repetitive HTML details: slide numbering, page totals, `data-label` values, seminar header/footer chrome, university rail/footer chrome, i18n span expansion, and speaker-notes JSON.

## Source shape shared by all patterns

Every slide in `deck.yaml` should include:

```yaml
- id: one-idea
  pattern: bullets
  title: "One idea per slide"
  eyebrow: "02 — Method"
  label: "Method · Constraints"   # optional; generated if omitted
  items:
    - title: "Signpost"
      body: "Short spoken-supporting text, not a paragraph."
  script:
    cue: "pause before the punchline"
    text: |
      Here's the key constraint.
      The slide gives the signposts; I say the argument.
```

Common optional fields include `subtitle`, `actionTitle`, `section`, `minutes`, `notes`, `fitFooter`, `allowOverflowRisk`, and localized objects such as `{en: "Results", pl: "Wyniki"}` for decks with `metadata.language.available: [en, pl]`.

Small sizing overrides are available when a slide almost works but needs tuning: `contentScale`, `titleSize`, `subtitleSize`, `bodySize`, `smallSize`, `monoSize`, and `captionSize`. Prefer these over raw `style` strings.

## Class contract notes

- `seminar` renders content slides with `.slide-header`, `.content`, and `.slide-footer`; the page number appears once in `.slide-footer`.
- `university` renders content slides with `.rail`, `.content`, and `.footer`; the page number appears once in the rail meta. Logo assets live under `assets/uni/`.
- Pattern body classes remain stable for validation and CSS: `.cover`, `.divider`, `.def-grid`, `.bullets`, `.quote`/`.quote-wrap`, `.bleed`, `.pipeline`, `.cols-2`/`.cols` plus `.compare-col`/`.compare`, `.eq-grid`, `.code-grid`, `.big-num`, `.bar-chart`, `table.data`, `.image-led`, `.img-grid`, `.custom-layout`, `ol.claims`, `.limits`, `.timeline`, `.refs`, `.qa`.
- Image patterns may provide `src` to ship a concrete visual or `slotId` for a browser-fillable slot; otherwise renderers derive stable image slot identifiers from `slide.id`. Use `fit: contain` for diagrams and `fit: cover` for photos.
- If a fixed pattern is too rigid, use `custom` first. Use a documented manual HTML override only when `custom` cannot express the layout or the renderer has a bug, and record it in `README.md`.

## Capacity hints by pattern

### cover
Opening slide with title, subtitle, speaker, affiliation/advisor, date, and duration/programme. Keep the title to 1–2 balanced lines; university cover also needs faculty/unit and localized title/subtitle when bilingual.

### agenda
Numbered route map. Use 3–6 sections. Each item should be a short section name plus one short meta phrase or time estimate.

### section-divider
Chapter break with giant section number and title. Use on talks longer than ~10 minutes; skip for most lightning talks. Keep title under ~7 words.

### definition
Definition card plus practical implications. Best for the one concept the audience must understand. Capacity: one term, optional notation, 2-sentence gloss, 3–4 practice bullets.

### bullets
General-purpose list slide. Capacity: 3–6 items, each with a short bold claim and one-line elaboration. If you need 7+ items, split.

### quote
Pull-quote slide for one memorable external claim. Use at most once per deck. Capacity: 35–55 quoted words plus source.

### full-bleed
Image-dominant transition or motivation slide with minimal overlay text. Capacity: one strong image, one headline, one caption/credit. Do not use decorative images that do not argue something.

### pipeline
Process/architecture sequence. Capacity: 3–6 stages, each with a label and one short description. Use for RAG pipelines, experimental workflows, system components.

### comparison
Two-column comparison. Capacity: 3–5 paired rows or cards. Use for baseline vs proposed, before vs after, paper claim vs speaker critique.

### comparison-3col
Three-column comparison. Capacity: 3 columns × 3–4 rows/cards. Keep column headings very short.

### equation
Large equation with plain-language explanation. Capacity: one main equation, 2–4 symbol definitions, one takeaway sentence. Avoid derivations.

### code
Syntax/code excerpt with annotation. Capacity: ~12–18 lines at default size, fewer for university. Prefer one highlighted idea over a full listing.

### big-number
One statistic made memorable. Capacity: one large number, short label, 1–2 context lines. If there are two numbers, use two slides or a comparison/bar chart.

### bar-chart
Simple categorical result chart. Capacity: 3–7 bars, short labels, optional highlight/best marker. Use when relative magnitude matters more than exact tables.

### table
Data table. Capacity: 4–7 columns and 4–8 rows depending on label length. Highlight the rows/cells that matter; don't make the audience scan every cell.

### image-led
Figure-first explanatory slide. Capacity: one image/figure plus 3–4 explanatory bullets or callouts. Use only when the image carries the argument.

Flexible starter for diagrams or screenshots:

```yaml
- id: visual-explanation
  pattern: image-led
  title: "One visual carries the argument"
  items:
    - title: "What to notice"
      body: "Name the visual cue the audience should inspect."
    - title: "Why it matters"
      body: "Tie that cue to the claim of the slide."
  image:
    src: assets/figure.png
    fit: contain
    alt: "Main figure"
    placeholder: "Drop figure here if src is not available"
  caption: "Replace src, bullets, caption, and fit to match the deck."
```

### image-grid
Gallery/evidence grid. Capacity: up to 6 tiles with short captions. Keep captions one line where possible.

### custom
Controlled escape valve for layouts that do not fit the fixed catalog: grouped photos, asymmetric evidence boards, mixed media plus callouts, dense comparison walls, or one-off diagrams. It keeps the template chrome, title block, body typography, image-slot behavior, speaker notes, media copying, and overflow validation.

Prefer `layout.mode: grid` with named `areas` or Elm-like `layout.mode: elm`/`row`/`column` with typed `blocks`. Use Elm-like rows/columns for card rows plus diagrams so the diagram reserves space instead of overlapping the cards. Use `freeform` only when grid or Elm-like flow cannot express the composition. Avoid raw `slide.html` unless this pattern still cannot produce the result.

```yaml
- id: evidence-wall
  pattern: custom
  title: "The qualitative evidence needs a custom wall"
  layout:
    columns: "1.3fr 0.9fr"
    rows: "1fr 1fr"
    areas:
      - "photos metric"
      - "photos note"
    gap: 28px
  blocks:
    - type: gallery
      area: photos
      title: "Photo group"
      cols: 2
      images:
        - src: assets/sample-a.png
          fit: cover
          caption: "Binding motif"
        - src: assets/sample-b.png
          fit: cover
          caption: "Failure case"
    - type: metric
      area: metric
      value: "4×"
      label: "more visual context"
      valueSize: 132
      body: "A custom slide can mix a gallery, a number, and a card."
    - type: card
      area: note
      padding: 22
      titleSize: 34
      bodySize: 24
      kicker: "Takeaway"
      title: "Use structure, not patched HTML"
      body: "The renderer still owns chrome, media slots, notes, and validation."
  script:
    text: "This slide is intentionally custom, but it is still source-driven."
```

### contributions
Numbered contribution cards. Capacity: 3–4 cards. Each card should have a noun label plus one concrete contribution.

### limitations
Limitation + mitigation pairs. Capacity: 3–4 rows. Good for honest discussion: risk, why it matters, what to do about it.

### timeline
Chronology or roadmap. Capacity: 4–6 milestones. Use dates/phase names, not paragraphs.

### acknowledgements
Thank collaborators/funders. Capacity: 3–6 groups/names plus optional logos. Keep this short unless the talk context requires formality.

### references
Bibliography. Capacity: ~8 references per slide in regular density; split into I/II for longer lists. Use short author-year or numbered references in body slides.

### qa
Final slide. Include one-sentence takeaway, contact, repo/link if relevant, and an invitation for questions. This is the slide that stays up longest.

### appendix-divider
Dark/inverted divider announcing backup material. Use after Q&A or before optional slides. Keep text minimal.

## Example YAML snippets

```yaml
- id: claim-vs-read
  pattern: comparison
  title: "The paper's claim is real, but narrow"
  columns:
    - title: "Claim"
      items:
        - title: "Accuracy"
          body: "MLP-Mixer matches ViT with huge pretraining"
        - title: "Training"
          body: "Training is faster at equivalent accuracy"
    - title: "My read"
      items:
        - title: "Efficiency"
          body: "Attention is data-efficient"
        - title: "Scale"
          body: "The result depends on JFT-300M scale"
```

```yaml
- id: qa
  pattern: qa
  title: "Questions"
  takeaway: "RAG is less a magic memory and more a brittle retrieval pipeline."
  contact:
    name: "Adam Mikol"
    email: "adam@example.edu"
  script: |
    So that's the argument.
    RAG helps when retrieval is good, but it fails in retrieval-shaped ways.
```
