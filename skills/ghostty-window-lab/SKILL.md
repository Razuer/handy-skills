---
name: ghostty-window-lab
description: Launch, resize, capture and clean up isolated Ghostty test windows on Hyprland at verified dimensions. Use for real-terminal UI reviews and controlled benchmarks where startup fullscreen, inherited configuration or window geometry would invalidate the result.
---

# Ghostty window lab

Use a fresh, owned window for host-visible terminal rendering checks. This skill targets Lua Hyprland on Linux. It does not alter desktop configuration or replace application control contracts.

Read [references/window-workflow.md](references/window-workflow.md) before launching. Use `scripts/window_lab.py` to launch with rules applied **before mapping**, verify size, resize by owned address, capture only the owned rectangle, and close by checked process identity. Check current Hyprland documentation when porting the helper to another compositor version. Do not improvise global window rules or restart the compositor.

```sh
LAB=$(mktemp -d /tmp/terminal-lab.XXXXXX)
HELPER="$HOME/.codex/skills/ghostty-window-lab/scripts/window_lab.py"
python3 "$HELPER" --root "$LAB" launch --width 980 --height 720 \
  --cwd /absolute/project -- /absolute/project/target/release/app
python3 "$HELPER" --root "$LAB" status
python3 "$HELPER" --root "$LAB" capture --output "$LAB/frame.png"
python3 "$HELPER" --root "$LAB" resize --width 780 --height 540
python3 "$HELPER" --root "$LAB" close
```

Add `--workspace 1` to `launch` to open silently on workspace 1 while the user stays on another workspace. The helper verifies the assigned workspace and does not switch focus. Background status, application control and cleanup work there. Physical captures require the owned workspace to be visible; the helper refuses to capture a different desktop. Agree on a brief workspace visit for visual checks, or use application captures for background state inspection.

The helper isolates all five XDG directories, resolves the Wayland socket before changing the runtime directory, disables saved Ghostty geometry and default config, and applies floating size, position, opacity and no-focus rules at creation. `status` reports actual compositor geometry; requested dimensions alone are not evidence. It preserves inherited environment except explicit `--unset` options; use `--env KEY=VALUE` for application-specific config and transport paths.

Build the executable before launch. For CPU or memory comparisons use a release binary, finish all compilation first, and record binary SHA, viewport rows/columns/pixels, host font and scale. A correctly sized outer window does not establish the size of a split pane.

Inspect captures with the image viewer. A PNG generated inside an application does not establish what Ghostty drew. Use `kitty-rendering-validation` when the claim concerns native Kitty patches, transport or output lifecycle.

Stop the application's owned detached session before closing its host. A multiplexer server and browser can survive the window. Keep the lab path and ownership metadata until cleanup completes; never clean by broad executable-name matching. The helper refuses to target a reused PID or an unrelated window. It retains captures and logs as scratch artifacts; inspect for personal content before sharing.
