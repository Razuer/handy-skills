---
name: kitty-rendering-validation
description: Validate Kitty image rendering in terminal multiplexers using actual outgoing commands, host screenshots, lifecycle regressions and controlled release measurements. Use for native patch forwarding, image overlays, redraw/reconnect defects or graphics performance comparisons in tui-lipan and Rozi.
---

# Kitty rendering validation

Establish both what reaches the host and what the host draws. A passing geometry test, a scene labelled “native”, or a capture PNG can still hide a composed fallback.

Read [references/correctness.md](references/correctness.md) for fixtures and lifecycle checks. For performance, also read [references/measurement.md](references/measurement.md). Use the `ghostty-window-lab` skill for verified, isolated windows. Use the repository's visual/control skill for app interaction.

Useful maintained fixtures:

- tui-lipan `examples/terminal_patch_layers.rs`, built with `--features terminal-images`: `t` opaque text, `b` opaque block, `n` image only, `q` quit. It includes a transparent popup host.
- Rozi `tools/graphics-patches.py`: paced reusable-file patches over a static base, toolbar and translucent moving patch; `--full` sends full-frame traffic. `--status` reports actual pane size and progress.
- Actual HostBackend output tests in tui-lipan's `terminal_damage_tests.rs` cover unrelated partial repaints, shared-anchor uploads and layered ordinary widgets. Native lease/cache tests also inspect host output and flush acknowledgement.

Verify those files and controls in the current checkout before using them. Build serially according to repository instructions. Reuse the existing fixtures instead of rebuilding a browser scene for every graphics question.

`scripts/kitty_wiretap.c` is an optional Linux write/writev counter for one exact executable path. Read the measurement reference before compiling or injecting it. It counts successful TTY output only, recognizes split APC headers, and stores counters without payloads. It changes the execution environment and is unsuitable for final CPU comparisons. `scripts/inspect_counters.py` reads its output. The native/composed distinction is specific to the current tui-lipan protocol and must be checked against the renderer when that protocol changes.

`scripts/compare_png.py` compares equal-sized captures in an explicit rectangle and can save a difference image. It refuses to rescale mismatched captures. `scripts/sample_processes.py` produces bounded Linux CPU/RSS samples for labelled PIDs, rejects identity changes, and optionally includes PSS. Both write only requested scratch artifacts.

Retain executable revisions, actual viewport sizes, commands, results and limitations. Put evidence in the repository's existing performance audit location when requested; keep temporary captures, logs and runtime files outside tracked source. Do not relabel historical measurements as results for a newer revision.
