---
name: chatgpt-browser
description: Drive the user's logged-in ChatGPT (chatgpt.com in terminal-browser) as a second-opinion agent for brainstorming, reviews, diffs, and implementations. Use when the user asks to "ask ChatGPT", get a second opinion, brainstorm with ChatGPT, use ChatGPT as an agent, or mentions gp + chatgpt. Requires a running terminal-browser with chatgpt.com open.
---

# chatgpt-browser

Drive the ChatGPT web app running in terminal-browser as a free second model:
brainstorming, second opinions, code review of pasted context, and
implementations. It reads GitHub repos itself through its built-in browsing,
and accepts attached files.

## Prerequisites

- `terminal-browser` installed and a browser open with **chatgpt.com**, user
  logged in (the skill uses the user's existing session; never handle their
  credentials).
- `python3` available.

## Quick start

```bash
export GP_SESSION=$(gp new | sed 's/export GP_SESSION=//')   # clean session
gp attach ./context.diff                                     # optional files first
gp send "Review this diff. Reply ONLY with JSON {\"verdict\":string,\"issues\":[string]}"
gp wait && gp read
```

`gp` lives in this skill's `bin/`. If it is not on PATH, call it by full path
(`~/.agents/skills/chatgpt-browser/bin/gp`) once; then prefer exporting
`PATH="$PATH:$(dirname ...)/bin"` for the session.

## Commands

| Command | Purpose |
| --- | --- |
| `gp new` | Clean session (new tab). Prints `export GP_SESSION=key:tab`. |
| `gp status` | Message count, busy flag, session id, URL. |
| `gp send T` / `gp send -` | Fill composer and submit; `-` reads stdin for long prompts. |
| `gp attach F...` | Attach files BEFORE sending (repeatable per turn). |
| `gp wait` | Block until streaming finishes (`GP_TIMEOUT`, default 300s). |
| `gp read` | Last assistant message. `-a` whole thread, `-n N` message N. |
| `gp url` | Resumable conversation permalink. Save it to continue later. |
| `gp resume URL` | Reopen a saved conversation in the current tab. |

Session targeting: export `GP_SESSION=browserKey:tabId` after `gp new`;
otherwise gp picks the active chatgpt.com tab automatically.

## How to use it well

**Output contracts.** Put the format in the prompt. It honors strict shapes,
for example "reply ONLY with minified JSON matching {...}" or "reply with one
fenced diff block and nothing else". Then parse the output programmatically.

**Context sizing.** Attach a few files, not projects. Good units: one diff, one
module, one error log, one design doc. For repo-level questions, share GitHub
URLs and ask it to browse them instead of pasting everything.

**Multi-turn.** Keep using `send`/`wait`/`read` on the same GP_SESSION; it
remembers the thread. For long-running collaborations, save `gp url` output and
`gp resume` it in later sessions.

**Reasoning mode.** The account's selected reasoning effort applies (the UI
button next to the composer). High is slower; raise GP_TIMEOUT accordingly.

## Etiquette and safety

- This types into the user's real ChatGPT account history. Only send what the
  user agreed to share; never paste secrets, keys, or private data.
- One conversation at a time per tab; do not spam sends while busy (`gp wait`
  first).
- If the tab shows a login/captcha screen, stop and tell the user; do not try
  to authenticate on their behalf.
- Close nothing you did not open. Leave the browser tab running unless asked.

## Troubleshooting

- `no chatgpt.com tab found`: run `terminal-browser open https://chatgpt.com`.
- `send-button` click does nothing mid-generation: wait for the current reply.
- Empty `gp read` right after `wait`: generation finished before polling;
  rerun `gp read`.
