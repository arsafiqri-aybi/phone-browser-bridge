#!/usr/bin/env node
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),cwd=path.join(root,'source/cloudflare');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'phone-bridge-test-'));
const log=fs.openSync(path.join(temp,'worker.log'),'w');
const url='http://127.0.0.1:8791';
const testEnv={...process.env,WRANGLER_SEND_METRICS:'false',XDG_CONFIG_HOME:process.env.XDG_CONFIG_HOME||path.join(temp,'config'),...(process.env.CODEX_PROXY_CERT?{NODE_EXTRA_CA_CERTS:process.env.CODEX_PROXY_CERT}:{})};
const server=spawn(path.join(cwd,'node_modules/.bin/wrangler'),['dev','--local','--ip','127.0.0.1','--port','8791','--persist-to',path.join(temp,'state')],{cwd,detached:true,stdio:['ignore',log,log],env:testEnv});
let code=1;
try {
  let ready=false;
  for(let i=0;i<120;i++){
    try{const r=await fetch(url+'/.well-known/oauth-authorization-server',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}
    if(server.exitCode!==null)throw Error('Worker exited; inspect '+temp+'/worker.log');
    await new Promise(r=>setTimeout(r,250));
  }
  if(!ready)throw Error('Worker startup timeout; inspect '+temp+'/worker.log');
  const child=spawn(process.execPath,['--test','tests/integration.test.js','tests/protocol.test.js'],{cwd,stdio:'inherit',env:{...process.env,BRIDGE_TEST_URL:url}});
  code=await new Promise(resolve=>child.once('exit',resolve));
}finally{
  try{process.kill(-server.pid,'SIGTERM');}catch{}
  await new Promise(r=>setTimeout(r,500));
  fs.closeSync(log);
  if(code===0)fs.rmSync(temp,{recursive:true,force:true});else console.error('Local test diagnostics:',path.join(temp,'worker.log'));
}
process.exit(code??1);
