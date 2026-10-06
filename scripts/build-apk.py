#!/usr/bin/env python3
"""Dependency-free APK build using an installed official Android SDK and Java 17.
Alternative to Gradle for reproducible resource/Java/dex/signature validation.
The keystore remains outside the source package; never distribute its private key.
"""
import os, pathlib, shutil, subprocess, sys, tempfile, zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
SDK = pathlib.Path(os.environ.get('ANDROID_SDK_ROOT', os.environ.get('ANDROID_HOME', '')))
TOOLS = SDK / 'build-tools' / '35.0.0'
ANDROID = SDK / 'platforms' / 'android-35' / 'android.jar'
APP = ROOT / 'android' / 'app' / 'src' / 'main'
JAVA = os.environ.get('JAVA_BIN', 'java')
KEYTOOL = os.environ.get('KEYTOOL_BIN', 'keytool')
KEY = pathlib.Path(os.environ.get('PHONE_DEBUG_KEYSTORE', str(pathlib.Path.home()/'.android'/'phone-bridge-debug.jks')))
def run(*args): subprocess.run([str(v) for v in args], check=True)
if not ANDROID.is_file() or not (TOOLS/'aapt2').is_file():
    sys.exit('Set ANDROID_SDK_ROOT to SDK with platforms;android-35 and build-tools;35.0.0.')
with tempfile.TemporaryDirectory(prefix='phone-apk-') as temporary:
    out=pathlib.Path(temporary);classes=out/'classes';classes.mkdir();dex=out/'dex';dex.mkdir()
    manifest=out/'AndroidManifest.xml'
    manifest.write_text((APP/'AndroidManifest.xml').read_text().replace('<manifest ', '<manifest package="id.privatebridge.phone" android:versionCode="2" android:versionName="2.0.0" ',1))
    run(TOOLS/'aapt2','compile','--dir',APP/'res','-o',out/'resources.zip')
    run(TOOLS/'aapt2','link','-I',ANDROID,'--manifest',manifest,'--min-sdk-version','30','--target-sdk-version','35','-o',out/'unsigned.apk',out/'resources.zip')
    sources=sorted(APP.glob('java/**/*.java'))
    run(JAVA,'-m','jdk.compiler/com.sun.tools.javac.Main','-source','8','-target','8','-classpath',ANDROID,'-d',classes,*sources)
    jars=out/'classes.jar'
    with zipfile.ZipFile(jars,'w',zipfile.ZIP_DEFLATED) as z:
        for item in classes.rglob('*.class'):z.write(item,item.relative_to(classes))
    run(JAVA,'-cp',TOOLS/'lib'/'d8.jar','com.android.tools.r8.D8','--lib',ANDROID,'--min-api','30','--output',dex,jars)
    with zipfile.ZipFile(out/'unsigned.apk','a',zipfile.ZIP_DEFLATED) as z:
        for item in dex.glob('*.dex'):z.write(item,item.name)
    run(TOOLS/'zipalign','-p','-f','4',out/'unsigned.apk',out/'aligned.apk')
    KEY.parent.mkdir(parents=True,exist_ok=True)
    if not KEY.exists():run(KEYTOOL,'-genkeypair','-keystore',KEY,'-storepass','android','-keypass','android','-alias','phone-debug','-keyalg','RSA','-keysize','2048','-validity','10000','-dname','CN=Phone Browser Bridge Personal Debug')
    target=ROOT/'dist'/'Phone_Browser_Bridge_2.0.0.apk';target.parent.mkdir(exist_ok=True)
    run(JAVA,'-jar',TOOLS/'lib'/'apksigner.jar','sign','--ks',KEY,'--ks-pass','pass:android','--key-pass','pass:android','--ks-key-alias','phone-debug','--out',target,out/'aligned.apk')
    run(JAVA,'-jar',TOOLS/'lib'/'apksigner.jar','verify','--verbose',target)
    run(TOOLS/'aapt','dump','badging',target)
    print('APK:',target)
