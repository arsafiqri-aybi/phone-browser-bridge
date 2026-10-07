#!/usr/bin/env python3
"""Install pinned Linux x86_64 tooling outside source; keep all verification enabled."""
import hashlib, os, pathlib, shlex, shutil, subprocess, tarfile, urllib.request, zipfile

root=pathlib.Path(os.environ.get('BRIDGE_TOOLCHAIN_ROOT','/workspace/toolchains')).resolve()
root.mkdir(parents=True,exist_ok=True)
downloads=root/'downloads';downloads.mkdir(exist_ok=True)
def run(*args,**kwargs):subprocess.run(args,check=True,**kwargs)
def download(url,name,digest):
    p=downloads/name
    if not p.exists() or hashlib.sha256(p.read_bytes()).hexdigest()!=digest:
        temp=p.with_suffix('.download')
        run('curl','-fsSL','--retry','2','--max-time','300',url,'-o',str(temp))
        if hashlib.sha256(temp.read_bytes()).hexdigest()!=digest:temp.unlink();raise RuntimeError('CHECKSUM_MISMATCH: '+name)
        temp.replace(p)
    return p
def unzip(p,dest):
    with zipfile.ZipFile(p) as z:
        for f in z.infolist():
            path=pathlib.PurePosixPath(f.filename)
            if path.is_absolute() or '..' in path.parts:raise RuntimeError('Unsafe archive')
        z.extractall(dest)
jdk=root/'jdk-17.0.16+8'
if not (jdk/'bin/jlink').exists():
    p=download('https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.16%2B8/OpenJDK17U-jdk_x64_linux_hotspot_17.0.16_8.tar.gz','jdk17.tar.gz','166774efcf0f722f2ee18eba0039de2d685b350ee14d7b69e6f83437dafd2af1')
    with tarfile.open(p) as t:t.extractall(root,filter='data')
sdk=root/'android-sdk'
manager=sdk/'cli19/cmdline-tools/bin/sdkmanager'
if not manager.exists():
    p=download('https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip','cmdline-tools-19.zip','7ec965280a073311c339e571cd5de778b9975026cfcbe79f2b1cdcb1e15317ee')
    unzip(p,sdk/'cli19')
    for p in manager.parent.iterdir():p.chmod(0o755)
env={**os.environ,'JAVA_HOME':str(jdk),'ANDROID_HOME':str(sdk),'ANDROID_USER_HOME':str(root/'android-user')}
required={'platforms;android-35':'platforms/android-35/android.jar','build-tools;35.0.0':'build-tools/35.0.0/apksigner','platform-tools':'platform-tools/adb','ndk;27.0.12077973':'ndk/27.0.12077973/source.properties','cmake;3.22.1':'cmake/3.22.1/bin/cmake'}
missing=[key for key,path in required.items() if not (sdk/path).exists()]
if missing:
    # User-authorized SDK setup; retain the SDK manager's license and artifact verification.
    run(str(manager),'--sdk_root='+str(sdk),'--licenses',input=('y\n'*100).encode(),env=env)
    run(str(manager),'--sdk_root='+str(sdk),*missing,env=env)
gradle=root/'gradle-8.9/bin/gradle'
if not gradle.exists():
    p=download('https://downloads.gradle.org/distributions/gradle-8.9-bin.zip','gradle-8.9-bin.zip','d725d707bfabd4dfdc958c624003b3c80accc03f7037b5122c4b1d0ef15cecab')
    unzip(p,root);gradle.chmod(0o755)
cache=root/'gradle-cache';cache.mkdir(exist_ok=True)
trust=root/'java-truststore'
if not trust.exists():shutil.copy(jdk/'lib/security/cacerts',trust)
ca=os.environ.get('CODEX_PROXY_CERT')
if ca:
    result=subprocess.run([str(jdk/'bin/keytool'),'-list','-alias','cloud-proxy-ca','-keystore',str(trust),'-storepass','changeit'],capture_output=True)
    if result.returncode:run(str(jdk/'bin/keytool'),'-importcert','-noprompt','-alias','cloud-proxy-ca','-file',ca,'-keystore',str(trust),'-storepass','changeit')
from urllib.parse import urlsplit
proxy=urlsplit(os.environ.get('HTTPS_PROXY',''))
properties=f'systemProp.javax.net.ssl.trustStore={trust}\nsystemProp.javax.net.ssl.trustStorePassword=changeit\n'
if proxy.hostname:
    for protocol in ['http','https']:properties+=f'systemProp.{protocol}.proxyHost={proxy.hostname}\nsystemProp.{protocol}.proxyPort={proxy.port or 80}\n'
    properties+='systemProp.http.nonProxyHosts=localhost|127.*\n'
# This is a task-owned tool cache, never a user's global configuration.
(cache/'gradle.properties').write_text(properties)
signing=root/'signing';signing.mkdir(exist_ok=True);debug=signing/'debug.keystore'
if not debug.exists():run(str(jdk/'bin/keytool'),'-genkeypair','-keystore',str(debug),'-storepass','android','-keypass','android','-alias','androiddebugkey','-dname','CN=Android Debug,O=Android,C=US','-keyalg','RSA','-keysize','2048','-validity','10000')
values={'JAVA_HOME':jdk,'ANDROID_HOME':sdk,'ANDROID_USER_HOME':root/'android-user','GRADLE_USER_HOME':cache,'BRIDGE_DEBUG_STORE':debug,'npm_config_cache':root/'npm-cache','XDG_CONFIG_HOME':root/'xdg'}
(root/'activate.sh').write_text(''.join('export '+k+'='+shlex.quote(str(v))+'\n' for k,v in values.items())+'export PATH='+shlex.quote(str(jdk/'bin')+':'+str(gradle.parent)+':'+str(sdk/'platform-tools'))+':"$PATH"\n')
print('Pinned toolchains ready; activation: '+str(root/'activate.sh'))
