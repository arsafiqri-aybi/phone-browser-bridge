import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {Operator} from '../src/operator.js';
const listen=(server,port)=>new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
const waitFor=async(fn)=>{let error;for(let i=0;i<80;i++){try{const r=await fn();if(r)return r;}catch(e){error=e;}await new Promise(r=>setTimeout(r,100));}throw error||Error('Not ready');};
test('Real desktop Chrome: read, fill, publish once, tabs, screenshot, upload, pause and crash journal',async t=>{
  const executable=process.env.CHROME_TEST_EXECUTABLE;if(!executable){t.skip('Set CHROME_TEST_EXECUTABLE to an installed Chrome for Testing binary. Android runtime remains a separate owner-device check.');return;}
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'bridge-real-chrome-'));let active=true;
  const native=http.createServer(async(req,res)=>{let data='';for await(const part of req)data+=part;const q=JSON.parse(data);assert.equal(req.headers.authorization,'Bearer native-fixture-token');if(q.operation==='pause')active=false;res.setHeader('content-type','application/json');res.end(JSON.stringify({active,locked:false,accessibility_connected:false,screen_awake:true}));});await listen(native,8765);
  const fixture=http.createServer((req,res)=>{res.setHeader('content-type','text/html');res.end(`<!doctype html><title>Owner fixture</title><h1>Chrome test</h1><input id="text" placeholder="Write message"><input id="password" type="password"><button id="publish" onclick="window.publications=(window.publications||0)+1;document.querySelector('#result').textContent=document.querySelector('#text').value">Publish</button><p id="result"></p><input type="file" id="file"><a href="/second">Second page</a><div style="height:1400px">Scroll content</div>`);});await listen(fixture,8793);
  const child=spawn(executable,['--no-sandbox','--headless','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9222','--user-data-dir='+dir,'http://127.0.0.1:8793/'],{stdio:'ignore'});
  const op=new Operator({mode:'devtools',nativeToken:'native-fixture-token',mediaRoot:dir,dataDir:path.join(dir,'journal')});await op.init();
  let action=0;const run=(name,args={})=>op.run(name,{...args,...(name==='phone_status'||name==='phone_read'||name==='phone_screenshot'||name==='chrome_tabs'?{}:{action_id:'actual-action-'+(++action)})});
  try{
    await waitFor(async()=>{const r=await run('phone_status');return r.chrome_connected;});assert.equal((await run('phone_status')).ready,true);
    let snap=await waitFor(async()=>{const r=await run('phone_read');return r.title==='Owner fixture'&&r;});assert.ok(snap.nodes.length>3);
    const input=snap.nodes.find(n=>n.editable&&!n.password&&n.tag==='INPUT');await run('phone_fill',{ref:input.ref,text:'hello from real CDP'});
    await assert.rejects(()=>run('phone_click',{ref:input.ref}),/Ref kedaluwarsa/);
    snap=await run('phone_read');const password=snap.nodes.find(n=>n.password);assert.equal(password.value,'[withheld]');await assert.rejects(()=>run('phone_fill',{ref:password.ref,text:'secret'}),/JavaScript gagal/);
    snap=await run('phone_read');const button=snap.nodes.find(n=>n.text==='Publish');const id='publish-once-001';await op.run('phone_click',{ref:button.ref,action_id:id});assert.equal((await op.run('phone_click',{ref:button.ref,action_id:id})).duplicate,true);
    const result=await run('chrome_evaluate',{expression:'({count:window.publications,text:document.querySelector("#result").textContent})'});assert.deepEqual(result.result,{count:1,text:'hello from real CDP'});
    await assert.rejects(()=>op.run('phone_click',{ref:'v99-e1',action_id:id}),/perintah berbeda/);
    const shot=await run('phone_screenshot');assert.ok(shot.width>300&&shot.height>200);await fs.writeFile(process.env.CHROME_TEST_SCREENSHOT||path.join(dir,'screenshot.jpg'),Buffer.from(shot.base64,'base64'));
    await run('phone_tap',{x:10,y:10,frame_id:shot.frame_id});await assert.rejects(()=>run('phone_tap',{x:10,y:10,frame_id:shot.frame_id}),/kedaluwarsa/);
    const file=path.join(dir,'owner.txt');await fs.writeFile(file,'Owner-selected fixture');await run('chrome_upload',{selector:'#file',files:[file]});assert.equal((await run('chrome_evaluate',{expression:'document.querySelector("#file").files[0].name'})).result,'owner.txt');
    await assert.rejects(()=>run('chrome_upload',{selector:'#file',files:['/etc/passwd']}),/di luar/);
    const created=await run('chrome_new_tab',{url:'http://127.0.0.1:8793/second'});assert.ok((await run('chrome_tabs')).tabs.some(t=>t.tab_id===created.tab_id));await run('chrome_close_tab',{tab_id:created.tab_id});await run('chrome_reload');
    await assert.rejects(()=>run('phone_open_url',{url:'https://chatgpt.com/'}),/dilindungi/);
    const restarted=new Operator(op.config);await restarted.init();assert.equal((await restarted.run('phone_click',{ref:button.ref,action_id:id})).duplicate,true);
    await run('phone_handoff',{reason:'Owner pause'});assert.equal((await run('phone_status')).active,false);await assert.rejects(()=>run('chrome_evaluate',{expression:'1+1'}),/dijeda/);
  }finally{op.chrome.close();child.kill();await new Promise(r=>native.close(r));await new Promise(r=>fixture.close(r));await fs.rm(dir,{recursive:true,force:true});}
});
