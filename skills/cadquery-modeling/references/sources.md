# Primary sources and research provenance

Compiled / verified 2026-10-10. The *CadQuery 2.8.0 API and examples were executed* in this package's environment. The following primary sources support the documented API and concepts; syntax/version should be locally confirmed after major upgrades. This skill paraphrases and links rather than bundling third-party source text.

## CadQuery (authoritative)

- [CadQuery documentation index](https://cadquery.readthedocs.io/en/latest/) — library capabilities, navigation, release-specific API
- [Installation](https://cadquery.readthedocs.io/en/latest/installation.html) — conda/mamba and pip, CQ-editor, Python compatibility caveats
- [Concepts / primer](https://cadquery.readthedocs.io/en/latest/primer.html) — Workplane, Shape, assemblies, OCCT B-Rep
- [Workplane and context solid](https://cadquery.readthedocs.io/en/latest/workplane.html) — stack, selectors, local workplanes, chaining and parent chain
- [Selectors reference](https://cadquery.readthedocs.io/en/latest/selectors.html) — selector grammar and limitations for curved edges and faces
- [Sketch reference](https://cadquery.readthedocs.io/en/latest/sketch.html) — sketch geometry and experimental constraints
- [Design principles](https://cadquery.readthedocs.io/en/latest/designprinciples.html) — design intent and parameters
- [CadQuery official examples](https://cadquery.readthedocs.io/en/latest/examples.html) — core geometry recipes
- [Assemblies](https://cadquery.readthedocs.io/en/latest/assy.html) — locations, names, colors, constraint solver
- [Import/export](https://cadquery.readthedocs.io/en/latest/importexport.html) — STEP, STL, meshing deflection, supported formats and unit options
- [Class reference](https://cadquery.readthedocs.io/en/latest/classreference.html) — precise API signatures
- [CadQuery scripts / show_object](https://cadquery.readthedocs.io/en/latest/fileformat.html) — standalone Python vs CQ-editor conventions

## Geometry and manufacturing audits

- [OCCT BRepCheck_Analyzer](https://dev.opencascade.org/doc/refman/html/class_b_rep_check___analyzer.html) — topology validity analysis
- [OCCT boolean operations](https://dev.opencascade.org/doc/overview/html/specification__boolean_operations.html) — boolean operation principles and conditions
- [Trimesh reference](https://trimesh.org/trimesh.html) — `is_watertight`, `is_winding_consistent`, `is_volume`
- [Prusa modeling for FDM](https://help.prusa3d.com/article/modeling-with-3d-printing-in-mind_164135) — walls, print orientation, manufacturing clearances
- [Formlabs engineering fits](https://formlabs.com/global/blog/3D-printing-tolerances-for-engineering-fit/) — clearance/interference concepts
- [Formlabs snap fit design](https://formlabs.com/blog/designing-3d-printed-snap-fit-enclosures/) — root fillets and flexible geometry considerations
- [Agent Skills specification](https://agentskills.io/specification) — portable skill format, progressive disclosure and metadata

## Research vs project heuristics

CadQuery APIs and modeling semantics come from its official docs and runnable examples. Multiview visual gates, failure severity, CAD-vs-mesh roundtrips and delivery status vocabulary are explicit **agent workflow recommendations** created for this skill, not a certification issued by the CadQuery developers. Numeric printer fit examples are assumptions requiring calibration for a specific machine/material/geometry.
