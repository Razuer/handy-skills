# Slide patterns

Catalog of the 24 slide patterns available across the bundled templates. This file explains *when to use* each pattern, the renderer class contract to expect in generated `deck.html`, and capacity hints. Author content in `deck.yaml`; do not copy/paste HTML snippets as the default workflow.

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

## Class contract notes

- `seminar` renders content slides with `.slide-header`, `.content`, and `.slide-footer`; the page number appears once in `.slide-footer`.
- `university` renders content slides with `.rail`, `.content`, and `.footer`; the page number appears once in the rail meta. Logo assets live under `assets/uni/`.
- Pattern body classes remain stable for validation and CSS: `.cover`, `.divider`, `.def-grid`, `.bullets`, `.quote`/`.quote-wrap`, `.bleed`, `.pipeline`, `.cols-2`/`.cols` plus `.compare-col`/`.compare`, `.eq-grid`, `.code-grid`, `.big-num`, `.bar-chart`, `table.data`, `.image-led`, `.img-grid`, `ol.claims`, `.limits`, `.timeline`, `.refs`, `.qa`.
- Image patterns may provide `slotId`; otherwise renderers derive stable image slot identifiers from `slide.id`.
- If a pattern needs unsupported markup, use a documented manual HTML override only as an escape hatch and record it in `README.md`.

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

### image-grid
Gallery/evidence grid. Capacity: up to 6 tiles with short captions. Keep captions one line where possible.

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
