import WebSocket from 'ws';
import {Operator} from './operator.js';
import {AndroidLink} from './android-link.js';
import {Relay} from './relay.js';
import path from 'node:path';
const tokenPattern=/^[A-Za-z0-9_-]{43}$/;
const base=new URL(process.env.PUBLIC_BASE_URL||'https://phone-chrome-mcp.arsafiqri-ua03.workers.dev');
if(base.protocol!=='https:'||base.pathname!=='/'||base.search||base.username||base.password)throw Error('PUBLIC_BASE_URL harus origin HTTPS.');
if(!tokenPattern.test(process.env.PHONE_TOKEN||'')||!tokenPattern.test(process.env.NATIVE_TOKEN||''))throw Error('Jalankan npm run setup dahulu. Token tidak valid.');
const mode=process.env.CONTROL_MODE||'devtools';if(!['devtools','accessibility'].includes(mode))throw Error('CONTROL_MODE tidak valid.');
const operator=new Operator({mode,nativeToken:process.env.NATIVE_TOKEN,mediaRoot:process.env.MEDIA_ROOT,dataDir:path.resolve('data')});await operator.init();
const android=new AndroidLink();let stopped=false,relayConnected=false,healthTimer;
const relay=new Relay({createSocket:()=>new WebSocket(new URL('/device/connect',base).href.replace(/^https:/,'wss:'),{headers:{authorization:'Bearer '+process.env.PHONE_TOKEN},maxPayload:6*1024*1024,handshakeTimeout:15000}),run:(name,args)=>operator.run(name,args),onState:value=>{relayConnected=value;}});
async function health(){
  if(stopped)return;
  try{
    const link=mode==='devtools'?await android.ensure():{};
    const status=await operator.run('phone_status',{});
    if(!stopped)await operator.native('agent_heartbeat',{relay_connected:relayConnected,chrome_connected:!!status.chrome_connected,mode,...link});
  }catch{/* Do not log credentials or page content. */}
  finally{if(!stopped)healthTimer=setTimeout(health,15000);}
}
function stop(){if(stopped)return;stopped=true;clearTimeout(healthTimer);relay.stop();operator.chrome.close();setTimeout(()=>process.exit(0),250).unref();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);relay.start();health();
