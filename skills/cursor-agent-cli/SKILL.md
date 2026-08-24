---
name: cursor-agent-cli
description: "Operate Cursor's `agent` CLI for interactive or scripted conversations, session resume, models, permissions, workspaces, and rozi-pane delegation. Use whenever the user asks to run, message, delegate to, resume, automate, or communicate with Cursor Agent or the `agent` command, including requests that combine Cursor Agent with rozi. Do not use for unrelated commands named agent."
compatibility: "Requires the Cursor Agent `agent` executable. Rozi integration also requires a rozi-managed pane and the separately loaded rozi skill."
---

# Cursor Agent CLI

Use Cursor's `agent` executable to delegate work or hold a conversation with Cursor Agent. Treat the installed CLI as the source of truth because its options change between releases.

## Start here

1. Confirm the executable and current syntax:

   ```bash
   command -v agent
   agent --help
   ```

2. Check authentication before starting a substantial task:

   ```bash
   agent status
   ```

3. If authentication is missing, run `agent login`. Do not ask for or expose an API key when the normal login flow is available.

4. Choose scripted or interactive operation. Prefer scripted `--print` mode when only the response or task result matters. Use interactive mode in a rozi pane when the user wants a visible, ongoing conversation.

## Scripted operation

Use `--print` for a single request. Set the workspace explicitly when the task concerns a project.

```bash
agent --print --trust --workspace "/path/to/project" "Explain the failing test without editing files."
```

Use a read-only mode for analysis:

```bash
agent --print --mode ask --trust --workspace "/path/to/project" "Answer this question."
agent --print --mode plan --trust --workspace "/path/to/project" "Plan this change."
```

Omit `--mode` when Cursor should be able to edit files or run tools. `--print` still has tool access. Do not assume it is read-only.

Choose output for the consumer:

- `text` for a human-readable final response.
- `json` for one structured result.
- `stream-json` for event processing, session IDs, usage data, or incremental monitoring.
- Add `--stream-partial-output` only with `--print --output-format stream-json` when partial text deltas are useful.

Example:

```bash
agent --print --output-format stream-json --trust "Reply with a short status."
```

Preserve JSON as data. Do not scrape terminal formatting when a JSON output mode is available.

## Sessions

Create a chat when later turns must target an unambiguous conversation:

```bash
agent create-chat
agent --resume <CHAT_ID> --print --trust "First message"
agent --resume <CHAT_ID> --print --trust "Follow-up message"
```

Reuse the exact ID returned by the CLI or the `session_id` from `stream-json`. Prefer `--resume <CHAT_ID>` over `--continue` in automation because `--continue` may select an unrelated latest session.

Use `agent ls` for an interactive session picker and `agent resume` to resume the latest chat interactively. Check each command's `--help` before scripting subcommands whose output is not documented.

## Trust and approvals

- `--trust` confirms that Cursor may access the selected workspace. Use it only when the user requested work in that directory and the directory is trusted.
- `--force` and `--yolo` allow commands unless explicitly denied. Do not use them merely to avoid prompts. Use them only when the user explicitly wants autonomous execution and the task warrants that access.
- `--auto-review` is safer than blanket force when Cursor should classify tool calls and request approval for riskier actions.
- `--sandbox enabled` adds isolation when supported. Do not silently disable an existing sandbox.
- `--approve-mcps` approves every configured MCP server. Avoid it unless the user asked for those servers or their tools are required and understood.
- Interactive startup may show an MCP approval screen. Approve only required, known servers. Continuing without approval is appropriate when the task needs none of them.

Never pass secrets in prompts or command arguments when an environment variable or login flow exists. Avoid printing `CURSOR_API_KEY`.

## Models and workspaces

Inspect available models instead of guessing names:

```bash
agent models
```

Use `--model <MODEL>` only when the user specifies a model or the task has a concrete model requirement. Quote parameterized model strings.

Use `--workspace <PATH_OR_NAME>` to set the main workspace and repeat `--add-dir <PATH>` only for additional directories the task needs. Use `--worktree [NAME]` for isolated work in a Git repository when the user requests isolation or concurrent implementation. Read `agent --help` before combining worktree options.

## Rozi integration

When the user asks to use rozi, load and follow the rozi skill as well as this skill. Run `rozi skill print` if those instructions are not already loaded. The rozi skill owns endpoint checks, pane targeting, focus behavior, and pane safety.

After the rozi preflight succeeds, start Cursor Agent without stealing focus unless the user asks to see the pane immediately:

```bash
rozi --socket "$ROZI_SOCKET" split \
  --cwd "/path/to/project" \
  --title "Cursor Agent" \
  --argv agent --workspace "/path/to/project" --trust
```

Read the numeric pane ID and `pty_ready` from the JSON response. Never infer the pane ID from layout order. Send a prompt to that exact pane in two operations:

```bash
rozi --socket "$ROZI_SOCKET" send-text --target <PANE_ID> 'Inspect the failing tests and explain the root cause.'
rozi --socket "$ROZI_SOCKET" send-keys --target <PANE_ID> Enter
```

Cursor's interactive editor may treat a newline inside `send-text` as pasted text rather than submission. Send `Enter` separately.

Capture output without changing focus:

```bash
rozi --socket "$ROZI_SOCKET" capture-pane \
  --target <PANE_ID> \
  --scrollback 200 \
  --format json
```

Wait long enough for the response, then capture again if the UI still shows work in progress. Do not repeatedly resend the prompt. If startup is blocked by workspace trust or MCP approval, inspect the pane, make the narrowest safe selection, wait for the main prompt to appear, and only then send the task.

For an existing conversation, replace the final command with:

```bash
--argv agent --resume <CHAT_ID> --workspace "/path/to/project" --trust
```

Leave a pane running when the user wants an ongoing conversation. Stop or close only panes this agent created, and only when requested or clearly temporary under the rozi safety rules.

## Verification

For communication tests, ask for a unique harmless token, then verify the exact token in structured output or captured pane text. To verify session continuity, resume the same chat ID and ask Cursor to identify the prior token. Do not use a real project modification as a handshake.

Report the operation mode, chat ID when useful, rozi pane ID when used, and whether Cursor returned the expected result. Do not claim success from command acceptance alone; inspect Cursor's response.

## Troubleshooting

- Workspace trust prompt: rerun with `--trust` only after confirming the intended workspace.
- MCP approval prompt: approve known required servers or continue without them.
- Prompt appears in the interactive editor but does not run: send `Enter` separately with `rozi send-keys`.
- Wrong conversation risk: use `--resume <CHAT_ID>`, not `--continue`.
- Unknown model: run `agent models` or `agent --list-models`.
- Changed syntax: rerun `agent --help` and the relevant subcommand's `--help`; update the command rather than relying on this skill's examples.
