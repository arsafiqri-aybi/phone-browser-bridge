import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
export function validSerial(value){return /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}):\d{1,5}$/.test(value)&&Number(value.split(':')[1])>0&&Number(value.split(':')[1])<=65535;}
export class AndroidLink {
  constructor({serial=process.env.ADB_SERIAL,run=execute,probe}={}){if(serial&&!validSerial(serial))throw Error('ADB_SERIAL harus IP:port koneksi HP yang kamu pasangkan.');this.serial=serial;this.run=run;this.probe=probe||async function(){try{const r=await fetch('http://127.0.0.1:9222/json/version',{signal:AbortSignal.timeout(2500)});return r.ok&&!!(await r.json()).webSocketDebuggerUrl;}catch{return false;}};}
  async ensure(){
    if(await this.probe())return {devtools_available:true,adb_recovery_configured:!!this.serial};
    if(!this.serial)return {devtools_available:false,adb_recovery_configured:false};
    try{
      const options={timeout:5000,maxBuffer:8192};
      await this.run('adb',['connect',this.serial],options);
      const state=await this.run('adb',['-s',this.serial,'get-state'],options);
      if(String(state.stdout).trim()!=='device')return {devtools_available:false,adb_recovery_configured:true};
      await this.run('adb',['-s',this.serial,'forward','tcp:9222','localabstract:chrome_devtools_remote'],options);
      return {devtools_available:await this.probe(),adb_recovery_configured:true};
    }catch{return {devtools_available:false,adb_recovery_configured:true};}
  }
}
