---
description: Create a DFS network of root and nested AGENTS.md files
agent: atlas
---

Create or refine a repository-specific network of `AGENTS.md` files for the target project.

Target path: `$ARGUMENTS`

If no target path is provided, use the current project root.

Use the DFS AGENTS.md workflow:

- First check whether the target root already has `AGENTS.md` and preserve any existing useful instructions.
- Explore the project enough to identify meaningful subsystem boundaries before writing.
- Delegate recursive directory exploration to `cartographer` subagents.
- Let cartographers go deeper before summarizing upward, carrying inherited context into child cartographers.
- Create or update nested `AGENTS.md` files only in directories where local guidance is genuinely useful.
- After all subtree summaries return, write or update the root `AGENTS.md` last as the concise project-wide guide.
- Keep root guidance high-level and leave subsystem details to nested `AGENTS.md` files.
- Use durable headings: `# Project Agent Guide` at the root and `# Agent Guide: <path>` for nested files.
- Avoid volatile progress/status claims, duplicated command boilerplate, and brittle claims that a subsystem will always live in one file.
- Do not commit changes.
