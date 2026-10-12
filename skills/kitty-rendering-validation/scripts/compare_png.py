#!/usr/bin/env python3
"""Compare equal-sized captures in an explicit ROI. Requires Pillow."""
import argparse
import json
from PIL import Image, ImageChops

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('reference')
p.add_argument('candidate')
p.add_argument('--roi', type=int, nargs=4, metavar=('X', 'Y', 'WIDTH', 'HEIGHT'))
p.add_argument('--diff')
a = p.parse_args()
ref = Image.open(a.reference).convert('RGBA')
candidate = Image.open(a.candidate).convert('RGBA')
if ref.size != candidate.size:
    p.error(f'dimensions differ: {ref.size} vs {candidate.size}; do not rescale a correctness comparison')
if a.roi:
    x, y, width, height = a.roi
    if min(x, y) < 0 or min(width, height) <= 0 or x + width > ref.width or y + height > ref.height:
        p.error('ROI must be a nonempty rectangle inside both images')
    box = (x, y, x + width, y + height)
    ref, candidate = ref.crop(box), candidate.crop(box)
diff = ImageChops.difference(ref, candidate)
count = sum(any(pixel) for pixel in diff.getdata())
if a.diff:
    diff.save(a.diff)
print(json.dumps({'different_pixels': count, 'pixels': ref.width * ref.height,
                  'dimensions': ref.size, 'roi': a.roi}))
raise SystemExit(1 if count else 0)
