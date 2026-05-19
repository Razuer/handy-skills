# Pattern schema contracts

This reference lists v1 source fields the generator accepts for each slide pattern. Text values may be strings or localized objects (`{en: ..., pl: ...}`) unless noted.

## Shared fields

```yaml
slides:
  - id: problem              # recommended stable identifier
    pattern: bullets         # required
    title: "Slide title"     # usually required
    subtitle: "Short framing"
    eyebrow: "02 — Method"
    label: "Method · Problem"
    variant: tight
    fitFooter: false         # escape hatch for footer fitting
    allowOverflowRisk: false # explicit capacity-risk acknowledgement
    script:                  # string or object
      cue: "pause"
      text: "Spoken text"
      transition: "Bridge"
```

Image slots may specify `slotId`; if omitted, renderers derive a stable slot id from `slide.id`.

## Per-pattern fields and capacity

### `cover`
- Fields: `title`, `subtitle`, optional `fields` mapping for cover metadata. Deck-level speaker/date/footer come from `metadata`.
- Capacity: title 1–2 lines; 3–5 metadata fields.

### `agenda`
- Fields: `title`, `items[]` with `title`/`label` plus optional `meta` or `duration`.
- Capacity: 3–6 items.

### `section-divider`
- Fields: `sectionNumber` or `number`, `title`, optional `meta`, `duration`, or `caption`.
- Capacity: short title, one meta line.

### `definition`
- Fields: `term`, `notation`, `body`; optional `items[]` with `title` plus `body`/`desc`.
- Capacity: one body definition plus 3–4 practical items.

### `bullets`
- Fields: `title`, `subtitle`, `items[]` with `idx`, `title`, `body` or `desc`.
- Capacity: 3–6 items.

### `quote`
- Fields: `quote`, `source`, `body`/`context`.
- Capacity: 35–55 quoted words.

### `full-bleed`
- Fields: `image` (optional `slotId`/`placeholder`/`credit`) or `slotId`, `alt`, `title`, `caption`, `credit`, `overlay`.
- Capacity: one image, one headline, one caption.

### `pipeline`
- Fields: `steps[]` with `title`, `body` or `desc`, `icon`/`idx`; optional `caption`.
- Capacity: 3–6 steps.

### `comparison`
- Fields: `columns[2]` with `title`, `items[]`; item values may be strings or objects with `title` and `body`/`desc`. Optional `rows[]` for paired rows.
- Capacity: 3–5 items per column.

### `comparison-3col`
- Fields: `columns[3]` with `title`, `items[]`.
- Capacity: 3 columns × 3–4 items.

### `equation`
- Fields: `equation`, `variables[]` with `symbol`, `term`, `desc`/`body`, optional `caption`.
- Capacity: one main equation, 2–4 symbol definitions.

### `code`
- Fields: `language`, `filename`, `code`, `caption`, `items[]` or `notesList[]` with `title`/`body`.
- Capacity: ~12–18 lines.

### `big-number`
- Fields: `number`/`value`, `unit`, `label`, `body`/`description`/`context`, `source`; set `noTitle: true` or `titleBlock: false` for stat-only layouts.
- Capacity: one number and 1–2 context lines.

### `bar-chart`
- Fields: `bars[]` or `items[]` with `label`, `value`, `height`, optional `win`; optional `chartNotes[]`/`callouts[]`, `calloutValue`, `callout`.
- Capacity: 3–7 bars.

### `table`
- Fields: `columns[]`, `rows[]`, `highlightRows`, `caption`, `notes`.
- Column fields: `id`, `key`, `label` or `title`, optional `numeric: true`, optional `align: right`.
- Rows may be arrays, objects keyed by column `key`/`id`, or objects with `cells[]`; cells may be scalar/localized values or `{text|value|label, class, classes}` for per-cell styling such as `delta-pos`/`delta-neg`.
- Capacity: 4–7 columns, 4–8 rows.

### `image-led`
- Fields: `image` object with optional `slotId`/`placeholder`, `caption` or `captionRow[]`, `title`, `items[]` with `title` and `body`/`desc`.
- Capacity: one figure plus 3–4 bullets/callouts.

### `image-grid`
- Fields: `images[]` with optional `slotId`/`id`, `placeholder`, `caption`, `title`, `meta`, `metaClass` (`pos`/`neg`).
- Capacity: up to 6 tiles.

### `contributions`
- Fields: `items[]` with `idx`, `title`, `body` or `desc`.
- Capacity: 3–4 cards.

### `limitations`
- Fields: `items[]` with `title`/`limitation`, `body`/`impact`, optional `fix` and `fixLabel`.
- Capacity: 3–4 rows.

### `timeline`
- Fields: `items[]` with `date`/`month`/`label`, `title`, `body` or `note`, optional `alt: true` for alternate column styling.
- Capacity: 4–6 milestones.

### `acknowledgements`
- Fields: `groups[]` or `items[]` with `title`/`label` and nested `items[]`; each nested item may include `name`, `role`, `grant`.
- Capacity: 3–6 groups/names.

### `references`
- Fields: `items[]` as strings or objects with `authors`, optional `title`, `venue`, `doi`/`url`; optional `start` for split slides.
- Capacity: about 8 references per slide.

### `qa`
- Fields: `title`, `subtitle`, optional `fields` mapping, or `contact`, `slides`, `code` convenience fields.
- Capacity: one takeaway, 1–3 contact/link items.

### `appendix-divider`
- Fields: `title`, `subtitle`, `body`/`meta`.
- Capacity: minimal; announces backup material.

## Validation expectations

The generator's `--check` mode catches missing required fields, unsupported pattern names, malformed localized objects, invalid `theme` values, duplicate slide ids, image slot problems, and obvious capacity risks where possible. Browser layout checks remain the job of `check_overflow.js` and contact-sheet review.
