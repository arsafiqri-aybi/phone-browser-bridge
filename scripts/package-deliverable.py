#!/usr/bin/env python3
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib,json,os,re
root=Path(__file__).resolve().parent.parent
excluded={'.git','node_modules','.gradle','.cxx','build','.wrangler','artifacts','__pycache__'}
def include(p):
    rel=p.relative_to(root)
    return not any(k in excluded for k in rel.parts) and p.name not in {'.dev.vars','local.properties','manifest.json'} and not p.name.endswith(('.local.json','.keystore','.jks','.o','.zip')) and p.name!='core'
files=sorted(p for p in root.rglob('*') if p.is_file() and include(p))
for p in files:
    if p.is_symlink():raise RuntimeError('Symlinks not allowed in deliverable: '+str(p))
    if p.stat().st_size<2_000_000 and p.suffix not in {'.jar','.apk','.jpg','.png'}:
        value=p.read_bytes()
        if re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}',value):raise RuntimeError('Potential secret: '+str(p))
manifest={'package':'Phone_Browser_Bridge','version':'0.1.0','status':['DEVICE_VALIDATION_PENDING','DEPLOYMENT_PENDING','SIGNING_PENDING'],'files':[{'path':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in files], 'note':'Manifest excludes itself. Hashes prove integrity, not physical-device functionality or publisher authenticity.'}
(root/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
target=Path(os.environ.get('BRIDGE_DELIVERABLE_DIR','/workspace/artifacts'));target.mkdir(parents=True,exist_ok=True)
archive=target/'Phone_Browser_Bridge_0.1.0_Deliverable.zip'
with ZipFile(archive,'w',ZIP_DEFLATED)as z:
    for p in files+[root/'manifest.json']:
        z.write(p,'Phone_Browser_Bridge/'+p.relative_to(root).as_posix())
with ZipFile(archive)as z:
    assert z.testzip() is None
    for f in manifest['files']:
        assert hashlib.sha256(z.read('Phone_Browser_Bridge/'+f['path'])).hexdigest()==f['sha256']
checksum=hashlib.sha256(archive.read_bytes()).hexdigest()
(target/(archive.name+'.sha256')).write_text(checksum+'  '+archive.name+'\n')
print(json.dumps({'archive':str(archive),'sha256':checksum,'files':len(files)+1,'bytes':archive.stat().st_size,'zipIntegrity':'PASS','manifestIntegrity':'PASS','privateMaterialScan':'PASS heuristic, not a complete security audit'}))
