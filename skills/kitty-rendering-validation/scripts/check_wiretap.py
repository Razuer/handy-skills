#!/usr/bin/env python3
"""Compile and exercise the counter on an isolated PTY; leaves no artifacts."""
import os
from pathlib import Path
import pty
import struct
import subprocess
import sys
import tempfile

with tempfile.TemporaryDirectory(prefix='kitty-counter-check-') as directory:
    root = Path(directory)
    library = root / 'wiretap.so'
    subprocess.run(['cc', '-shared', '-fPIC', '-O2', '-Wall', '-Wextra', '-Werror',
                    '-pthread', str(Path(__file__).with_name('kitty_wiretap.c')),
                    '-o', str(library)], check=True)
    producer = root / 'producer.py'
    producer.write_text("import os\nos.write(1,b'plain')\nos.write(1,b'\\x1b_')\nos.writev(1,[b'G',b'a=T,i=1;',b'AAAA\\x1b\\\\'])\nos.write(1,b'\\x1b_Ga=p,i=1,p=2;\\x1b\\\\')\nos.writev(1,[b'\\x1b_G',b'a=p,c=2,r=3;',b'\\x1b\\\\'])\nos.write(2,b'not a tty')\n")
    master, slave = pty.openpty()
    try:
        env = os.environ.copy()
        env.update(LD_PRELOAD=str(library), KITTY_LAB_EXE=os.path.realpath(sys.executable),
                   KITTY_LAB_COUNTER_DIR=directory)
        process = subprocess.Popen([sys.executable, str(producer)], stdout=slave,
                                   stderr=subprocess.DEVNULL, env=env)
        assert process.wait(timeout=10) == 0
        counters = struct.unpack('=5Q', (root / f'{process.pid}.counts').read_bytes())
        assert counters == (56, 5, 1, 1, 1), counters
        print('Passed split write/writev headers, native/composed distinction and non-TTY exclusion.')
    finally:
        os.close(slave)
        os.close(master)
