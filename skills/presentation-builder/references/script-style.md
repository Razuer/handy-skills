# Teleprompter / speaker script style

The script is what the user *says*, slide by slide. The deck argues with type and layout; the script argues with voice. They share content but not phrasing — never paste bullet text into the script verbatim.

Author script material in `deck.yaml` under each `slides[].script`. The generator emits `script.md` in slide order and may also derive concise speaker-note JSON cues for `deck.html`.

## Voice

Write the way the user would actually speak. That means:

- **Short sentences.** Under 20 words wherever possible. Spoken sentences die at length.
- **Contractions.** "It's", "we're", "doesn't". The exception is when emphasizing — `we do not yet know` lands harder than `we don't yet know`. Use this sparingly.
- **One idea per line.** Break at natural breath points, not at word counts. The user is reading this aloud; line breaks are pauses.
- **First person, present tense.** "I'm going to walk you through five stages," not "this presentation will cover five stages."
- **No academic hedging in the script.** The slide can say "results suggest"; the speaker says "the result is".

## Structure of a section

Each slide gets one section in generated `script.md`. Use this source shape in `deck.yaml`:

```yaml
slides:
  - pattern: bullets
    title: "Retrieval changes the failure mode"
    script:
      cue: "pause before the contrast"
      text: |
        Here's the important shift.

        RAG doesn't make the model know everything.
        It moves the hard part into retrieval.
      transition: "So now we need to look at the retriever itself."
```

The generated Markdown currently uses this shape:

```markdown
## Slajd N - {short slide title}

Cue: optional stage cue, e.g. "click to advance after the table is on screen"

{The spoken text, in 1–4 short paragraphs.}

Transition: Transition into next slide.
```

The `Transition:` line is a single short sentence that bridges into the next slide. This is what makes the deck feel like one talk instead of a sequence of paragraphs. If `slides[].script` is a plain string, the generator treats it as spoken text and omits cue/transition unless separately provided.

## Transitions

Transitions are the most under-rated part of a talk. They tell the audience where they are in the arc. Use these patterns, varying so the same one doesn't appear twice in a row:

- **Forecast** — "So with that framing in mind, let's look at what's actually hard here."
- **Contrast** — "That's the baseline. What changes when we move to graphs?"
- **Question** — "But does it actually work? Let's look at the numbers."
- **Time** — "Okay, moving on..." / "Now, the next piece..."
- **Recap-and-pivot** — "So far we've seen the problem and the standard approach. From here, things get interesting."
- **Direct** — "Onto results."

Avoid: "Next slide please." / "As you can see..." / "Without further ado..." — these are filler.

## Opening (cover slide)

The first 30 seconds set the room. The cover-slide script should:

1. Greet briefly. ("Thanks for being here. I'm {name}.")
2. State the one-sentence takeaway. Not the topic — the *conclusion* you're going to argue for.
3. Promise structure. ("I'm going to do this in three parts.")

Don't read the title off the slide — the audience can see it. Tell them why they should care.

## Closing (Q&A slide)

The last 30 seconds matter more than the cover. Don't end with "any questions?" — that's the slide's job. Instead:

1. Restate the takeaway in different words from the opener. (This creates the bookend.)
2. Name one open question or next step.
3. *Then* invite questions.

Example:
```markdown
## Slajd 15 - Q&A

Cue: Hold this slide for the entire Q&A.

So that's the case. Graphs let us learn molecular representations end-to-end,
and on the benchmarks we tried, that's worth about eight percent of AUC over
hand-engineered fingerprints.

What I don't know yet — and what I'm hoping you'll ask about — is whether
that gap holds up on the smaller wet-lab datasets I'll be working with next.

I'd love to hear what you're thinking.
```

## Pacing

Aim for **~140 words per minute** of speaking. So:

- 5-minute talk → ~700 words across the whole script.
- 20-minute talk → ~2,800 words.
- 30-minute talk → ~4,200 words.

After drafting, count words and check it lands within ±20% of the target. If it's over, the speaker will rush; under, they'll fill awkward silence. Trim or expand specific `slides[].script` entries rather than padding evenly. The generator may report timing estimates from the generated `script.md`, but the author is responsible for matching the requested slot.

## Stage cues

Use `cue` only when the speaker needs to do something with their body or the slide. The generator emits it as `Cue: ...`:

- `[pause]` — full stop, 2 seconds of silence. Use after a punchline or before a question to the audience.
- `[click to advance]` — explicit if there's a build or you want the speaker to wait until something is on screen.
- `[gesture toward figure]` — for image-led slides.
- `[breathe]` — for slides where the speaker tends to rush.

Don't pepper these everywhere. One per slide max, usually zero.

## Worked example (one slide)

Bad (reads like an essay):

> The problem with molecular property prediction is that molecules have a graph
> structure that is not adequately captured by traditional sequence or vector
> representations, which is why graph neural networks have become an attractive
> approach for this domain.

Good source text (reads like a talk):

> Here's the issue.
>
> A molecule isn't a sequence. It's not a vector. It's a graph — atoms connected
> by bonds, no canonical ordering, no fixed size.
>
> Every model we throw at it has to deal with that. And most of them deal with
> it by ignoring it.
>
> pause
>
> That's why graph neural networks are interesting here. They don't fight the
> structure — they use it.
>
> Transition: Let me show you what that looks like in practice.

Same content. The second version is half the length, twice the punch, and ends with a transition that bridges into the method slide.
