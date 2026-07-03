---
name: samply-profile-analysis
description: Analyze Samply JSON exports and Firefox-profiler-style profiles without loading the raw file into context. Use when Claude is given a `samply record` export, a large `profile.json`, a performance trace to inspect, or a request to find hot paths, expensive functions, busy threads, repeated stacks, or likely optimization targets from a sampled CPU profile.
---

# Samply Profile Analysis

Use the bundled summarizer first. Do not start by reading the raw JSON export into context unless you are patching the summarizer or validating an unusual schema.

The summarizer is intentionally two-pass: default output is a bounded thread triage, while frame/stack tables are printed only after focusing a thread or raising `--thread-limit`. This prevents large profiles from flooding the agent context with empty threads, helper processes, and unresolved symbols.

## Workflow

1. Run `scripts/summarize_profile.py <profile.json>` for a concise overview sorted by matched CPU delta, then weight. This skips empty threads and does not print detailed stacks by default.
2. Pick the relevant app thread from the overview. Do not assume the busiest thread is the target; child processes such as `npm`, `python`, `rg`, JIT workers, or shell helpers can dominate a recording.
3. Rerun with `--thread <substring> --thread-limit 1 --top 8` to get focused self frames, inclusive frames, and repeated stacks.
4. If you want agent-ready notes, add `--format markdown` to the focused command. Quote only the relevant sections, not the whole profile report.
5. If the focused report is still broad, add `--stack-match <regex>`, adjust `--top`, or use `--full-names` when exact symbols matter.
6. Use `--all-threads`, `--show-empty`, or large `--thread-limit` values only when investigating scheduler/thread lifecycle issues.
7. Only inspect the raw JSON directly when the profile schema looks unsupported or you need fields the helper does not expose yet.

## Commands

Basic triage overview:

```bash
python3 scripts/summarize_profile.py "path/to/profile.json"
```

Shorter overview for very large profiles:

```bash
python3 scripts/summarize_profile.py "path/to/profile.json" --overview-limit 10
```

Focus on one thread and print details:

```bash
python3 scripts/summarize_profile.py "path/to/profile.json" --thread scroll_view --thread-limit 1 --top 8
```

Emit Markdown for direct agent reporting:

```bash
python3 scripts/summarize_profile.py "path/to/profile.json" --thread scroll_view --thread-limit 1 --top 8 --format markdown
```

Focus on a suspected subsystem:

```bash
python3 scripts/summarize_profile.py "path/to/profile.json" --thread scroll_view --thread-limit 1 --stack-match 'layout|scroll|document_view' --top 12
```

Opt into exhaustive output only when needed:

```bash
python3 scripts/summarize_profile.py "path/to/profile.json" --all-threads --show-empty --top 5
```

## Interpretation

- Treat `Thread overview` as triage, not the final diagnosis. It tells you which thread to focus.
- Treat `Top self frames` as the best signal for where CPU time lands directly.
- Treat `Top inclusive frames` as the best signal for which call paths dominate total runtime.
- Treat `Top stacks` as the fastest way to identify repeated execution shapes.
- Use thread names, sample counts, and CPU delta totals to distinguish the busy UI thread from helper threads.
- The helper compacts long symbol names by default. Use `--full-names` before citing exact symbols in code comments, issues, or patches.
- When symbol names are mostly addresses, mention that symbolication quality is limiting confidence.
- Report only the likely root cause, supporting frame/stack rows, and the command used. Do not paste every table from an exhaustive run.

## Deep Dives

Read `references/profile-format.md` when you need to understand or extend the stack reconstruction logic, especially for exports that differ from the sample profile layout.
