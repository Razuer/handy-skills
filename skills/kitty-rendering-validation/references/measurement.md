# Commands, traffic and performance

## Optional command counter

Linux diagnostic builds can use the bundled `kitty_wiretap.c`. It hooks libc `write` and `writev`, filters by **exact executable path**, and counts only successfully written TTY bytes. Headers split across writes are recognized. It emits no pixel payloads or terminal text. Programs using direct syscalls or other output APIs can bypass it; it is diagnostic evidence within that scope.

```sh
SKILL="$HOME/.codex/skills/kitty-rendering-validation"
mkdir -m 700 "$LAB/counters"
cc -shared -fPIC -O2 -Wall -Wextra -Werror -pthread \
  "$SKILL/scripts/kitty_wiretap.c" -o "$LAB/wiretap.so"
```

Pass these environment entries to the owned window helper before its `--` executable delimiter:

```sh
--env "LD_PRELOAD=$LAB/wiretap.so" \
--env "KITTY_LAB_EXE=/absolute/project/target/release/rozi" \
--env "KITTY_LAB_COUNTER_DIR=$LAB/counters"
```

The exact executable filter prevents Ghostty and browser children from contributing. Rozi CLI/server processes with the same executable may produce additional files; identify the GUI client by its parent being the owned Ghostty PID, then read that PID's file:

```sh
python3 "$SKILL/scripts/inspect_counters.py" "$LAB/counters/CLIENT_PID.counts"
```

Counters are five native-endian uint64 values, updated through mmap: TTY bytes, successful write/writev calls, `a=T` commands, native `a=p` commands, and `c=` composed placements. Read after a bounded interval or process exit. Live reads are approximate across fields. This counts written command headers; it does not prove Ghostty consumed them, correct command ordering, full transmission completion, or flush acknowledgement. Use backend tests and host screenshots for those claims.

The interceptor serializes tracked writes and scans their contents. Use it for correctness or a separate traffic sample. **Remove LD_PRELOAD for CPU comparisons.** Do not preload the user's normal processes or install it globally. A full wire log is useful for command order tests but contains terminal text and payload paths; retain privately, scrub before sharing, and bound its size.

## Controlled measurements

Build release binaries and stop compilation before sampling. Keep actual pane rows/columns/pixels, font, monitor scale, producer rate, URL/state and configuration equal. The outer Ghostty size alone is insufficient. Reuse the same executable for composed/native mode comparisons when possible. Record framework revision and mode, producer status and observed native eligibility.

Measure client, session server, browser and Ghostty separately. On Linux use `/proc/PID/stat` CPU tick deltas over monotonic elapsed time and `/proc/PID/status` VmRSS. Check process start time before and after sampling so a reused PID cannot contaminate the result. Normalize CPU to one core as `100 * tick_delta / SC_CLK_TCK / elapsed_seconds`, allowing values above 100 for multithreaded processes. RSS and allocator retention are not proof of a memory leak; distinguish live scene storage, retired resources, high-water allocator pages, and unbounded growth. PSS from smaps_rollup is useful when shared file-backed pages make RSS ambiguous.

The bundled sampler accepts process labels and exact PIDs:

```sh
python3 "$SKILL/scripts/sample_processes.py" --duration 15 --interval 1 \
  --output "$LAB/sample.json" client=1234 server=1235 ghostty=1236
```

Add `--pss` when shared-page attribution matters and permissions allow reading `smaps_rollup`. Process exit or inaccessible memory data fails the sample rather than silently replacing the process. Run as a yielding tool command for longer intervals so the agent can continue updates.

Warm up, sample a bounded stable interval, and run modes serially. Repeat enough to see variation; label a single sample as such. Keep full-frame and small-patch workloads separate. Scrolling/large animation can favor full frames even when small patches favor forwarding. A synthetic graphics improvement does not establish browser-page performance.

Stop only the owned producer, detached session and host. Verify cleanup before the next run. Preserve exact commands and original measurement revisions in the existing audit. Never update old numbers' revision labels after a dependency bump.
