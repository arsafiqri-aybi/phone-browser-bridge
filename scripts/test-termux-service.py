import os,pathlib,subprocess,tempfile,shutil
R=pathlib.Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="bridge-service-'test") as temporary:
 root=pathlib.Path(temporary);agent=root/'agent';(agent/'scripts').mkdir(parents=True)
 for name in ['install-service.sh','control.sh']:shutil.copy(R/'agent/scripts'/name,agent/'scripts'/name)
 (agent/'.env').write_text('PRESERVED=yes\n');prefix=root/'prefix';(prefix/'var/service').mkdir(parents=True);(prefix/'bin').mkdir()
 for name,body in {'sv':'exit 0','sv-enable':'rm -f "$PREFIX/var/service/$1/down"','sv-disable':'touch "$PREFIX/var/service/$1/down"','termux-wake-lock':'echo hold >> "$PREFIX/wake.log"','termux-wake-unlock':'echo release >> "$PREFIX/wake.log"'}.items():
  p=prefix/'bin'/name;p.write_text('#!/bin/sh\n'+body+'\n');p.chmod(0o700)
 env={**os.environ,'PREFIX':str(prefix),'HOME':str(root/'home'),'PATH':str(prefix/'bin')+':'+os.environ['PATH']}
 def run(file,*args):subprocess.run(['bash',str(file),*args],env=env,check=True,stdout=subprocess.DEVNULL)
 install=agent/'scripts/install-service.sh';control=agent/'scripts/control.sh';unit=prefix/'var/service/phone-chrome-agent'
 run(install);run(install);assert (agent/'.env').read_text()=='PRESERVED=yes\n'
 for p in [unit/'run',unit/'finish',unit/'log/run',prefix/'bin/chrome-bridge']:subprocess.run(['bash','-n',str(p)],check=True)
 run(control,'boot-on');run(control,'stop');assert (unit/'down').exists();before=(prefix/'wake.log').read_text();run(root/'home/.termux/boot/phone-chrome-bridge');assert (prefix/'wake.log').read_text()==before
 run(control,'start');assert not (unit/'down').exists();run(control,'boot-off');assert not (root/'home/.termux/boot/phone-chrome-bridge').exists()
 print('Service installer: update, quoted paths, config preservation, persistent stop, boot respect and restart passed.')
