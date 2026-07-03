# Fletcher cookbook

Patterns, pitfalls, and full worked examples for authoring Typst diagrams with Fletcher 0.5.x. Read the relevant section when you need a shape, a container, an edge route, or to fix a collision.

## Contents
1. Node anatomy and shapes
2. Edges: arrows, labels, routing, feedback loops
3. Fixing label collisions (the #1 polish task)
4. Grouping subsystems (container boxes with titles)
5. Worked example A — vertical process/measurement loop
6. Worked example B — architecture (simplified vs detailed)
7. Simplified vs detailed: what to cut
8. Template wiring (PWr captions, per-chapter numbering, bare-number refs)
9. Pitfalls reference

---

## 1. Node anatomy and shapes

```typst
node(
  (x, y),                 // position on an integer grid; y increases DOWNWARD
  [label],                // content: markup, line breaks via "\ ", code via `backticks`
  name: <id>,             // reference target for edges — always set this
  shape: hexagon,         // optional; default is a rounded rect
  ..c-infra,              // spread a (fill:, stroke:) class from _theme.typ
)
```

Multi-line labels use `\ ` (backslash-space). Code identifiers go in backticks so they render in the document's monospace and read as code: `[Detektor\ `multi_file_kv_state_parse`]`.

**Valid shapes** (import from `fletcher.shapes`): `rect` (default, no import needed), `circle`, `ellipse`, `diamond`, `parallelogram`, `hexagon`, `pill`, `cylinder`, `chevron`, `house`. Semantic mapping that reads well:

| shape | use for |
|-------|---------|
| rounded rect (default) | components, services, generic stages |
| `hexagon` | gateways, routers, brokers, entry points |
| `cylinder` | databases, logs, persistent stores |
| `diamond` | decisions / gates / conditions |
| `parallelogram` | data artefacts, detected patterns, I/O |

`document` is **not** a shape — using it fails the import. For "document"-like artefacts use the default rect or `parallelogram`.

Dashed border (e.g. a module that is conceptually separate / proposed): `stroke: (dash: "dashed")` alongside the colour class, e.g. `node(..., stroke: (dash: "dashed"), ..c-forge)`.

---

## 2. Edges: arrows, labels, routing

```typst
edge(<a>, <b>, "->", [label])          // solid arrow a→b with a mid label
edge(<a>, <b>, "-->", [label])         // dashed arrow (use for "soft"/restart-gated links)
edge(<a>, <b>, "->")                   // no label
```

Label placement controls:
- `label-pos: 0.0–1.0` — position along the edge (0 = source, 1 = target). Use to slide a label off a crossing or a node.
- `label-side: left | right` — which side of the edge the label sits.
- `bend: 30deg` — curve the edge as an arc (essential for two edges between the same pair, see §3).

**Long feedback / return edges** (close a loop without crossing the whole figure): route through explicit waypoints. Node names and raw coordinates can be mixed in one edge — the first and last are usually node names, the middle ones are coordinates forming a lane:

```typst
// up a left lane at x = -1.3, from a node at y≈10 back to one at y≈2
edge(<publication>, (-1.3, 10), (-1.3, 2), <gateway>, "-->", [widoczna w `tools/list`], label-side: left)
```

`mark-scale: 65–70%` on the `diagram(...)` keeps arrowheads from looking oversized at small text sizes.

---

## 3. Fixing label collisions (the #1 polish task)

After the first render you will almost always see two problems. Both are quick:

**Two arrows between the same pair overlap (their labels mash together).** Give each an arc in the opposite visual direction and put labels on the outer side. Because the two edges point opposite ways, the *same* `bend` sign bows them to opposite sides:

```typst
edge(<gw>, <forge>, "-->", [`event_log` → detektor], bend: 32deg, label-side: left),
edge(<forge>, <gw>, "-->", [widoczne po restarcie], bend: 32deg, label-side: left),
```

**A label spills onto an adjacent node** (the edge is too short for it). Either shorten the label (`[routing narzędzi]` → `[routing]`) or lengthen the edge by moving the target node one grid step further out. Shorter is usually better — the prose can carry the full phrase.

**Labels clustering in the centre where edges cross.** Spread them with different `label-pos` values (e.g. 0.3, 0.55, 0.78) and alternate `label-side`.

One clean crossing in an architecture diagram is normal and acceptable; chasing zero crossings often costs more clarity than it buys.

---

## 4. Grouping subsystems (container boxes with titles)

An enclosing node draws a box around several nodes:

```typst
node(enclose: (<orch>, <pool>), inset: 12pt,
     stroke: (paint: c-compute.stroke, dash: "dotted"),
     fill: none, corner-radius: 4pt, snap: -1),
```

`snap: -1` pushes the container behind the contained nodes. Fletcher centres an enclosing node's *label* over the content, which collides with it — so **don't** put the title on the enclosing node. Instead add the title as a separate borderless text node positioned just above the box:

```typst
node((0, 1.85), text(weight: "bold", fill: c-compute.stroke)[TaskMesh Core],
     stroke: none, fill: none),
```

Pick the title's `y` so it sits in the gap above the top member of the group.

---

## 5. Worked example A — vertical process/measurement loop

A closed loop: a main pipeline down `x = 0`, a side "skipped" branch off the decision, a separate measurement arm on the right, and a dashed return edge up a left lane. Note how every node label is a skeleton; the chapter prose carries the detail.

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#import fletcher.shapes: diamond, hexagon, cylinder, parallelogram
#import "_theme.typ": *

#let measurement-loop = fit-width({
  set text(size: 8.5pt)
  diagram(
    spacing: (6mm, 5.5mm), node-stroke: 0.8pt, node-inset: 7pt,
    node-corner-radius: 3pt, edge-stroke: 0.7pt, label-size: 7.5pt, mark-scale: 70%,

    // main spine
    node((0, 0),  [Faza 1 — przebieg bazowy\ (`read_file` × N)], name: <baseline>, ..c-driver),
    node((0, 1),  [Klient CLI\ (5 modeli)], name: <client>, ..c-driver),
    node((0, 2),  [Brama\ (JSON-RPC, JWT, audyt)], name: <gw>, shape: hexagon, ..c-infra),
    node((0, 3),  [`event_log`], name: <log>, shape: cylinder, ..c-infra),
    node((0, 4),  [Detektor wzorca], name: <det>, shape: parallelogram, ..c-detect),
    node((0, 5),  [Agregacja wsparcia], name: <agg>, ..c-detect),
    node((0, 6),  [`pattern.aggregated`], name: <pat>, shape: parallelogram, ..c-detect),
    node((0, 7),  [support ≥ próg?], name: <gate>, shape: diamond, ..c-gate),
    node((0, 8),  [`tool_proposal`], name: <prop>, ..c-forge),
    node((0, 9),  [Sandbox\ (auto-approve)], name: <sbx>, ..c-forge),
    node((0, 10), [publication\ `parse_state_file@2.0.0`], name: <pub>, ..c-mcp),

    // side branch + measurement arm
    node((1.6, 7), [`synthesis.skipped`], name: <skip>, ..c-skip),
    node((1.7, 0), [Faza 2 — ewaluacja], name: <post>, ..c-driver),
    node((1.7, 2), [Metryki\ (H1, H2, H3)], name: <met>, shape: cylinder, ..c-metric),

    edge(<baseline>, <client>, "->", [drive]),
    edge(<client>, <gw>, "->", [MCP]),
    edge(<gw>, <log>, "->", [persist]),
    edge(<log>, <det>, "->"), edge(<det>, <agg>, "->"), edge(<agg>, <pat>, "->"),
    edge(<pat>, <gate>, "->"),
    edge(<gate>, <prop>, "->", [tak], label-pos: 0.3),
    edge(<prop>, <sbx>, "->"), edge(<sbx>, <pub>, "->", [pass]),
    edge(<gate>, <skip>, "-->", [nie\ (< próg)]),

    // close the loop up a left lane + measurement
    edge(<pub>, (-1.3, 10), (-1.3, 2), <gw>, "-->", [widoczna w `tools/list`], label-side: left),
    edge(<post>, <client>, "->", [drive], label-side: right),
    edge(<client>, <met>, "->", [audyt], label-side: left),
  )
})
```

---

## 6. Worked example B — architecture (control spine + grouped subsystems)

Control spine in the left column (client → API → core → gateway), services and a module pipeline on the right, a persistence store at the bottom. Two enclosing groups with separate title nodes. This is the *detailed* variant suitable for an appendix.

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#import fletcher.shapes: hexagon, cylinder, diamond
#import "_theme.typ": *

#let architecture-full = fit-width({
  set text(size: 8pt)
  diagram(
    spacing: (13mm, 8mm), node-stroke: 0.8pt, node-inset: 6pt,
    node-corner-radius: 3pt, edge-stroke: 0.7pt, label-size: 7pt, mark-scale: 65%,

    node((0, 0),   [Dashboard], name: <dash>, ..c-driver),
    node((2.6, 0), [Zewnętrzny\ klient], name: <ext>, ..c-driver),

    node((0, 1.1), [UI REST API], name: <api>, shape: hexagon, ..c-infra),
    node((0, 2.4), [Orchestrator\ plan → impl → test → review], name: <orch>, ..c-compute),
    node((0, 3.7), [Agent Pool], name: <pool>, ..c-compute),
    node((0, 5.0), [Brama MCP\ JWT scope · audyt · routing], name: <gw>, shape: hexagon, ..c-infra),
    node(enclose: (<orch>, <pool>), inset: 12pt, stroke: (paint: c-compute.stroke, dash: "dotted"), fill: none, corner-radius: 4pt, snap: -1),
    node((0, 1.85), text(weight: "bold", fill: c-compute.stroke)[Core], stroke: none, fill: none),

    node((2.6, 5.0), [Serwery MCP], name: <mcps>, ..c-mcp),

    node((2.6, 6.2), [Proposal Registry], name: <fprop>, stroke: (dash: "dashed"), ..c-forge),
    node((2.6, 7.1), [Zatwierdzenia], name: <fappr>, shape: diamond, ..c-forge),
    node((2.6, 8.1), [Synteza], name: <fsynth>, stroke: (dash: "dashed"), ..c-forge),
    node((2.6, 9.0), [Sandbox], name: <fsbx>, stroke: (dash: "dashed"), ..c-forge),
    node((2.6, 9.9), [Tool Registry], name: <freg>, stroke: (dash: "dashed"), ..c-forge),
    node(enclose: (<fprop>, <fappr>, <fsynth>, <fsbx>, <freg>), inset: 11pt, stroke: (paint: c-forge.stroke, dash: "dotted"), fill: none, corner-radius: 4pt, snap: -1),
    node((2.6, 5.65), text(weight: "bold", fill: c-forge.stroke)[ForgeMCP], stroke: none, fill: none),

    node((1.0, 11.2), [PostgreSQL — domena · `event_log` · audyt], name: <pg>, shape: cylinder, ..c-data),

    edge(<dash>, <api>, "->", [REST]),
    edge(<ext>, <gw>, "->", [MCP], label-pos: 0.85, label-side: right),
    edge(<api>, <orch>, "->"), edge(<orch>, <pool>, "->"), edge(<pool>, <gw>, "->"),
    edge(<gw>, <mcps>, "->", [routing]),
    edge(<gw>, <fprop>, "->", [`propose_tool`], label-pos: 0.6, label-side: right),
    edge(<fprop>, <fappr>, "->"), edge(<fappr>, <fsynth>, "->"),
    edge(<fsynth>, <fsbx>, "->"), edge(<fsbx>, <freg>, "->"),
    edge(<freg>, <mcps>, "-->", [endpoint], bend: -38deg, label-side: right),
    edge(<freg>, <gw>, "-->", [widoczne po restarcie], label-side: left),
    edge(<orch>, <pg>, "->"), edge(<gw>, <pg>, "->", [audyt], label-side: left), edge(<freg>, <pg>, "->"),
  )
})
```

---

## 7. Simplified vs detailed: what to cut

Maintain two variants of a complex system. The **simplified** one goes in the main text where the chapter discusses the system at a high level; the **detailed** one goes in an appendix.

In the simplified variant, collapse each subsystem to a single node whose label names its internal flow in one line, e.g. `[ForgeMCP\ pattern → proposal → sandbox → registry]` instead of five separate nodes + a container. Keep only the cross-subsystem edges. This is what keeps the main-text figure readable and within one column. The detailed variant (example B) expands the internals for readers who want them.

---

## 8. Template wiring (PWr captions, per-chapter numbering, bare-number refs)

These belong in the document template (the `thesis`/`template.typ` show-rules), set once. If they're already present, don't duplicate per figure.

```typst
// per-chapter figure/table numbering "X.Y" (X = chapter, Y = running number)
set figure(numbering: n => {
  let chap = counter(heading).get()
  if chap.len() > 0 and chap.first() > 0 { numbering("1.1", chap.first(), n) }
  else { numbering("1", n) }
})

// labels: "Rys." under figures, "Tab." above tables
show figure.where(kind: image): set figure(supplement: [Rys.])
show figure.where(kind: table): set figure(supplement: [Tab.])
show figure.where(kind: table): set figure.caption(position: top)

// reset counters at each chapter (inside the level-1 heading show rule)
show heading.where(level: 1): it => {
  counter(figure.where(kind: image)).update(0)
  counter(figure.where(kind: table)).update(0)
  // ... rest of the chapter heading styling ...
  it
}

// caption font 1–2pt smaller than body
show figure.caption: it => { set text(size: 10pt); it }

// in-text references render as a BARE NUMBER (the word "rysunek"/"tabela"/
// "rozdział" is written by hand in the prose). Number is reconstructed at the
// referenced object's location, so cross-chapter refs are correct too.
show ref: it => {
  let el = it.element
  if el == none { return it }
  let loc = el.location()
  if el.func() == figure and el.kind in (image, table) {
    let chap = counter(heading).at(loc).first()
    let y = counter(figure.where(kind: el.kind)).at(loc).first()
    return link(loc, numbering("1.1", chap, y))
  }
  if el.func() == heading and el.numbering != none {
    return link(loc, counter(heading).at(loc).map(str).join("."))
  }
  it
}
```

Result: caption reads `Rys. 5.1: …` / `Tab. 5.1: …` (no trailing period — write captions without one); a `@fig:…` in text renders just `5.1`, so you write "na rysunku @fig:…" → "na rysunku 5.1". Bibliography citations are unaffected (their `it.element` is `none`).

---

## 9. Pitfalls reference

- **Non-existent shape** → import error. Only the shapes in §1 exist; `document` does not.
- **`fit-width` brace balance** — wrapping `#let x = { … }` as `#let x = fit-width({ … })` requires the close to become `})`.
- **Overlapping antiparallel edges** — opposite-direction edges between the same nodes need `bend:` to separate (§3).
- **Long label on a short edge** — spills onto the neighbour; shorten or lengthen (§3).
- **Container title overlap** — never label the enclosing node; use a separate text node (§4).
- **Figure not in "Spis rysunków"** — a Fletcher diagram inside `#figure(...)` is `kind: image` automatically and lists correctly; if it doesn't, the figure body probably isn't being detected as an image — set `kind: image` explicitly on the figure.
- **Diagram still overflows** — confirm it's wrapped in `fit-width`; that helper is the guarantee against margin overflow.
- **Network on first compile** — Fletcher/CeTZ download from the package index once; after that they're cached. Pin the version.
