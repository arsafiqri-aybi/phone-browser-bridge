// Run only with an owner-authorized physical Android 12 fixture and an OAuth access token.
import {Client} from '../source/cloudflare/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StreamableHTTPClientTransport} from '../source/cloudflare/node_modules/@modelcontextprotocol/sdk/dist/esm/client/streamableHttp.js';
import fs from 'node:fs';
if(!process.env.BRIDGE_MCP_URL||!process.env.BRIDGE_MCP_ACCESS_TOKEN||!process.env.BRIDGE_DEVICE_ID||!process.env.BRIDGE_TAB_ID)throw Error('Set BRIDGE_MCP_URL, BRIDGE_MCP_ACCESS_TOKEN, BRIDGE_DEVICE_ID and BRIDGE_TAB_ID securely.');
if(process.env.BRIDGE_PHYSICAL_FIXTURE!=='ANDROID_12_OWNER_AUTHORIZED')throw Error('Explicit physical fixture declaration required; it is not itself evidence of a device.');
const client=new Client({name:'physical-device-soak',version:'0.1.0'});await client.connect(new StreamableHTTPClientTransport(new URL(process.env.BRIDGE_MCP_URL),{requestInit:{headers:{Authorization:'Bearer '+process.env.BRIDGE_MCP_ACCESS_TOKEN}}}));
const events=[],start=Date.now();let failures=0;
const call=async(name,args={})=>{const t=performance.now();try{const r=await client.callTool({name,arguments:args});events.push({at:new Date().toISOString(),elapsedSeconds:(Date.now()-start)/1000,method:name,millis:performance.now()-t,success:!r.isError,image:name==='screenshot'?r.content.some(x=>x.type==='image'):undefined});if(r.isError)failures++;}catch{failures++;events.push({at:new Date().toISOString(),method:name,success:false,reasonCode:'TRANSPORT_ERROR'});}};
try{
  await call('select_device',{deviceId:process.env.BRIDGE_DEVICE_ID});
  while(Date.now()-start<3600000){
    const elapsed=Date.now()-start;const method=elapsed<900000?'read':elapsed<1800000?'screenshot':Math.floor(elapsed/5000)%2?'read':'screenshot';
    await Promise.all([call('status'),call(method,{tabId:process.env.BRIDGE_TAB_ID})]);
    await new Promise(r=>setTimeout(r,5000));
  }
}finally{await client.close();fs.writeFileSync(process.env.BRIDGE_EVIDENCE_FILE||'physical-soak-metadata.local.json',JSON.stringify({status:failures?'FAIL':'UNCERTAIN',physicalDeviceClaim:'requires independent owner/device evidence',manualInterruptions:'NOT_AUTOMATICALLY_VERIFIED',durationSeconds:(Date.now()-start)/1000,events},null,2));}
// Even success needs manual Wi-Fi/debug port change, screen off/unlock, overlay, update and process inventory evidence.
if(failures)process.exitCode=1;
