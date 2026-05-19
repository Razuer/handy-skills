# Presentation best practices

Distilled guidance for designing a deck that actually communicates. The template handles the visual craft; your job is structure, density, and pacing.

## Narrative arc

A talk is a story, not a document. The most reliable structure mirrors classical narrative: **situation → complication → resolution**. For a seminar, that maps to:

1. **Situation.** What problem space are we in? Why does the audience care? (cover + background)
2. **Complication.** What's hard about it? What did prior approaches miss? (motivation, problem framing, related work)
3. **Resolution.** What did we / does the paper do, and what happened? (method, results)
4. **Reflection.** What does it mean, what are the limits, what's next? (discussion, plan, Q&A)

Avoid the structure of a *paper*: abstract → introduction → method → ... A paper exists to be referenced; a talk exists to be heard once. Lead with the punchline more aggressively than you would on paper.

**The one-sentence test.** Before you draft, write the single sentence the audience should be able to repeat afterward. Every slide should pull toward that sentence or it's not earning its place.

## Slide count vs. duration

A useful rule of thumb: **one slide per 90–120 seconds of speaking time**. The seminar template's default 14-slide deck is sized for ~25–30 minutes. Adjust:

| Duration   | Total slides | Notes |
|-----------|--------------|-------|
| 5 min     | 5–7          | Lightning. Drop section dividers; one stat slide max. |
| 10 min    | 8–10         | Skip the timeline. Keep one results slide. |
| 20 min    | 12–15        | The template's sweet spot. |
| 30 min    | 16–20        | Add a discussion slide, more results detail. |
| 45–60 min | 22–30        | Add ablations, a worked example, a deeper related-work slide. |

Section dividers (the giant numeral slides) are cheap — they cost ~5 seconds of speaking and give the audience a breath. Use them as chapter breaks; don't skip them on longer talks.

## Density: one idea per slide

The most common failure mode is cramming. Every slide should make exactly one point. If you can't summarize a slide in one sentence, split it.

Practical rules:
- **No more than 6 bullets** on a list slide. 3–5 is better.
- **One number** per big-number slide. If there are two numbers worth showing, use two slides.
- **Tables** are fine, but highlight the rows that matter (the `.best` class in the seminar template). Don't make the audience scan.
- **Don't read bullets aloud.** If you're going to say it word-for-word, it shouldn't be on the slide. Bullets are signposts, not transcripts.

## Type hierarchy

The template ships with a tight type scale (display / title / subtitle / body / small / mono). Don't introduce new sizes or weights — the hierarchy already does the work. If something feels visually wrong, almost always the answer is "less content", not "different font".

Two fonts max in a deck. The default is a sans/mono pair (Plex Sans + Plex Mono). If swapping, keep that pairing structure — never pair two sans fonts or two display fonts.

## Color

- Use the accent color sparingly — it should mean something (current section, key number, "this is what changed"). If half the slide is in accent, it loses meaning.
- Dark mode is a real design choice, not a toggle for the projector. Choose based on room lighting: dark room → dark mode reads more confidently; sun-lit room → light mode survives projection better.
- Don't introduce a second accent. The template uses one for a reason.

## Action vs. topic titles

The seminar template supports two title modes:
- **Topic titles** ("Problem framing", "Related approaches") — neutral, like paper section headers.
- **Action titles** ("Molecules are graphs, but they are also more than graphs") — assertive, the headline tells the audience what to conclude.

Action titles are stronger for persuasive talks (defences, theses, conference). Topic titles are better for surveys and reading groups where you don't want to bias the audience. Default to action titles unless the user signals otherwise — they make the deck readable on its own and force you to commit to a point per slide.

## Things to actively avoid

- **Walls of references inline.** Use the dedicated references slide. In the body, cite as `[3]` or a short author-year, not full citations.
- **Decorative imagery.** If a figure doesn't argue something, cut it. Use the image-led layout only when the figure earns the column.
- **Apologetic slides** ("sorry, this is a bit dense"). Either fix the density or own it; don't apologize.
- **Final slide that says "Thanks / Questions?" and nothing else.** Use the Q&A slide to leave your contact info, the one-sentence takeaway, and one teaser for what's next. It's the slide that stays on screen longest — make it earn it.

## Verifying layout fits — non-negotiable

Each slide is a fixed `1920×1080` canvas with `overflow: hidden`. Text that doesn't fit isn't shrunk — it's silently clipped. After authoring `deck.yaml`, generate the deck and validate the generated HTML:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja --check
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/generate_deck.js deck.yaml --out ./prezentacja
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/check_overflow.js ./prezentacja/deck.html
```

`generate_deck.js --check` is structural/source validation. `check_overflow.js` is browser layout validation and reports both clipped content and chrome overlaps. It returns exit `0` on a clean deck, `1` with a per-slide report otherwise.

Then render a contact sheet and inspect it:

```bash
node /home/razuer/.config/opencode/skills/presentation-builder/scripts/render_slides.js ./prezentacja/deck.html --contact-sheet --width=960
```

Visual inspection catches readability issues that structural and overflow checks cannot: awkward wraps, dense tables, poor balance, and color clashes.

## Sizing content for non-English languages

Polish, Czech, Hungarian, Finnish and other diacritic-heavy or agglutinative languages run roughly 10–15% wider/taller than English at the same content. Two consequences:

- **Start with `body.compact`** instead of the regular density. The +80px of vertical room per slide is what most overflows need.
- **Plan for one fewer bullet** than you would in English. A 6-bullet slide in English may need to be 5 in Polish to stay within bounds without compromising font size.

When in doubt: write the deck, run the overflow check, then split or shrink only the slides that actually fail. Don't reflexively cut content just because it looks dense in draft.
