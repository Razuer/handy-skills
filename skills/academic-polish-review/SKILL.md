---
name: academic-polish-review
description: Review Polish academic and diploma theses for concrete human academic style, impersonal form, source-grounded claims, stylistic consistency, duplicates, Typst/LaTeX editorial issues, Polish grammar, and AI-writing signatures. Use when reviewing thesis chapters, scientific papers, Polish academic prose, TaskMesh-related evidence, citations, terminology, Typst source files, or style-guide compliance.
license: MIT
compatibility: opencode
---

# Academic Polish Review

Use this skill when reviewing or editing Polish academic work: diploma theses, scientific papers, chapter drafts, methodology sections, literature reviews, tool evaluations, and source-grounded technical writing.

Load `humanizer` when the text has AI-writing signatures or needs a final naturalness pass. If a `veritas` skill/tool is available, use it for dictionary checks, scientific-paper RAG, source verification, or language scoring before giving final judgments. If `veritas` is unavailable, state that and continue with local sources and normal review tools.

## Review stance

- Write and evaluate in Polish academic style, but keep the voice concrete, critical, and human.
- Prefer impersonal form: "w pracy pokazano", "przeprowadzono analizę", "porównano wyniki". Avoid first person.
- Do not add marketing tone, inflated certainty, promotional descriptions, or feature-brochure language.
- Preserve methodology, assumptions, limitations, and uncertainty.
- Prefer minimal edits unless the user explicitly asks for rewriting.
- Do not invent numbers, citations, sources, or measurements.

## Evidence discipline

Every important claim should be tied to an evidence type:

- literature result
- product documentation
- changelog or release note
- issue tracker or discussion
- copied TaskMesh source
- canonical TaskMesh report from `materialy/taskmesh-kanon/`
- author's own conclusion

Do not mix these registers. A literature result is not the same as a vendor claim. A product feature is not proof of effectiveness. An author's conclusion should be marked as interpretation, not as an external fact.

For TaskMesh numbers, use only canonical reports in `materialy/taskmesh-kanon/` unless the user points to another authoritative source. If the source is missing, mark the claim as unverified instead of filling the gap.

## Style rules

- Avoid formulaic AI prose: generic introductions, generic summaries, symmetrical filler lists, rule-of-three structures, and predictable transitions.
- Remove phrases such as "warto zauważyć", "kluczowe jest", "w dzisiejszych czasach", "dynamiczny krajobraz", "należy podkreślić", unless the surrounding context truly requires them.
- Avoid English calques unless they are technical terms with no good Polish equivalent.
- Use "funkcja" for countable system capabilities. Reserve "funkcjonalność" for the quality of being functional.
- Use "liczba" for countable items and "ilość" for mass nouns.
- Prefer "wiele elementów" over "szereg elementów" unless a literal ordered series is meant.
- Avoid jargon and pseudo-Polish forms such as "sejwowanie" and "downloadowanie" in the thesis body.
- Avoid decorative academic inflation: "najznamienitszym przykładem tego niebywałego postępu" should become a concrete claim.
- Split sentences that are too long to follow. Do not replace one long sentence with a mechanically symmetrical list.

## Polish language checks

- Check inflection, case government, gender, number, person, subject-verb agreement, tense, mood, and aspect.
- Fix English calques: "robi sens" -> "ma sens"; "zrobić decyzję" -> "podjąć decyzję"; "na końcu dnia" -> "ostatecznie" or "w praktyce"; "adresuje problem" -> "rozwiązuje problem" or "dotyczy problemu".
- Fix unclear anaphora by repeating the relevant noun or name when needed.
- Remove duplicated neighboring claims. Keep the sharper or more source-grounded sentence.
- Check named entities, dates, numbers, abbreviations, table and figure references, and internal contradictions.

## Academic thesis conventions

- Use impersonal compact constructions: "w pracy pokazano" rather than "w pracy zostało pokazane".
- When referring to the author, use forms such as "autor wykazał, że" only if the surrounding style allows it. Do not use "ja", "my", or "nasze".
- Refer to figures and tables as inanimate objects: "na rysunku 3 pokazano", "w tabeli 2 zamieszczono". Avoid "rysunek pokazuje" and "tabela przedstawia" when enforcing the strict university style.
- Keep chapter and subsection size balanced. Flag sections that are too short, padded, or disproportionate.
- Do not let tool descriptions turn into feature brochures. Describe capabilities, limitations, and evidence separately.

## Typst, LaTeX, and editorial checks

- Remove spaces before punctuation and around brackets or quotation marks: "powiedziano, że", not "powiedziano , że".
- Use non-breaking spaces where needed in Polish source markup, especially after one-letter prepositions and after abbreviations. In Typst this commonly means `w~przykładzie` and `np.~jak tutaj`; in LaTeX the same convention uses `~`.
- Keep list formatting consistent: item starts, punctuation at item ends, and grammatical continuation after the lead-in sentence.
- Avoid orphaned one-letter words at line ends and watch for widows/orphans when reviewing rendered output.
- Mark foreign-language terms according to the document system. In Typst prefer the local emphasis convention, usually `_..._` or the project's `#emph[...]`/style macro; in LaTeX use `\emph{}`. Example idea: `OGC (ang.~_Open Geospatial Consortium_)` in Typst or `OGC (ang.~\emph{Open Geospatial Consortium})` in LaTeX.
- Expand each abbreviation at first use and keep the abbreviation list consistent if the document has one.

## Review output

Use findings, not generic commentary. For each issue, include:

- location: file, chapter, section, or quoted passage
- severity: critical, major, minor, editorial
- problem: one concrete sentence
- evidence: source type or style rule
- suggested fix: concise rewrite or action

If no material issue is found in a category, say so explicitly. Do not add praise-padding.
