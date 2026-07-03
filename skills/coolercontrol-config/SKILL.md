---
name: coolercontrol-config
description: Configure CoolerControl daemon profiles, fan curves, Mix profiles, Standard functions, AMDGPU fan control, and Limine boot flags. Use when editing `/etc/coolercontrol/config.toml`, diagnosing `coolercontrold`, tuning CPU/GPU/case fan behavior, setting zero-RPM GPU curves, or handling AMDGPU `ppfeaturemask`/read-only PWM issues.
---

# CoolerControl Config

## Workflow

Use this skill for safe CoolerControl configuration changes. Prefer the UI/API when practical, but manual TOML edits are acceptable when the user asks for direct config changes or the UI is unavailable.

1. Inspect before editing.
2. Avoid secrets: do not read `/etc/coolercontrol/.passwd` or `coolercontrol.key`.
3. Identify devices and channels from `/etc/coolercontrol/config.toml`, `sensors`, and `journalctl`.
4. Build edits in a temp copy first.
5. Validate TOML syntax and `coolercontrold --config` as root before relying on the change.
6. Back up root-owned files before installing.
7. Restart `coolercontrold` only when safe; avoid restart if a queued setting would hit unsupported hardware before a needed reboot.

Read `references/coolercontrol.md` for the exact config schema, fan-curve patterns, AMDGPU notes, validation commands, and local-machine mapping.

## Safety Rules

- Treat `/etc/coolercontrol/config.toml` as root-owned production config.
- Create timestamped backups before installing changes.
- Leave pumps and AIO fans alone unless the user explicitly identifies them.
- Do not assume `fan1` means CPU fan or case fan; map channels from current config and `sensors`.
- For AMDGPU, read-only `/sys/class/hwmon/.../pwm1` means CoolerControl cannot apply manual GPU fan duty until driver support/Overdrive is enabled and active after reboot.
- If changing kernel boot parameters, edit only the active boot entry unless the user wants snapshots/fallbacks changed too.

## Common Targets

- Case fans reacting to CPU OR GPU: create two `Graph` profiles with their own temp sources and functions, then a `Mix` profile with `mix_function_type = "Max"`, and assign the Mix profile to the case fan channel.
- Delayed activation: use a `Standard` function on the Graph profiles with `response_delay = N`, `deviance = 0.0`, `only_downward = false`, and `bypass_min_at_extremes = true`.
- GPU zero-RPM below a threshold: graph profile with `0%` through the threshold and a first non-zero point just above it, but only assign it if GPU fan control is writable/supported.
- AMD RDNA3/4 manual fan control: enable the `PP_OVERDRIVE_MASK` bit using `amdgpu.ppfeaturemask=$(current | 0x4000)` and reboot.

## Verification

- Confirm TOML parses before install.
- Confirm `coolercontrold --config` succeeds as root after install.
- Confirm `systemctl is-active coolercontrold.service` is `active` when a restart is performed.
- Check `journalctl -u coolercontrold.service --since '1 minute ago' -p warning..alert` after restart.
- Use `sensors` to confirm RPM/duty behavior.

After creating or editing this skill itself, remind the user to restart OpenCode for the new skill metadata to be loaded.
