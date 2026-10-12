#!/usr/bin/env python3
"""Bounded Linux CPU/RSS/PSS samples for fixed, identity-checked processes."""
import argparse
import json
import os
from pathlib import Path
import time


def snapshot(pid, pss):
    root = Path(f'/proc/{pid}')
    fields = (root / 'stat').read_text().split(') ')[1].split()
    status = (root / 'status').read_text().splitlines()
    rss = next(int(line.split()[1]) for line in status if line.startswith('VmRSS:'))
    result = {'ticks': int(fields[11]) + int(fields[12]), 'start_ticks': fields[19],
              'exe': os.readlink(root / 'exe'), 'rss_kib': rss}
    if pss:
        lines = (root / 'smaps_rollup').read_text().splitlines()
        result['pss_kib'] = next(int(line.split()[1]) for line in lines if line.startswith('Pss:'))
    return result


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--duration', type=float, default=15)
    p.add_argument('--interval', type=float, default=1)
    p.add_argument('--pss', action='store_true')
    p.add_argument('--output', type=Path)
    p.add_argument('processes', nargs='+', metavar='LABEL=PID')
    a = p.parse_args()
    if not 0 < a.duration <= 300 or not 0 < a.interval <= a.duration:
        p.error('duration must be in (0,300] and interval in (0,duration]')
    processes = {}
    for item in a.processes:
        label, sep, pid = item.partition('=')
        if not sep or not label or not pid.isdigit() or label in processes:
            p.error('use unique LABEL=PID entries')
        processes[label] = int(pid)
    started = time.monotonic()
    initial = {label: snapshot(pid, a.pss) for label, pid in processes.items()}
    previous, previous_time = initial, started
    samples = []
    while time.monotonic() < started + a.duration:
        time.sleep(min(a.interval, max(0, started + a.duration - time.monotonic())))
        now = time.monotonic()
        current = {label: snapshot(pid, a.pss) for label, pid in processes.items()}
        sample = {'elapsed_seconds': now - started, 'processes': {}}
        for label in processes:
            first, last = initial[label], current[label]
            if (first['start_ticks'], first['exe']) != (last['start_ticks'], last['exe']):
                raise RuntimeError(f'{label} process identity changed; measurement invalid')
            entry = {'cpu_percent_one_core': 100 * (last['ticks'] - previous[label]['ticks'])
                     / os.sysconf('SC_CLK_TCK') / (now - previous_time), 'rss_kib': last['rss_kib']}
            if a.pss:
                entry['pss_kib'] = last['pss_kib']
            sample['processes'][label] = entry
        samples.append(sample)
        previous, previous_time = current, now
    result = {'duration_seconds': previous_time - started, 'initial': initial, 'samples': samples}
    encoded = json.dumps(result, indent=2)
    if a.output:
        a.output.write_text(encoded + '\n')
    print(encoded)


if __name__ == '__main__':
    main()
