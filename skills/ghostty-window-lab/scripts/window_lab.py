#!/usr/bin/env python3
"""Owned, isolated Ghostty windows on Lua Hyprland. No persistent configuration."""
import argparse
import json
import os
from pathlib import Path
import shlex
import shutil
import signal
import subprocess
import sys
import time
import uuid


def run(*args):
    return subprocess.check_output(args, text=True).strip()


def dispatch(expression):
    run('hyprctl', 'eval', 'hl.dispatch(' + expression + ')')


def identity(pid):
    stat = Path(f'/proc/{pid}/stat').read_text().split(') ')[1].split()
    return {'pid': pid, 'start_ticks': stat[19],
            'exe': os.readlink(f'/proc/{pid}/exe')}


def load(root):
    return json.loads((root / 'window.json').read_text())


def window(meta):
    if identity(meta['pid']) != meta['identity']:
        raise RuntimeError('owned process identity changed; refusing to target it')
    matches = [w for w in json.loads(run('hyprctl', 'clients', '-j'))
               if w['pid'] == meta['pid'] and w['class'] == meta['class']]
    if len(matches) != 1:
        raise RuntimeError('owned window is absent or ambiguous')
    return matches[0]


def wait_size(meta, size, timeout=10):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        w = window(meta)
        if w['floating'] and w['size'] == size and not w.get('fullscreen', 0):
            return w
        time.sleep(.1)
    raise RuntimeError('owned window did not reach the requested floating size')


def launch(args):
    root = args.root
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    if (root / 'window.json').exists() or (root / 'runner.py').exists():
        raise RuntimeError('use a fresh lab directory for each launch')
    ghostty = shutil.which('ghostty')
    if not ghostty:
        raise RuntimeError('ghostty is unavailable')
    command = args.command
    if command and command[0] == '--':
        command = command[1:]
    if not command or not Path(command[0]).is_absolute():
        raise RuntimeError('command must start with an absolute executable path')
    # Resolve the compositor socket before changing XDG_RUNTIME_DIR.
    display = os.environ.get('WAYLAND_DISPLAY', '')
    if not display:
        raise RuntimeError('WAYLAND_DISPLAY is unset')
    if not os.path.isabs(display):
        display = str(Path(os.environ['XDG_RUNTIME_DIR']) / display)
    env = os.environ.copy()
    for key, directory in [('XDG_RUNTIME_DIR', 'run'), ('XDG_CONFIG_HOME', 'config'),
                           ('XDG_STATE_HOME', 'state'), ('XDG_CACHE_HOME', 'cache'),
                           ('XDG_DATA_HOME', 'data')]:
        path = root / directory
        path.mkdir(mode=0o700, exist_ok=True)
        env[key] = str(path)
    env.update(GDK_BACKEND='wayland', WAYLAND_DISPLAY=display)
    for pair in args.env:
        key, separator, value = pair.partition('=')
        if not separator or not key:
            raise RuntimeError('--env expects KEY=VALUE')
        env[key] = value
    for key in args.unset:
        env.pop(key, None)
    klass = 'com.agent.WindowLab' + uuid.uuid4().hex
    argv = [ghostty, '--gtk-single-instance=false', '--config-default-files=false',
            '--class=' + klass, '--title=Owned terminal lab', '--window-save-state=never',
            '--font-family=' + args.font, '--font-size=' + str(args.font_size),
            '--window-padding-x=4', '--window-padding-y=4', '-e', *command]
    spec = {'argv': argv, 'env': env, 'cwd': str(args.cwd), 'class': klass}
    # This file contains inherited environment. It is private scratch, never a deliverable.
    spec_path = root / 'launch.json'
    fd = os.open(spec_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        json.dump(spec, f)
    runner = root / 'runner.py'
    runner.write_text("import json,os,pathlib\np=pathlib.Path(__file__).parent\ns=json.loads((p/'launch.json').read_text())\n(p/'host-pid').write_text(str(os.getpid()))\nos.chdir(s['cwd'])\nos.execve(s['argv'][0],s['argv'],s['env'])\n")
    shell = 'exec ' + shlex.join([sys.executable, str(runner)]) + ' > ' + shlex.quote(str(root / 'host.log')) + ' 2>&1'
    rules = '{float=true,size={' + f'{args.width},{args.height}' + '},move={' + f'{args.x},{args.y}' + '},no_initial_focus=true,opaque=true,render_unfocused=true,no_dim=true,no_anim=true}'
    if args.workspace is not None:
        rules = rules[:-1] + ',workspace=' + json.dumps(str(args.workspace) + ' silent') + '}'
    dispatch('hl.dsp.exec_cmd(' + json.dumps(shell) + ', ' + rules + ')')
    deadline = time.monotonic() + 10
    meta = None
    try:
        while time.monotonic() < deadline:
            if (root / 'host-pid').exists():
                pid = int((root / 'host-pid').read_text())
                ident = identity(pid)
                if Path(ident['exe']).name == 'ghostty':
                    meta = {'pid': pid, 'identity': ident, 'class': klass,
                            'requested_size': [args.width, args.height]}
                    (root / 'window.json').write_text(json.dumps(meta, indent=2))
                    try:
                        window(meta)
                        break
                    except RuntimeError:
                        pass
            time.sleep(.1)
        else:
            raise RuntimeError('owned Ghostty window did not appear; inspect host.log')
        w = wait_size(meta, meta['requested_size'])
        if args.workspace is not None and w['workspace']['id'] != args.workspace:
            raise RuntimeError('owned window opened on the wrong workspace')
        meta['workspace'] = w['workspace']
        (root / 'window.json').write_text(json.dumps(meta, indent=2))
        print(json.dumps({'workspace': w['workspace'], 'root': str(root), 'pid': meta['pid'], 'class': klass,
                          'size': w['size'], 'at': w['at']}))
    except Exception:
        if meta is not None and identity(meta['pid']) == meta['identity']:
            os.kill(meta['pid'], signal.SIGTERM)
        raise
    finally:
        spec_path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=lambda s: Path(s).resolve(), required=True)
    sub = parser.add_subparsers(dest='action', required=True)
    launch_parser = sub.add_parser('launch')
    launch_parser.add_argument('--width', type=int, default=980)
    launch_parser.add_argument('--height', type=int, default=720)
    launch_parser.add_argument('--workspace', type=int, help='positive workspace ID; launch silently without switching')
    launch_parser.add_argument('--x', type=int, default=20)
    launch_parser.add_argument('--y', type=int, default=60)
    launch_parser.add_argument('--font', default='JetBrainsMono Nerd Font')
    launch_parser.add_argument('--font-size', type=float, default=8)
    launch_parser.add_argument('--cwd', type=lambda s: Path(s).resolve(), default=Path.cwd())
    launch_parser.add_argument('--env', action='append', default=[])
    launch_parser.add_argument('--unset', action='append', default=[])
    launch_parser.add_argument('command', nargs=argparse.REMAINDER)
    sub.add_parser('status')
    capture = sub.add_parser('capture')
    capture.add_argument('--output', type=lambda s: Path(s).resolve(), required=True)
    resize = sub.add_parser('resize')
    resize.add_argument('--width', type=int, required=True)
    resize.add_argument('--height', type=int, required=True)
    sub.add_parser('close')
    args = parser.parse_args()
    if args.action in ('launch', 'resize') and (args.width <= 0 or args.height <= 0):
        parser.error('dimensions must be positive')
    if args.action == 'launch':
        if args.workspace is not None and args.workspace <= 0:
            parser.error('--workspace must be a positive numeric workspace ID')
        launch(args)
        return
    meta = load(args.root)
    w = window(meta)
    if args.action == 'status':
        print(json.dumps(w))
    elif args.action == 'capture':
        monitors = json.loads(run('hyprctl', 'monitors', '-j'))
        visible = any(m['id'] == w['monitor'] and
                      m['activeWorkspace']['id'] == w['workspace']['id'] and
                      not m.get('specialWorkspace', {}).get('id', 0) for m in monitors)
        if not visible:
            raise RuntimeError('owned workspace is hidden; refusing to capture the currently visible desktop')
        if not w['floating'] or w.get('fullscreen', 0):
            raise RuntimeError('refusing capture with unexpected fullscreen/tiled geometry')
        x, y = w['at']; width, height = w['size']
        subprocess.run(['grim', '-g', f'{x},{y} {width}x{height}', str(args.output)], check=True)
        print(args.output)
    elif args.action == 'resize':
        dispatch('hl.dsp.window.resize({x=' + str(args.width) + ',y=' + str(args.height)
                 + ',window=' + json.dumps('address:' + w['address']) + '})')
        meta['requested_size'] = [args.width, args.height]
        w = wait_size(meta, meta['requested_size'])
        (args.root / 'window.json').write_text(json.dumps(meta, indent=2))
        print(json.dumps({'size': w['size'], 'at': w['at']}))
    elif args.action == 'close':
        os.kill(meta['pid'], signal.SIGTERM)
        print('Closed owned Ghostty. Stop any detached app session separately with its isolated environment.')


if __name__ == '__main__':
    main()
