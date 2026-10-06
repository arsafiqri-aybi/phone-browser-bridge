import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {chromium} from 'playwright';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {hashPassword,digest,token} from '../src/security.js';
import {Operator} from '../../agent/src/operator.js';
import {authorize} from './oauth-helper.js';
const listen=(s,p)=>new Promise(r=>s.listen(p,'127.0.0.1',r));
const ready=async fn=>{for(let i=0;i<60;i++){try{if(await fn())return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Chrome fixture failed to start');};
test('Workerd MCP → authenticated socket → agent → real Chrome, and rendered mobile/desktop panel',async t=>{
  if(!process.env.CHROME_TEST_EXECUTABLE){t.skip('CHROME_TEST_EXECUTABLE required for actual Chrome/visual verification.');return;}
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bridge-system-')),base='http://localhost:8795',password='system-test-owner-pass-456',device=token();let active=true;
  const native=http.createServer(async(req,res)=>{let raw='';for await(const p of req)raw+=p;const q=JSON.parse(raw);if(q.operation==='pause')active=false;res.setHeader('content-type','application/json');res.end(JSON.stringify({active,locked:false,accessibility_connected:false,screen_awake:true}));});await listen(native,8766);
  // Native fixture port differs from production; intercept only the local test's status request.
  const fixture=http.createServer((req,res)=>res.end('<!doctype html><title>Cloud to real Chrome</title><h1>End to end</h1><input placeholder="Message"><button onclick="document.querySelector(\'p\').textContent=document.querySelector(\'input\').value">Publish</button><p></p>'));await listen(fixture,8796);
  const chrome=spawn(process.env.CHROME_TEST_EXECUTABLE,['--no-sandbox','--headless','--remote-debugging-port=9223','--user-data-dir='+dir,'http://127.0.0.1:8796/'],{stdio:'ignore'});
  const op=new Operator({mode:'devtools',nativeToken:'fixture',mediaRoot:dir,dataDir:path.join(dir,'journal')});op.chrome.port=9223;
  op.native=async(operation)=>{const r=await fetch('http://127.0.0.1:8766',{method:'POST',body:JSON.stringify({operation})});return r.json();};await op.init();
  const modules=await Promise.all(['worker','security','catalog','auth','ui'].map(async n=>({type:'ESModule',path:new URL('../src/'+n+'.js',import.meta.url).pathname,contents:await fs.readFile(new URL('../src/'+n+'.js',import.meta.url),'utf8')})));
  const mf=new Miniflare(convertV4MiniflareOptions({modules,port:8795,compatibilityDate:'2026-10-06',bindings:{PUBLIC_BASE_URL:base,OWNER_PASSWORD_HASH:await hashPassword(password),PHONE_TOKEN_HASH:await digest(device)},durableObjects:{PHONE_HUB:{className:'PhoneHub',useSQLite:true}}}));let browser,sdk,ws;
  try{
    await mf.ready;await ready(async()=>{await op.chrome.ready();return true;});const send=(route,init)=>mf.dispatchFetch(base+route,init);
    ws=(await send('/device/connect',{headers:{upgrade:'websocket',authorization:'Bearer '+device}})).webSocket;ws.accept();ws.addEventListener('message',async e=>{const q=JSON.parse(e.data);if(q.type!=='command')return;try{ws.send(JSON.stringify({type:'result',id:q.id,result:await op.run(q.name,q.args)}));}catch(e){ws.send(JSON.stringify({type:'result',id:q.id,error:e.message}));}});
    const {tokens}=await authorize(base,send,password);sdk=new Client({name:'system-test',version:'1'});await sdk.connect(new StreamableHTTPClientTransport(new URL(base+'/mcp'),{fetch:(u,i)=>mf.dispatchFetch(String(u),i),requestInit:{headers:{authorization:'Bearer '+tokens.access_token}}}));
    const call=async(name,args={})=>{const r=await sdk.callTool({name,arguments:args});assert.ok(!r.isError,r.content?.[0]?.text);return JSON.parse(r.content[0].text);};assert.equal((await call('phone_status')).ready,true);
    let read=await call('phone_read');await call('phone_fill',{ref:read.nodes.find(n=>n.tag==='INPUT').ref,text:'Actual cloud runtime to Chrome',action_id:'system-fill-001'});read=await call('phone_read');await call('phone_click',{ref:read.nodes.find(n=>n.tag==='BUTTON').ref,action_id:'system-publish-001'});assert.ok((await call('phone_read')).text.includes('Actual cloud runtime to Chrome'));
    const shot=await sdk.callTool({name:'phone_screenshot',arguments:{}});assert.equal(shot.content[1].mimeType,'image/jpeg');assert.ok(shot.content[1].data.length>1000);
    browser=await chromium.launch({executablePath:process.env.CHROME_TEST_EXECUTABLE,headless:true,args:['--no-sandbox']});const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/admin');await page.getByLabel('Password pemilik').fill(password);await page.getByRole('button',{name:'Masuk ke panel'}).click();await page.getByText('HP tersambung',{exact:true}).waitFor();await page.getByRole('heading',{name:'Siap menjalankan perintah.'}).waitFor();
    const output=process.env.UI_TEST_OUTPUT||dir;await fs.mkdir(output,{recursive:true});await page.setViewportSize({width:1280,height:1100});await page.screenshot({path:path.join(output,'panel-desktop.png'),fullPage:true});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'panel-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const button=page.getByRole('button',{name:'Jeda kendali'});assert.ok((await button.boundingBox()).height>=48);await button.focus();assert.equal(await button.evaluate(e=>e===document.activeElement),true);
    assert.equal((await send('/admin/pause',{method:'POST',headers:{cookie:(await context.cookies()).map(c=>c.name+'='+c.value).join(';'),origin:base,'x-csrf-token':'bad'}})).status,403);
    await button.click();await page.getByRole('heading',{name:'Kendali sedang dijeda.'}).waitFor();assert.equal(active,false);assert.deepEqual(errors,[]);
  }finally{await browser?.close();await sdk?.close();ws?.close();op.chrome.close();chrome.kill();await mf.dispose();await new Promise(r=>native.close(r));await new Promise(r=>fixture.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
