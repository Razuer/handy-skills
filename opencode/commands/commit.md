---
description: Create a commit with a solid message
agent: build
model: openai/gpt-5.4-mini
---

Prepare and execute a commit for the current changes.

First use the conversation context. If it is not clear what was done, inspect the changes with `git status --short`, `git diff --staged`, and `git diff`, and if needed also `git log --oneline -10`.

Based on the actual changes, create a short commit message in one of these formats:
`feat: opis`
`fix: opis`
`docs: opis`
`chore: opis`

If the scope is obvious, you may use `feat(scope): description`, `fix(scope): description`, `docs(scope): description`, or `chore(scope): description`.

The message should be concrete, concise, and describe the result of the changes rather than the intent.

If there are already staged changes, do not modify the staging area unless necessary. If nothing is staged, add only the files that belong to the current work. Do not include unrelated or other people's changes.

At the end, run `git commit` with the prepared message.
