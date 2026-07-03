---
name: typst-diagrams
description: Author clean, print-ready academic diagrams natively in Typst using Fletcher (+ CeTZ) — architecture diagrams, process/data flows, pipelines, sequences — as reusable .typ modules that share one theme and never overflow the page margins. Use this whenever the user wants a diagram in a Typst document (thesis, paper, report, book), wants to replace blurry/oversized PNG or D2/Mermaid/Graphviz diagrams with vector graphics whose fonts match the document, complains a figure is too wide / sticks out of the margins / is unreadable when printed, or asks for a schemat/diagram/rysunek in a .typ project. Prefer this over external diagram tools (D2, Mermaid, draw.io) for anything that lands inside a Typst document, because native Fletcher gives vector output, document-matching fonts, and a single compile step.
---

# Typst Diagrams (Fletcher)

Author diagrams **inside** the Typst document with [Fletcher](https://typst.app/universe/package/fletcher) (node-and-arrow graphs, built on CeTZ). For a Typst thesis/paper this beats external tools (D2, Mermaid, Graphviz, draw.io) because the output is vector, the fonts match the document automatically, and there is no separate render/export step or PNG to embed.

This skill encodes a workflow proven on a real master's thesis. Follow it and you get diagrams that look like they belong in the document and never blow past the margins.

## Why diagrams go wrong (read first — it changes the design)

The two failure modes that make academic diagrams unusable, and the fix:

1. **Too wide / unreadable.** A diagram laid out left-to-right with verbose node labels becomes a 7:1 strip; shrunk to page width its text turns microscopic. **Fix:** prefer vertical/portrait flow, and put detail in the prose, not the node. A node is the *skeleton* of a stage — its name, maybe one qualifier. The surrounding paragraph already explains the rest. If you find yourself writing a sentence inside a node, move it to the text.

2. **Overflows the margins.** Fletcher does not auto-scale to its container, so a diagram wider than the text block sticks out. **Fix:** the `fit-width` helper (in the theme) measures the diagram and scales it down to the text width when needed. Wrap every diagram in it.

Keep these two in mind from the first node you place — they drive layout choices more than anything else.

## Core operating principles

- **Node = skeleton, prose = detail.** Short labels (1–2 lines). Identifiers/code tokens go in `raw` (backticks) so they match the document's monospace.
- **One shared theme.** All diagrams import a single `_theme.typ` for the palette and helpers, so the whole document is visually consistent and a palette tweak propagates everywhere.
- **Print-safe colour.** Light fills + dark strokes. This stays legible in greyscale printing and colour-codes stages without being garish.
- **Vertical by default.** Flows/pipelines read top-to-bottom (portrait fits A4). Use a left-to-right arm only for genuine side-branches (a measurement stage, an error path).
- **One diagram, one reusable module.** Each diagram is its own `.typ` file exporting a named value, imported by the chapter that uses it. Keeps chapter source clean and the diagram reusable.
- **Verify by rendering.** Never claim a diagram is done without compiling and *looking* at the rendered page. Label overlaps and overflow are invisible in source.

## Setup (once per document)

Diagrams live in a `diagrams/` directory at the document root. Copy the theme template there:

- `assets/_theme.typ` in this skill → `diagrams/_theme.typ` in the document.

It provides the colour classes (`c-driver`, `c-infra`, `c-compute`, `c-detect`, `c-gate`, `c-forge`, `c-mcp`, `c-data`, `c-metric`, `c-skip`) and the `fit-width` helper. Rename/extend the classes to fit the document's domain — the names are just semantic groupings.

Fletcher and CeTZ are fetched from the Typst package index on first compile (needs network once, then cached). Pin the version, e.g. `@preview/fletcher:0.5.8`.

## Authoring a diagram

Create `diagrams/<name>.typ`:

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#import fletcher.shapes: hexagon, cylinder, diamond, parallelogram
#import "_theme.typ": *

#let <name> = fit-width({          // fit-width: never overflow the margins
  set text(size: 8.5pt)            // figure text a bit smaller than body
  diagram(
    spacing: (9mm, 8mm),           // (x, y) gap between grid cells
    node-stroke: 0.8pt,
    node-inset: 7pt,
    node-corner-radius: 3pt,
    edge-stroke: 0.7pt,
    label-size: 7.5pt,
    mark-scale: 70%,

    // nodes on an integer grid; (x, y) with y increasing downward
    node((0, 0), [Etap A\ (krótki kwalifikator)], name: <a>, ..c-driver),
    node((0, 1), [`token_w_kodzie`], name: <b>, shape: cylinder, ..c-infra),
    node((0, 2), [Decyzja?], name: <gate>, shape: diamond, ..c-gate),

    edge(<a>, <b>, "->", [etykieta]),
    edge(<b>, <gate>, "->"),
  )
})
```

Then in the chapter:

```typst
#import "../../diagrams/<name>.typ": <name>
...
#figure(
  <name>,
  caption: [Opis rysunku],     // figure caption goes BELOW (Typst default)
) <fig:some-label>
```

`..c-driver` spreads `(fill: ..., stroke: ...)` onto the node. Reference nodes in edges by the `name:` you gave them (`<a>`), which is far more readable and robust than re-typing coordinates.

For the **node = skeleton** principle in practice and the difference between a *simplified* and a *detailed* variant of the same system, plus the full Fletcher pattern library (groups/containers, shapes, edge routing, fixing label collisions), read **`references/fletcher-cookbook.md`**. Consult it whenever you need a shape, a container box, a feedback/return edge, or two arrows between the same pair of nodes.

## Layout playbook

- **Linear flow / pipeline:** single column at `x = 0`, `y = 0, 1, 2, …`. Side outcomes (skipped/error) sit at `x = 1.5` next to their decision node.
- **Closed loop:** main pipeline down `x = 0`; route the return edge up a left lane with explicit waypoints, e.g. `edge(<last>, (-1.3, 10), (-1.3, 2), <first>, "-->", [etykieta])`.
- **Architecture:** put the central hub (gateway/bus) on a clear spine; clients on top; data store at the bottom as a persistence bus. Use enclosing group boxes for subsystems (see cookbook). Provide a *simplified* variant (subsystems as single boxes) for the main text and keep a *detailed* variant for an appendix.

## Captions and numbering (PWr thesis conventions)

These are typically handled **once in the document template**, not per figure — check the template before adding anything per-figure:

- Figure caption **below**, table caption **above**.
- Label format `Rys. X.Y` / `Tab. X.Y` (X = chapter, Y = running number within chapter), via per-chapter counter reset and a `set figure(numbering: …)` that prefixes the chapter number.
- **No trailing period** on captions.
- Caption font 1–2 pt smaller than body.
- In-text references render as a **bare number**; the describing word ("na rysunku", "w tabeli") is written by hand in the prose.
- If the figure shows the author's own system, the caption source line is `Źródło: opracowanie własne`.

If the template does **not** already do per-chapter numbering and bare-number refs, see `references/fletcher-cookbook.md` → "Template wiring" for the exact `set`/`show` rules.

## Verification — always do this before declaring done

Fletcher problems (overlapping labels, a node off the page, an arrow through a box) only show up visually. Render and inspect:

```bash
# Standalone preview while iterating (fast, isolated):
cat > _diag_preview.typ <<'EOF'
#set page(width: auto, height: auto, margin: 8mm, fill: white)
#set text(font: "New Computer Modern", lang: "pl")   // match the document
#import "diagrams/<name>.typ": <name>
#<name>
EOF
typst compile _diag_preview.typ /tmp/diag.png --ppi 200 && rm _diag_preview.typ
# then open/Read /tmp/diag.png

# In-context check (does it fit the real page?): compile the whole document,
# find the figure's page, render it, and look at the margins:
typst compile main.typ /tmp/out.pdf
pdftotext -f <p> -l <p> /tmp/out.pdf -            # locate the caption text
pdftoppm -png -r 150 -f <p> -l <p> /tmp/out.pdf /tmp/page
# For dense diagrams, crop halves to inspect closely:
magick /tmp/page-0<p>.png -crop 100%x33%+0+0 +repage /tmp/page_top.png
```

Look specifically for: labels overlapping each other or a node, any element past the left/right margin, arrows crossing through boxes, and whether scaled-down text is still readable. Fixes live in the cookbook (bends, `label-pos`, `label-side`, repositioning, shorter labels).

## Common pitfalls (quick list; details in cookbook)

- `document` is **not** a Fletcher shape — valid ones include `rect` (default), `circle`, `ellipse`, `diamond`, `parallelogram`, `hexagon`, `pill`, `cylinder`. Importing a non-existent shape fails the build.
- Two arrows between the same pair of nodes overlap their labels — separate them with opposite `bend:` angles and `label-side`.
- A short edge can't fit a long label and it spills onto the adjacent node — shorten the label or lengthen the edge (move the node).
- Group/container titles: Fletcher centres an enclosing node's label over the content; place the title as a separate borderless text node just above the box instead.
- Changing `#let name = {` to `fit-width({` means the closing `}` must become `})`.
