# Environment setup and CLI fallback

Read when MCP is unavailable, disconnected, unable to save, or the task requires setup.
Use existing installation/configuration evidence and current official documentation. Inspect
only relevant configuration fields; avoid printing credentials or unrelated client settings.

## Decide what is missing

| Observed state | Next action |
|---|---|
| MCP tools are available and responsive | Reuse them and their configured backend. |
| Tools exist but report no app connection | Ask whether to repair MCP or use the CLI fallback; follow the user's choice. |
| No SolidCraft MCP tools, but CLI exists | Ask whether to configure MCP or use the CLI fallback; wait before proceeding. |
| Neither tools nor CLI exist | Ask whether to set up MCP or install the CLI for fallback before installation. |
| Required installation or client change cannot be completed | Explain the blocker; ask before switching to the CLI fallback unless it was already chosen. |

MCP is the preferred modeling route. When it is unavailable, stop and ask whether the user wants
MCP configured or repaired, or wants to continue with the CLI fallback. Wait for that choice
before configuration changes or fallback modeling. Brief read-only diagnostics may establish
what is missing. Do not ask again if the current task already explicitly authorizes the route.
After the user chooses, perform the authorized setup without repeated confirmation; do not
assume elevated access or permission for unrelated configuration changes.

## Recover or configure MCP

Discover the current client's supported server-registration interface or documented project
configuration. Inspect the installed CLI's MCP help to determine supported server arguments,
backend choices, and path restrictions. Never assume a client config path or reconnect command.

For a disconnected live bridge, reuse its configured endpoint. Check for an existing app before
launching another instance. Handle unsaved work before restart. Launch detached through the
host's supported mechanism and check readiness with a bounded wait. Stop repeating a failed
launch or reconnect when the same error persists; diagnose it and ask before switching to the
CLI fallback unless the user already authorized that fallback.

When MCP setup is requested or needed and authorized, add or repair a narrowly scoped entry using
the current client interface. Prefer project scope, preserve other servers, and allow only the
selected project path. For a new live bridge, choose a free local endpoint supported by the app
and CLI, then use the same endpoint on both sides. Keep a local bridge local; do not broaden
network exposure. Use a headless backend only when it fits the requested workflow.

Starting `solidcraft-cli mcp` in a shell alone does not register tools with the current agent.
After registration, use the client's supported refresh/reconnect and verify a read-only status or
inspection call. If only the user can refresh the session, provide that exact step and wait;
continue through the CLI only if the user has chosen that fallback. Never claim that MCP works
until a tool call succeeds.

If the modeling request does not authorize a needed configuration change, or host policy requires
approval, prepare the minimal entry and explain the specific remaining action. Offer the CLI
fallback, but wait for the user's choice before using it. A working CLI does not override the
MCP preference or authorize an automatic fallback.

## Use the CLI directly

Use this modeling route only when the user has explicitly selected the CLI fallback.

Read the installed version's help and command schemas. Some versions print usage with a nonzero
exit status for `--help`; inspect the output before concluding the executable is broken.
Do not assume a command named `exec` controls the user's live app.

When the installed version supports these options, an offline build can use:

```text
solidcraft-cli run <scratch/build.json> --save <project/name.json> --out <project/step/name.step>
solidcraft-cli run <scratch/edit.json> --in <project/name.json> --save <scratch/name-next.json>
solidcraft-cli eval <project/name.json>
solidcraft-cli snapshot <project/name.json> --out <scratch/preview.png>
```

Angle-bracket items are placeholders, not literal commands. Get the script format from the
installed schemas or official examples. Use resolved paths and proper shell quoting. Scripts and
staging files live in the scratchpad, never in the project. Save an edit to a staging file,
validate it, then replace the project design; the git commit is the recoverable prior revision.
Do not enable options that accept failed features just to obtain an output file.

CLI builds can use a separate document/backend from the open GUI. Do not overwrite a file that
has unsaved changes open in the app. If the user requires live modeling, restore that route
before model mutations; continue location selection, calculations, and script preparation while
blocked. Without a live-only requirement, explain the CLI workflow and proceed once the user
has selected it. Verify saved designs and exports with the same checks used for MCP.

## Resolve save access

Create the chosen directory before saving. Verify both filesystem access and the tool's allowed
paths, accounting for remote/container mappings. If direct saving is blocked:

1. Prefer an existing supported download/transfer or CLI route into the chosen project. Verify
   final file existence and integrity. Prefer reopening/inspecting the native file to confirm
   design identity and key properties; compare source and destination checksums when both are
   accessible. If native inspection is unavailable, report the evidence and remaining uncertainty.
2. If access configuration is necessary and authorized, add only the project path using the
   client's supported interface and reconnect. Preserve existing entries and restrictions.
3. If neither route is available, explain the exact access change needed. Keep the intended
   project destination; do not silently substitute a demo folder or broaden access to all files.

When no read-only access check exists, test a non-overwriting save of a new task-owned document
before substantial modeling. Do not overwrite or replace unrelated live work for this test.
A server's temporary directory may be a transfer source, never the only permanent deliverable.

## Installation and updates

Identify the OS and existing distribution method before choosing commands. Use current official
instructions for that platform, not an assumed package manager or source checkout. Install/update
only what the task needs, preserve existing settings, and avoid unrelated system upgrades. If
privileges or downloads are unavailable, identify the missing requirement rather than retrying
unboundedly. After an update, reconnect through the current client and verify the installed CLI
and server actually use the intended version.
