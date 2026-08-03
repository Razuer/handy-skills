# handy-opencode

[OpenCode](https://opencode.ai) skills and agents. Not affiliated with OpenCode.

## Agents

Pick one pack. Install only what you use.

### Skein

Minimal end-to-end workflow. Newest default.

1. **Plan** (when asked): parallel explorers gather facts → sidekick review challenges edges/complexity → Skein synthesizes one plan.
2. **Build**: independent slices via `skein-build`; coupled work stays with Skein.
3. **Verify + review**: Skein integrates, runs real checks, then one fresh `skein-review`.
4. **Fix**: owned fixes go back through the same builder `task_id`; Skein handles cross-cutting work.
5. **Ship**: short human summary; checkpoint commits only for complex milestones (Skein only).

Style: understand first, then YAGNI / reuse / stdlib / native / deps / one-line / minimum. Important tests only. No ceremony.

### Athena

Planning only. Explores the repo (via `athena-explore` when needed) and writes a concrete implementation plan. Does not implement.

### Hermes

Execution. Takes a plan, splits it into dependency-ordered workstreams, runs independent slices in parallel (`hermes-build`), scouts with `hermes-explore`, reviews with `hermes-review`, then integrates and verifies.

### Atlas

Maps a repository into a sparse root + nested `AGENTS.md` network. Uses `cartographer` for subtree discovery. Start with the `agents-network` command.

## Install

```bash
./install.sh
```

Interactive by default. Choose skills, agents, and/or commands. If you pick agents, you choose which packs.

Symlinks into `~/.config/opencode/` so repo updates apply immediately.

```bash
./install.sh --skills
./install.sh --agents              # all packs
./install.sh --agent skein
./install.sh --agent skein --agent atlas
./install.sh --commands
./install.sh --all
./install.sh --all --force
```

```bash
OPENCODE_DIR=/path/to/opencode ./install.sh --agent skein
```
