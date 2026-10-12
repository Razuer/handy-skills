#!/usr/bin/env python3
"""Read a local kitty_wiretap counter file. No payloads are stored."""
import argparse
import json
from pathlib import Path
import struct

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('path', type=Path)
a = p.parse_args()
values = struct.unpack('=5Q', a.path.read_bytes())
print(json.dumps(dict(zip(('tty_bytes', 'write_calls', 'transmit_commands',
                           'native_placements', 'composed_placements'), values)), indent=2))
