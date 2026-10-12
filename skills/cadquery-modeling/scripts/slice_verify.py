#!/usr/bin/env python3
"""Execute OrcaSlicer CLI with explicit printer/process/filament profiles.

Slicing success is NOT visual layer approval. Report is UNVERIFIED unless a
human/agent inspected generated slices and records evidence separately.
"""
import argparse, json, shutil, subprocess, sys
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('stl', type=Path)
p.add_argument('--printer', type=Path, required=True)
p.add_argument('--process', type=Path, required=True)
p.add_argument('--filament', type=Path, required=True)
p.add_argument('--binary', default='orca-slicer')
p.add_argument('--layer-review-evidence', type=Path, help='existing visual inspection record for sliced layers; required to call slicer gate PASS')
p.add_argument('--out-dir', type=Path, required=True)
a=p.parse_args()
a.out_dir.mkdir(parents=True, exist_ok=True)
report={'sliced_model':str(a.stl.resolve()),'profile_files':list(map(lambda x:str(x.resolve()),(a.printer,a.process,a.filament))), 'status':'UNVERIFIED',
        'limitations':['CLI success only shows toolpath generation. Inspect the generated layers, supports, islands and walls.']}
if not all(f.is_file() for f in (a.stl,a.printer,a.process,a.filament)):
    report['error']='Model or required process/printer/filament profile missing'
elif not shutil.which(a.binary) and not Path(a.binary).is_file():
    report['error']='OrcaSlicer CLI unavailable'
else:
    cmd=[a.binary, str(a.stl), '--load-settings', f'{a.process};{a.printer}', '--load-filaments', str(a.filament),
         '--slice','0', '--export-3mf',str(a.out_dir/'sliced.3mf')]
    try:
        r=subprocess.run(cmd, capture_output=True, text=True, timeout=360, cwd=a.out_dir)
        report.update(command=cmd, exit_code=r.returncode, stdout=r.stdout[-3000:], stderr=r.stderr[-3000:])
        report['status']='SLICED_NEEDS_LAYER_REVIEW' if r.returncode == 0 else 'FAIL'
        if r.returncode == 0 and a.layer_review_evidence and a.layer_review_evidence.is_file() and (a.out_dir/'sliced.3mf').is_file():
            report['status']='PASS'
            report['layer_review_evidence']=str(a.layer_review_evidence.resolve())
    except (OSError, subprocess.TimeoutExpired) as exc:
        report['error']=str(exc)
(a.out_dir/'slice_report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
sys.exit(0 if report.get('status')=='PASS' else 1 if report.get('status')=='FAIL' else 2)
