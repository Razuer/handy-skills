---
name: project-kickoff
description: >-
  Greenfield project kickoff and new repository setup. Use when starting a new
  project or app from scratch, initializing git or .gitignore, creating or
  maintaining AGENTS.md as shared project memory, establishing agent conventions,
  validation commands, documentation habits, commit checkpoint policy, or
  delegating subagents during a project kickoff.
---

# Project Kickoff

Use this skill to start new projects cleanly and make future agent work easier.
The goal is a repo with clear memory, repeatable validation, intentional docs,
and safe checkpoint habits.

If the project already has local instructions, follow them first.

## Kickoff Workflow

1. Inspect the directory and existing files before creating structure.
2. If no repo exists, initialize git only when the user asked for a new project or clearly delegated end-to-end setup.
3. Add a project-appropriate `.gitignore` before generating build artifacts.
4. Create or update `AGENTS.md` early so every agent sees the same rules.
5. Establish the first validation commands and record them in `AGENTS.md`.
6. Add minimal project docs that explain how to run, test, and develop the app.
7. Plan work in small checkpoints; implement, verify, document, then move to the next checkpoint.
8. Commit checkpoints only when the user explicitly asked you to commit or the session instructions permit commits.

## AGENTS.md Project Memory

Treat `AGENTS.md` as shared memory for humans and agents. Keep it concise and
current, not as a long diary.

Include:

- Mission and current product goal.
- Architecture decisions that future agents must preserve.
- Required commands for formatting, building, linting, testing, and running.
- Commit message convention if commits will be used.
- Important file map and ownership boundaries.
- Known pitfalls, temporary constraints, and non-obvious user preferences.
- Rule to update `AGENTS.md` when a durable project convention changes.

Avoid:

- Raw chat transcripts.
- Short-lived todos that belong in a task list.
- Repeating information already better maintained in README, generated docs, or package manifests.

## Delegating Subagents

When launching subagents, include the project rules they need instead of assuming
they will discover them.

Tell subagents:

- Which local docs and `AGENTS.md` sections to read first.
- Which files they may modify and which work is out of scope.
- Which validation command proves their slice is done.
- Whether they are allowed to write code or must stay read-only.
- How their result should be summarized for integration.

## Git And Checkpoints

Use git history as project memory when commits are permitted.

- Choose one commit message style early, usually Conventional Commits.
- Group commits by coherent checkpoints: scaffold, core model, UI shell, persistence, tests, docs.
- Inspect status and diff before committing.
- Do not commit generated junk, secrets, local caches, or unrelated user changes.
- If commits are not permitted, still keep changes grouped mentally and report checkpoint boundaries in the final summary.

## Documentation And Verification

Write docs while the project shape is being decided, not only at the end.

- README should tell a new contributor how to install, run, test, and understand the project.
- Keep app/user docs in sync with user-visible behavior.
- Prefer real tests for behavior that agents might misunderstand later.
- Record exact validation commands in `AGENTS.md` and run the smallest relevant command before broad checks.
- When a tool, framework, or domain-specific workflow is used, load the relevant specialized skill or official docs rather than guessing.

## Minimal AGENTS.md Template

```markdown
# AGENTS.md

## Mission
- What this project is and what quality bar it targets.

## Commands
- Format: `<command>`
- Build/check: `<command>`
- Test: `<command>`
- Run: `<command>`

## Workflow Rules
- Read this file before making changes.
- Update this file when durable project conventions change.
- Keep docs and tests aligned with user-visible behavior.

## Commit Convention
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- Commit only when explicitly requested or permitted.

## Project Notes
- Important architecture decisions, pitfalls, and file map.
```
