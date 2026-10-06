import WebSocket from 'ws';
import {Operator} from './operator.js';
import path from 'node:path';
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
const base=new URL(process.env.PUBLIC_BASE_URL||'https://phone-chrome-mcp.arsafiqri-ua03.workers.dev');
if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.username||base.password)throw Error('PUBLIC_BASE_URL harus origin HTTPS.');
if(!tokenPattern.test(process.env.PHONE_TOKEN||'')||!tokenPattern.test(process.env.NATIVE_TOKEN||''))throw Error('Jalankan npm run setup dahulu. Token tidak valid.');
const mode=process.env.CONTROL_MODE||'devtools';if(!['devtools','accessibility'].includes(mode))throw Error('CONTROL_MODE tidak valid.');
const operator=new Operator({mode,nativeToken:process.env.NATIVE_TOKEN,mediaRoot:process.env.MEDIA_ROOT,dataDir:path.resolve('data')});await operator.init();
let socket,attempt=0,stopped=false,timer,heartbeat,lastPong;
function connect(){if(stopped)return;socket=new WebSocket(new URL('/device/connect',base).href.replace(/^https:/,'wss:'),{headers:{authorization:'Bearer '+process.env.PHONE_TOKEN},maxPayload:6*1024*1024,handshakeTimeout:15000});const current=socket;
  current.on('open',()=>{attempt=0;lastPong=Date.now();console.log('Relay tersambung. Status HP diperiksa saat diminta.');heartbeat=setInterval(()=>{if(Date.now()-lastPong>60000){current.terminate();return;}if(current.readyState===1)current.send('{"type":"ping"}');},25000);});
  current.on('message',async raw=>{let data;try{data=JSON.parse(raw);}catch{return;}if(data.type==='pong'){lastPong=Date.now();return;}if(data.type!=='command'||typeof data.id!=='string')return;let result;try{result={type:'result',id:data.id,result:await operator.run(data.name,data.args)};}catch(e){result={type:'result',id:data.id,error:String(e.message).slice(0,600)};}if(current.readyState===1)current.send(JSON.stringify(result));});
  current.on('error',()=>{});current.on('close',()=>{clearInterval(heartbeat);if(stopped)return;console.log('Relay terputus. Menyambung ulang; tindakan tidak diputar ulang.');timer=setTimeout(connect,Math.min(30000,1000*2**Math.min(attempt++,5))+Math.random()*500);});
}
function stop(){stopped=true;clearTimeout(timer);clearInterval(heartbeat);socket?.close();operator.chrome.close();setTimeout(()=>process.exit(0),200).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);connect();
