# Launch and capture details

## Why launch rules come first

A default Ghostty launch can start fullscreen or inherit a saved size, send a huge first frame, and only then shrink when an agent resizes it. Resizing afterward changes the workload and can leave stale placements. The helper starts a separate Ghostty process and gives `hl.dsp.exec_cmd` per-launch rules before the window maps:

```lua
hl.dispatch(hl.dsp.exec_cmd(command, {
  float=true, size={980,720}, move={20,60}, no_initial_focus=true,
  opaque=true, render_unfocused=true, no_dim=true, no_anim=true
}))
```

This syntax was verified on the local Lua Hyprland. Read the [current window rules](https://wiki.hypr.land/Configuring/Basics/Window-Rules/) and [dispatchers](https://wiki.hypr.land/Configuring/Dispatchers/) before adapting it. On another version, stop if unsupported; do not repair it through persistent user configuration.

Check `hyprctl monitors -j` and choose coordinates inside the intended monitor. `hyprctl clients -j` uses compositor logical coordinates; screenshot pixel dimensions can differ under fractional scaling. Record both rather than silently resampling screenshots for equivalence tests. A window can be obscured even with the right rectangle. Check the screenshot and use an empty area or an authorized focus change if necessary.

The helper writes a private launch specification so Python can pass argv and environment directly, without shell interpolation of environment values. The compositor command contains only a shell-quoted runner path and log path. The specification is deleted after launch; do not publish scratch directories wholesale.

## Work in a separate workspace

Pass `--workspace 1` to launch on workspace 1 without switching the user's current workspace. This adds the per-launch rule `workspace="1 silent"` alongside `no_initial_focus=true`. The helper checks the resulting window's workspace. Use a user-selected workspace, or choose an empty one for an owned test. Numeric positive workspace IDs are supported; named or special workspaces require an explicit extension of the helper.

A hidden workspace is suitable for CLI/control-channel interaction and bounded process checks. An ordinary `grim -g` capture reads the visible monitor, not the hidden window at those coordinates. The helper refuses that capture to avoid collecting the user's other workspace. For physical host screenshot review, ask for or use an already authorized brief visit to the test workspace. Headless application capture remains available without visiting, but cannot prove Ghostty's output.

Inactive workspaces can throttle or stop compositor rendering and browser animation. `render_unfocused=true` does not establish equivalent frame scheduling on a hidden workspace. Use the same visibility conditions for comparisons and run representative Ghostty GPU/animation measurements on a visible test workspace.

## Isolation and application ownership

The original `WAYLAND_DISPLAY` can be a relative socket name. Convert it to an absolute path using the original `XDG_RUNTIME_DIR` before replacing that directory. Keep the original compositor connection available to `hyprctl`. The application receives isolated runtime, config, state, cache and data paths. A separate Ghostty process is essential; a single-instance host could reuse another process and its environment.

For Rozi, read the exact test binary's `skill print` and `api describe`. Use a unique session and the same executable, config and XDG paths for every subsequent CLI command. For example:

```sh
python3 "$HELPER" --root "$LAB" launch --env "ROZI_CONFIG=$LAB/config.toml" \
  -- /absolute/project/target/release/rozi sessions new owned-test
```

Place a deterministic shell/workload in that isolated config according to the current config contract. Do not guess a UI endpoint from socket filenames. Read the embedded control contract and current IDs. A `pty_ready:false` response is a pending pane, not a reason to create another.

Before closing the Ghostty window, run the isolated binary's `sessions kill owned-test` under the same five XDG paths and `ROZI_CONFIG`. Verify any owned producer/browser process exits. Use `finally` cleanup in automated flows. Closing Ghostty alone is insufficient.

For terminal-browser, keep `TERMINAL_BROWSER_CONFIG_DIR` and `TERMINAL_BROWSER_INTEROP_DIR` consistent with the running tab. Its pane discovery depends on the environment of the actual pane; launching from a different shell or scrubbing its multiplexer variables can cause “could not work out which ghostty pane you are in”. Inspect those variables and the binary's current split interface rather than retrying `open` repeatedly. Browser real-page tests use owned tabs, never the user's personal profile.

## Readiness, input and resize

Wait for a bounded readiness condition from the application's control API or workload status file. A window appearing is not application readiness. Use the binary's control contract for input. If testing actual host keyboard routing, use an owned terminal input FIFO or target the owned window explicitly; a control-channel state mutation may exercise a different path.

After resizing, wait for application dimensions to stabilize and for the host's transient resize badge to disappear. On the tested Ghostty, a 2.5-second post-resize wait avoided capturing the badge. Prefer observable readiness over a fixed delay where available. Save original and resized geometry, then return to the original size and check placement retention.

For publication screenshots choose a common window size, font, scale and crop before capture. Capture again at that size when possible; stretched old images conceal layout differences. Use synthetic or scrubbed content. Cropping an opaque owned window avoids recording the surrounding desktop.
