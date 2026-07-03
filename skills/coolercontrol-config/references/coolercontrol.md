# CoolerControl Configuration Reference

Use this reference when editing or diagnosing CoolerControl. Prefer precise, minimal changes and validate before installing.

## Key Files

Daemon config directory:

```text
/etc/coolercontrol/
```

Important files:

```text
/etc/coolercontrol/config.toml       # profiles, functions, device settings, daemon settings
/etc/coolercontrol/config-ui.json    # UI layout/state, usually avoid manual edits
/etc/coolercontrol/modes.json        # saved modes
/etc/coolercontrol/alerts.json       # alerts
/etc/coolercontrol/calibrations.json # calibration data
```

Do not read or expose:

```text
/etc/coolercontrol/.passwd
/etc/coolercontrol/coolercontrol.key
```

Daemon service:

```text
coolercontrold.service
```

Useful commands:

```bash
systemctl is-active coolercontrold.service
systemctl is-enabled coolercontrold.service
coolercontrol --version
coolercontrold --version
sensors
journalctl -u coolercontrold.service --since '1 minute ago' -p warning..alert
```

Root-only validation:

```bash
coolercontrold --config
```

## Manual Edit Pattern

Use a temp copy first:

```bash
cp '/etc/coolercontrol/config.toml' '/home/razuer/.cache/tmp/opencode/coolercontrol-config.toml'
```

Validate TOML syntax:

```bash
python -c 'import tomllib; tomllib.load(open("/home/razuer/.cache/tmp/opencode/coolercontrol-config.toml", "rb"))'
```

Show the diff before installing:

```bash
diff -u '/etc/coolercontrol/config.toml' '/home/razuer/.cache/tmp/opencode/coolercontrol-config.toml'
```

Install with backup, stop/start, and root validation when immediate application is desired:

```bash
pkexec /bin/sh -c 'set -eu; backup="/etc/coolercontrol/config.toml.opencode-backup-$(date +%Y%m%d%H%M%S)"; cp "/etc/coolercontrol/config.toml" "$backup"; systemctl stop coolercontrold; install -o root -g root -m 0644 "/home/razuer/.cache/tmp/opencode/coolercontrol-config.toml" "/etc/coolercontrol/config.toml"; if coolercontrold --config; then systemctl start coolercontrold; printf "Installed CoolerControl config. Backup: %s\n" "$backup"; else cp "$backup" "/etc/coolercontrol/config.toml"; systemctl start coolercontrold; printf "CoolerControl validation failed; restored backup: %s\n" "$backup"; exit 1; fi'
```

Install without daemon restart when queuing for next boot or avoiding a premature hardware write:

```bash
pkexec /bin/sh -c 'set -eu; backup="/etc/coolercontrol/config.toml.opencode-backup-$(date +%Y%m%d%H%M%S)"; cp "/etc/coolercontrol/config.toml" "$backup"; install -o root -g root -m 0644 "/home/razuer/.cache/tmp/opencode/coolercontrol-config.toml" "/etc/coolercontrol/config.toml"; if coolercontrold --config; then printf "Installed queued CoolerControl config. Backup: %s\n" "$backup"; else cp "$backup" "/etc/coolercontrol/config.toml"; printf "CoolerControl validation failed; restored backup: %s\n" "$backup"; exit 1; fi'
```

## Config Schema Essentials

`[device-settings.<device_uid>]` maps channels to fixed speeds, profiles, lighting, or LCD settings.

Profile assignment:

```toml
[device-settings.<device_uid>]
fan2 = { profile_uid = "profile-uid" }
```

Default/unmanaged profile:

```toml
profile_uid = "0"
```

Graph profile:

```toml
[[profiles]]
uid = "case-cpu-curve"
name = "Case CPU Curve"
p_type = "Graph"
speed_profile = [[0.0, 0], [70.0, 0], [70.1, 20], [80.0, 45], [90.0, 75], [100.0, 100]]
function_uid = "function-uid"
temp_source = { temp_name = "temp1", device_uid = "cpu-device-uid" }
temp_min = 0.0
temp_max = 100.0
```

Mix profile:

```toml
[[profiles]]
uid = "case-cpu-gpu-max"
name = "Case CPU/GPU Max"
function_uid = "0"
p_type = "Mix"
member_profile_uids = ["case-cpu-curve", "case-gpu-curve"]
mix_function_type = "Max"
```

Supported mix function names in current CoolerControl 4.3.x schema:

```text
Min
Max
Avg
Diff
Sum
```

Standard function with delay/hysteresis:

```toml
[[functions]]
uid = "8s-activation-delay"
name = "8s Activation Delay"
f_type = "Standard"
duty_minimum = 1
duty_maximum = 100
step_size_min_decreasing = 0
step_size_max_decreasing = 0
response_delay = 8
deviance = 0.0
only_downward = false
threshold_hopping = true
bypass_min_at_extremes = true
```

Field notes:

- `function_uid` is required on profiles in newer CoolerControl.
- `duty_minimum` must be at least `1` for API validation.
- `response_delay` is seconds.
- `deviance` is temperature threshold in degrees.
- `only_downward = false` delays both ramp-up and ramp-down.
- `bypass_min_at_extremes = true` helps exact `0%` and `100%` targets apply even with step-size filtering.
- Standard function delay is applied to Graph profiles. For a Mix profile, put the Standard function on the member Graph profiles, then mix their output.

## Case Fans From CPU OR GPU

Goal: case fans turn on when GPU is above a threshold OR CPU is above a threshold for more than N seconds.

Implement as:

1. CPU Graph profile using CPU temperature source and Standard delay function.
2. GPU Graph profile using GPU edge temperature source and the same Standard delay function.
3. Mix profile with both graph profiles and `mix_function_type = "Max"`.
4. Assign the Mix profile to the actual case fan channel.

Example thresholds:

```toml
# CPU >70C
speed_profile = [[0.0, 0], [70.0, 0], [70.1, 20], [80.0, 45], [90.0, 75], [100.0, 100]]

# GPU >65C
speed_profile = [[0.0, 0], [65.0, 0], [65.1, 20], [75.0, 35], [85.0, 55], [95.0, 80], [100.0, 100]]
```

Use `70.1` or `65.1` as the first non-zero point to express strict “above threshold” behavior with a continuous fan curve.

## GPU Zero-RPM Curve

Goal: GPU fan is `0%` below `70C` and starts above it.

```toml
[[profiles]]
uid = "gpu-fans"
name = "GPU Fans"
p_type = "Graph"
speed_profile = [[0.0, 0], [70.0, 0], [70.1, 30], [80.0, 45], [90.0, 70], [100.0, 100]]
temp_source = { temp_name = "temp1", device_uid = "discrete-gpu-device-uid" }
temp_min = 0.0
temp_max = 100.0
function_uid = "0"
```

Only assign this as a normal software Graph if the GPU fan PWM node is writable. On RDNA3/4 cards, prefer the firmware-controlled profile setting below when `gpu_od/fan_ctrl/fan_curve` is available, because legacy `/sys/class/hwmon/.../pwm1` can remain read-only even after Overdrive is enabled.

Firmware-controlled RDNA profile config shape:

```toml
[device-settings.<gpu-device-uid>]
fan1 = { profile_uid = "gpu-fans" }

[settings.<gpu-device-uid>]
name = "amdgpu"
disable = false

[settings.<gpu-device-uid>.channel_settings]
fan1 = { disabled = false, extension = { hw_fan_curve_enabled = true } }
```

The Graph profile must use the same GPU UID as its temp source and `temp_name = "temp1"`. Firmware curve point count is limited by `/sys/class/drm/.../gpu_od/fan_ctrl/fan_curve`; on this machine it is 5 points. If `fan_zero_rpm_stop_temperature` is absent, exact `0% until 70C` cannot be expressed through CoolerControl's firmware curve path; use the firmware minimum, observed here as `15%`, and rely on stock zero-RPM behavior if the firmware still applies it.

## AMDGPU Fan Control

Symptoms of missing support:

```text
PWM fan at /sys/class/hwmon/hwmonX/pwm1 is NOT writable
Error applying Graph/Mix Profile calculated duty ... Unable to set PWM value ... Permission denied
```

Check PWM permissions:

```bash
stat -c '%A %U:%G %n' /sys/class/hwmon/hwmon*/name /sys/class/hwmon/hwmon*/pwm1 /sys/class/hwmon/hwmon*/pwm1_enable
```

Map AMDGPU hwmon nodes carefully; hwmon numbers can change across boot:

```bash
for d in /sys/class/hwmon/hwmon*; do if [ -r "$d/name" ]; then printf '%s ' "$d"; tr -d '\n' < "$d/name"; printf '\n'; fi; done
```

For RDNA3/4, CoolerControl docs recommend enabling the `PP_OVERDRIVE_MASK` bit. Compute the minimal required kernel parameter from the current mask:

```bash
sh -c 'printf "current=%s\n" "$(cat /sys/module/amdgpu/parameters/ppfeaturemask)"; printf "needed=amdgpu.ppfeaturemask=0x%x\n" "$(($(cat /sys/module/amdgpu/parameters/ppfeaturemask) | 0x4000))"'
```

On this machine, the observed values were:

```text
current=0xfff7bfff
needed=amdgpu.ppfeaturemask=0xfff7ffff
```

Prefer the minimal OR result over blanket `0xffffffff` unless the user explicitly wants all PowerPlay bits enabled.

The parameter takes effect only after reboot. Check after reboot:

```bash
cat /sys/module/amdgpu/parameters/ppfeaturemask
```

## Limine Boot Flag Pattern

This machine uses Limine with config at:

```text
/boot/limine.conf
```

The active entry has a `cmdline:` line under the current kernel entry. Add the AMDGPU parameter only to the active entry unless asked to modify snapshots or fallback entries.

Example active line after edit:

```text
cmdline: quiet splash ... rootfstype=btrfs amdgpu.ppfeaturemask=0xfff7ffff
```

Temp-edit pattern:

```bash
cp '/boot/limine.conf' '/home/razuer/.cache/tmp/opencode/limine.conf'
diff -u '/boot/limine.conf' '/home/razuer/.cache/tmp/opencode/limine.conf'
```

Install with backup:

```bash
pkexec /bin/sh -c 'set -eu; backup="/boot/limine.conf.opencode-backup-$(date +%Y%m%d%H%M%S)"; cp "/boot/limine.conf" "$backup"; install -o root -g root -m 0755 "/home/razuer/.cache/tmp/opencode/limine.conf" "/boot/limine.conf"; /usr/lib/limine/limine-entry-tool --tree 2 >/dev/null; printf "Installed Limine config. Backup: %s\n" "$backup"'
```

Do not reboot unless the user asks. Tell the user that the parameter is inactive until reboot.

## Local Machine Mapping Observed

Use this as a starting hypothesis only; always re-check current config and sensors.

Known from prior session:

```text
CPU: AMD Ryzen 7 9700X, UID 78d975e6e52d8190209d0c129492415449a43d59c0fba59031c2cbd54cdf9e98, temp1 = Tctl
Motherboard controller: it8686, UID fa49f4645cba12961942172e0455e53675b4adbc2ed077a740863e40266e9803
Discrete GPU: amdgpu, UID 97910386cac9bfce54b2c224e4aaef42cd953440cb57f1ff5ff46ac183bf338e, temp1 = edge, fan1 = GPU fan
Case fans: it8686 fan2
AIO fans: it8686 fan1
AIO pump: it8686 fan6
```

Current intended configuration after the prior work:

```text
it8686 fan1 -> CPU profile, AIO fans
it8686 fan2 -> Case CPU/GPU Max mix profile, case fans
it8686 fan6 -> Default/unmanaged, AIO pump
amdgpu fan1 -> GPU Fans profile, firmware-controlled RDNA curve enabled
```

## Post-Change Checks

After a restart:

```bash
systemctl is-active coolercontrold.service
journalctl -u coolercontrold.service --since '1 minute ago' -p warning..alert
sensors
```

Expected useful observations:

- Case fan channel at `0 RPM` while both relevant temps are below thresholds.
- AIO fan and pump unchanged unless intentionally edited.
- No fresh `Error applying Graph/Mix Profile calculated duty` messages.
- For GPU fan control, no `Permission denied` on `amdgpu:fan1` after reboot with active `ppfeaturemask`.

If GPU fan control still fails after reboot, suspect RDNA4 driver/firmware support rather than CoolerControl TOML syntax.
