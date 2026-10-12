#!/usr/bin/env python3
"""Fast targeted v2.1 regression: honest gates, frames, CAD/STL, FDM, rendering."""
from __future__ import annotations
import json
import subprocess
import sys
import tempfile
from pathlib import Path
import cadquery as cq
import trimesh
ROOT = Path(__file__).resolve().parent


def run(script, *args, code=0):
    p=subprocess.run([sys.executable,str(ROOT/script),*map(str,args)],capture_output=True,text=True,timeout=95)
    if p.returncode != code:
        raise AssertionError(f'{script} returned {p.returncode} expected {code}\nstdout: {p.stdout[-1800:]}\nstderr: {p.stderr[-1800:]}')
    return json.loads(p.stdout)


def main():
    with tempfile.TemporaryDirectory(prefix='cadquery-v21-') as temp:
        d=Path(temp)
        # In print frames, both parts start at (0,0,0), which would overlap if
        # erroneously checked as assembly. In assembled frame, second translates +X.
        b1 = cq.Workplane('XY').box(20,10,5, centered=(True,True,False)).val()
        b2 = cq.Workplane('XY').box(10,10,5, centered=(True,True,False)).val()
        for name, shape in [('base',b1),('lid',b2)]:
            shape.exportStep(str(d/(name+'.step')))
            shape.exportStl(str(d/(name+'.stl')), tolerance=.04, angularTolerance=.12)
        b1.exportStep(str(d/'posed_base.step'))
        b2.translate((25,0,0)).exportStep(str(d/'posed_lid.step'))
        inventory=run('step_inspect.py',d/'posed_base.step')
        assert inventory['solid_count']==1
        preflight=run('printability.py',d/'base.stl','--candidates','--json',d/'base_printability.json')
        assert len(preflight['orientation_candidates'])==6
        assert preflight['bed_contact_area_mm2'] > 150
        run('printability.py',d/'lid.stl','--json',d/'lid_printability.json')
        assert run('audit.py',d/'base.step',d/'base.stl','--expected-pairs',1,
                   '--expected-components-per-stl',1)['step_stl_comparisons']
        project={'parts':[
            {'name':n,'manufacturing_step':n+'.step','manufacturing_stl':n+'.stl',
             'printability_report':n+'_printability.json',
             'print':{'build_direction':'+Z','orientation_reason':'flat bed face', 'assembly_to_manufacturing_transform':[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]] if n=='base' else [[1,0,0,-25],[0,1,0,0],[0,0,1,0],[0,0,0,1]]}}
             for n in ('base','lid')],
             'assembled_steps':['posed_base.step','posed_lid.step'],
             'requirements':[{'id':'basic load','category':'function','status':'UNVERIFIED',
                              'note':'No real service test'}]}
        manifest=d/'project.json'
        manifest.write_text(json.dumps(project))
        report=run('project_validate.py','--manifest',manifest,code=2)
        assert report['categories']['geometry']['status']=='PASS',report
        assert report['categories']['assembly']['status']=='UNVERIFIED' # no insertion evidence
        assert report['categories']['function']['status']=='UNVERIFIED'
        assert report['categories']['manufacturing']['status']=='UNVERIFIED'
        assert not any('assembled pose collisions' in x['name'] and x['status']=='FAIL' for x in report['checks'])
        # NOTE manufacturing-only coordinates overlap deliberately. Audit MUST catch
        # accidental use in the assembly frame.
        wrong=run('audit.py',d/'base.step',d/'lid.step','--check-intersections',code=1)
        assert 'Overlapping solids' in ' '.join(wrong['errors'])
        # paired comparison mandatory, no silent empty []
        bad=dict(project)
        bad['parts']=[dict(project['parts'][0], manufacturing_stl='missing.stl')]
        bad['assembled_steps']=[]
        (d/'bad.json').write_text(json.dumps(bad))
        failed=run('project_validate.py','--manifest',d/'bad.json',code=1)
        assert failed['categories']['geometry']['status']=='FAIL'
        # two disconnected cubes in a single STL -> strict failure
        two=trimesh.util.concatenate([trimesh.load_mesh(d/'base.stl'),
                                      trimesh.load_mesh(d/'lid.stl').apply_translation((50,0,0))])
        two.export(d/'disconnected.stl')
        invalid=run('audit.py',d/'disconnected.stl','--expected-components-per-stl',1,code=1)
        assert 'Expected 1 STL connected components' in ' '.join(invalid['errors'])
        # mechanical geometry checks: distance in posed frame and bad duct aim
        engineering={'parts':{'a':'posed_base.step','b':'posed_lid.step'},'checks':[
            {'name':'separation','type':'clearance','a':'a','b':'b','minimum_mm':5},
            {'name':'aim','type':'duct_aim','outlet_center_mm':[0,0,0],
             'outlet_direction':[1,0,0],'target_mm':[-10,0,0],'max_angle_deg':15}]}
        (d/'checks.json').write_text(json.dumps(engineering))
        result=run('engineering_checks.py',d/'checks.json',code=1)
        assert result['checks'][0]['status']=='PASS' and result['checks'][1]['status']=='FAIL'
        if "--skip-render" not in sys.argv:
            # vector exploded view & desk preset; inspect also by opening images separately.
            (d/'explode.json').write_text(json.dumps({'posed_base:0':[0,-12,0],'posed_lid:0':[0,0,15]}))
            (d/'cameras.json').write_text(json.dumps({'iso': [[1,-1,1],[0,0,1]], 'front': [[0,-1,0],[0,0,1]]}))
            render=run('render.py',d/'posed_base.step',d/'posed_lid.step',
                       '--out-dir',d/'renders','--preset','desk', '--camera-json',d/'cameras.json', '--explode-plan',d/'explode.json',
                       '--labels','--width',480,'--height',360)
            assert render['preset']=='desk' and 'exploded_iso.png' in render['views']
            assert (d/'renders/contact_sheet.png').stat().st_size > 6000
        print(json.dumps({'status':'PASS', 'positive':['strict STEP/STL pairing','global assembly frame validation',
              'separate four quality gates','six FDM orientation candidates','STEP inventory',
              'clearance measurement','desk camera/multi-axis explosion with labels' if '--skip-render' not in sys.argv else 'renderer skipped (already tested separately)'],
              'negative':['missing STL fails project gate','local-pose overlap caught',
              'disconnected single-part STL rejected','duct aim away from target rejected'],
              'manufacturing_gate':'UNVERIFIED without slicer/layer inspection and real tests'},indent=2))

if __name__=='__main__':
    main()
