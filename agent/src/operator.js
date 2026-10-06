import {Chrome} from './cdp.js';
import {catalog,validate} from '../../cloudflare/src/catalog.js';
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
export class Operator{
  constructor(config){this.config=config;this.chrome=new Chrome({mediaRoot:config.mediaRoot});this.tail=Promise.resolve();this.receipts={};}
  async init(){await fs.mkdir(this.config.dataDir,{recursive:true,mode:0o700});try{this.receipts=JSON.parse(await fs.readFile(path.join(this.config.dataDir,'receipts.json'),'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('Jurnal tindakan rusak; periksa dahulu sebelum memulai.');}}
  async save(){const file=path.join(this.config.dataDir,'receipts.json');await fs.writeFile(file+'.tmp',JSON.stringify(this.receipts),{mode:0o600});await fs.rename(file+'.tmp',file);}
  async native(operation,args={},action_id){const response=await fetch('http://127.0.0.1:8765/v1/command',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+this.config.nativeToken},body:JSON.stringify({operation,args,action_id}),signal:AbortSignal.timeout(10000)});const result=await response.json();if(!response.ok||result.error)throw Error(result.error||'APK belum siap.');return result;}
  run(name,args={}){const task=this.tail.then(()=>this.execute(name,args));this.tail=task.catch(()=>{});return task;}
  async status(){let native;try{native=await this.native('status');}catch{return {active:false,native_connected:false,chrome_connected:false,mode:this.config.mode,error:'APK belum tersambung. Mulai penghubung dan periksa token APK.'};}let chrome=false;if(this.config.mode==='devtools')try{await this.chrome.ready();chrome=true;}catch{}return {...native,native_connected:true,chrome_connected:chrome,mode:this.config.mode,ready:!!native.active&&!native.locked&&(this.config.mode==='devtools'?chrome:!!native.accessibility_connected&&native.screen_awake&&native.foreground_package==='com.android.chrome'),session_duration_limit:null};}
  async execute(name,args){const tool=catalog.find(t=>t.name===name);if(!tool)throw Error('Tool tidak dikenal.');validate(tool.inputSchema,args);if(name==='phone_status')return this.status();
    const mutation=!tool.annotations.readOnlyHint;let receipt;
    if(mutation){const signature=createHash('sha256').update(JSON.stringify({name,args})).digest('hex');receipt=this.receipts[args.action_id];if(receipt){if(receipt.signature!==signature)throw Error('action_id sudah dipakai untuk perintah berbeda.');if(receipt.state==='done')return {accepted:true,duplicate:true,instruction:'Tindakan ini sudah dijalankan. Baca ulang untuk memeriksa hasil.'};throw Error('Hasil tindakan sebelumnya belum diketahui. Periksa halaman; jangan mengulang otomatis.');}receipt={signature,state:'pending',at:Date.now()};this.receipts[args.action_id]=receipt;await this.save();}
    try{
      let result;if(name==='phone_handoff')result=await this.native('pause',{},args.action_id);
      else{const state=await this.native('status');if(!state.active)throw Error('Kendali dijeda. Pemilik menekan Mulai di APK.');if(state.locked)throw Error('HP terkunci. Pemilik membuka kunci sendiri.');if(this.config.mode==='devtools')result=await this.chrome.execute(name,args);
        else{if(name.startsWith('chrome_'))throw Error('Tool ini membutuhkan mode DevTools.');const op=name.replace(/^phone_/,'');result=await this.native(op,args,args.action_id);}}
      if(receipt){receipt.state='done';await this.save();}return result;
    }catch(e){if(receipt){receipt.state='unknown';await this.save();}throw e;}
  }
}
