---
name: solidcraft
description: Entry point for SolidCraft modeling, editing, assemblies, 3D printing, exports, and app or MCP setup. Load before other solidcraft-* skills. Defines the project layout, git checkpoint workflow and verification rules that override the companion skills.
---

# SolidCraft

Priority: the user's explicit instructions, then this skill, then the companion `solidcraft-*`
skills. Where a companion skill disagrees with this one (build scripts, `build.json`,
`test_design.py`, `-v2` copies), this skill wins. Use the companions for command shapes,
traps and techniques.

## 1. Tools

Check that the SolidCraft MCP tools respond with a read-only call (`inspect_design`). If MCP is
missing or broken, stop and ask: "SolidCraft MCP is unavailable. Configure/repair it, or continue
with the CLI fallback?" Don't fall back or change client config on your own. For either route
read [environment setup](references/environment-setup.md).

Model through MCP `batch`/`execute` calls. CLI scripts are only for the CLI fallback or for
parallel subagents. They are inputs you throw away, never the source of the design.

## 2. Project location

| Situation | Destination |
|---|---|
| User names a place | Use it |
| Continuing an existing design | Its existing project folder |
| cwd empty or a fresh scaffold | cwd |
| cwd holds other projects | New kebab-case child folder, e.g. `adjustable-desk-clamp/` |

Say the absolute path. Never search the whole home directory. If an edit request could match
several designs, ask which one. Before `open`/`new_design` on a dirty app document, ask.

## 3. Project layout: fixed, nothing else

```
<name>/
  <name>.json          the design, readable SolidCraft document (source of truth in git)
  <name>.solidcraft    native file for the app (contains the same document plus mesh cache)
  README.md            what it is, parameters, print/assembly notes, status table (section 7)
  AGENTS.md            ≤40 lines: constraints, decisions, user preferences, file map
  reference/           user-supplied inputs only (photos, GIFs, drawings, measurements)
  renders/             a few final images or GIFs the user will look at
  step/  print/        deliverable exports; print-manifest.json next to print/
  .gitignore
```

Never create in the project: `*.py`, build/command scripts (`build*.json`, `*-stages.json`),
`validation/` or evidence JSON dumps, `*-before-*.solidcraft`, `backups/`, `archive/`,
`<name>-v2` files or folders, `DESIGN.md`/`RESULTS.md`, or a second design for an abandoned
idea. Git replaces all of them (section 4). Put throwaway work (walk scripts, topology dumps,
calculations, test exports) in the session scratchpad or `$TMPDIR`, outside the project.

Get `<name>.json` with the supported JSON save/export, or `unzip -p <name>.solidcraft
document.json > <name>.json`. Both files must always describe the same design.

## 4. Git: checkpoints are mandatory

This skill authorizes local commits in the design's project repo. That overrides any generic
"commit only when asked" rule for that repo only. Never push, amend, rebase or force anything.

- No repo yet: `git init`, write `.gitignore`, commit the empty scaffold. A repo with no commits
  is an error, so fix it first.
- `.gitignore`: `*.bak`, `__pycache__/`, `.venv/`, `.ruff_cache/`, `print/prepared/`. If
  `<name>.solidcraft` is over ~5 MB, also ignore it. It rebuilds from the JSON.
- **Commit at every checkpoint**: after each stage that measures correctly, before any risky or
  large change, before and after each user-requested revision, and at delivery. Save + refresh
  the JSON first; never commit a state with timeline errors unless the message says `WIP: broken`.
- Messages: `<stage>: <what changed>; <key measured numbers>`, e.g.
  `jaws: add dovetail pads; V=27028 mm³, gap 20–56 mm`.
- Rejected design direction: `git tag rejected/<idea>` (or a branch), then continue on the main
  line. Don't copy files into `archive/`. To restore: `git checkout <ref> -- <name>.json`, open it.
- Within a session use `edit.checkpoint` / `edit.restore_checkpoint` for quick MCP rollback.
  Git covers everything that must survive a session.

## 5. Way of work

1. **Understand.** Restate the requirements as numbers: envelope, loads, fits, motion range,
   print process. Ask about anything genuinely ambiguous before modeling, not after.
2. **Plan in AGENTS.md** (short): parameters, components, joints, the expected values you will
   check (volume, bbox, travel, gaps). Commit.
3. **Build in stages** following `solidcraft-modeling` / `-editing` / `-mechanisms`. After each
   stage: `measure`, then `inspect_design` (no errors or warnings, every sketch at 0 DOF). Then
   save, refresh the JSON, commit.
4. **Edit, don't rebuild.** Change parameters and timeline features. Rebuild from scratch only
   when the user agrees it's needed.
5. **Verify** (section 6), export, update README, final commit, report.

## 6. Verification: real checks, no shortcuts

- Every claim needs a number you predicted and then measured with SolidCraft. "Command
  succeeded" proves nothing. A cut that doesn't change the volume missed.
- Verify with SolidCraft itself: `measure`, `occurrence.properties`, `inspect.interference`,
  `joint.sweep`, `motion.interference`, `contact.check`, `screenshot`, `solidcraft-cli eval`/
  `snapshot`. Use bundled tools as they are: this skill's `scripts/prepare_prints.py` and the
  checking skill's `run.py`/`compare_step.py`. **Don't write Python or other verification
  scripts.** If you need arithmetic, work it out in your reasoning or run a one-off
  `python3 -c` and write nothing to disk.
- If a requested check can't run (timeout, budget exhausted, tool missing), say so and mark that
  item UNVERIFIED. Don't silently swap in a weaker check (sampled poses for a sweep, 2D for 3D)
  and report it as PASS. If a substitute is worth running, ask first.
- Don't drop or simplify a stated requirement (threads, tolerances, all-printed, a motion range)
  to get something working. Ask first, and record the decision in AGENTS.md.
- Don't stop at "mostly works". Finish the stage or report exactly what is still open.
- Keep results in the README status table and commit messages, not in evidence files.

## 7. Delivery and report

Export one STL/3MF per printable part to `print/`, an assembly STEP to `step/`. For print
preparation follow [print preparation](references/print-preparation.md) (shared script, manifest
in project). Check mesh volume against CAD (~0.05%) and watertightness. Reopen the saved file and
confirm its key measurements. README ends with a status table: Geometry / Assembly & motion /
Mesh / Manufacturing, each **PASS**, **FAIL** or **UNVERIFIED** with the measured evidence.
Manufacturing stays UNVERIFIED until a slicer review and a test print. Final reply: same table,
the commit hash, what's still open.

## Reference guidance (load only what's relevant)

| Task | Read |
|---|---|
| New part | `solidcraft-modeling` skill |
| Change existing design | `solidcraft-editing` skill |
| Assemblies, joints, motion, snap-fits, hinges | `solidcraft-mechanisms` skill, [assemblies and couplings](references/assemblies-and-couplings.md) |
| Any geometry work | [geometry traps](references/geometry-traps.md) |
| Load-bearing sections, FDM design | [structural sizing and DfAM](references/structural-sizing-and-dfam.md) |
| Threads, screws, nuts, inserts | [threads and fasteners](references/threads-and-fasteners.md) |
| Parameter walks, STEP comparison, porting | `solidcraft-checking` skill: its scripts and traps only, with throwaway files outside the project |
| Print meshes and plate layout | [print preparation](references/print-preparation.md) |

FDM tolerances and material values are starting assumptions, not calibrated data.
