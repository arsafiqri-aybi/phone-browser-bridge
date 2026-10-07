import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {createHash,randomUUID} from 'node:crypto';
import WebSocket from 'ws';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const base=process.env.BRIDGE_TEST_URL||'http://127.0.0.1:8787';
const password=process.env.BRIDGE_TEST_PASSWORD||fs.readFileSync(new URL('../.dev.vars',import.meta.url),'utf8').match(/^OWNER_PASSWORD=(.+)$/m)?.[1];
const hash=s=>createHash('sha256').update(s).digest('base64url');
const action=()=>randomUUID().replaceAll('-','');
async function req(path,{method='GET',data,cookie,token,form,headers={}}={}) {
  const r=await fetch(base+path,{method,redirect:'manual',headers:{...(data?{'Content-Type':'application/json'}:{}),...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(cookie?{Cookie:cookie,Origin:base}:{}),...(token?{Authorization:'Bearer '+token}:{}),...headers},body:data?JSON.stringify(data):form?.toString()});
  let out;try{out=await r.json();}catch{out=null;}return {r,out};
}
async function login(){const {r}=await req('/api/login',{method:'POST',data:{password}});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
async function enroll(cookie,alias){const {out:e}=await req('/api/enrollment',{method:'POST',cookie,data:{}});const {r,out}=await req('/api/enroll',{method:'POST',data:{enrollmentToken:e.enrollmentToken,alias}});assert.equal(r.status,201);return {...out,enrollmentToken:e.enrollmentToken};}
async function oauth(cookie,devices,scope='bridge:read bridge:control') {
  const redirect='https://client.example/callback';const {out:c}=await req('/oauth/register',{method:'POST',data:{redirect_uris:[redirect],token_endpoint_auth_method:'none'}});
  const verifier=action()+action(),params=new URLSearchParams({client_id:c.client_id,redirect_uri:redirect,response_type:'code',code_challenge:hash(verifier),code_challenge_method:'S256',resource:base+'/mcp',scope,state:'state-for-this-authorization',approve:'yes'});
  for(const d of devices)params.append('device',d);
  const {r}=await req('/oauth/authorize',{method:'POST',cookie,form:params});assert.equal(r.status,302);
  const u=new URL(r.headers.get('location'));assert.equal(u.searchParams.get('state'),'state-for-this-authorization');
  const form=new URLSearchParams({grant_type:'authorization_code',client_id:c.client_id,redirect_uri:redirect,code:u.searchParams.get('code'),code_verifier:verifier,resource:base+'/mcp'});
  const wrongVerifier=new URLSearchParams(form);wrongVerifier.set('code_verifier','x'.repeat(64));assert.equal((await req('/oauth/token',{method:'POST',form:wrongVerifier})).r.status,401);
  const wrongResource=new URLSearchParams(form);wrongResource.set('resource','https://foreign.example/mcp');assert.equal((await req('/oauth/token',{method:'POST',form:wrongResource})).r.status,401);
  const {r:tr,out}=await req('/oauth/token',{method:'POST',form});assert.equal(tr.status,200);
  assert.equal((await req('/oauth/token',{method:'POST',form})).r.status,401);
  return {...out,clientId:c.client_id};
}
async function client(token) {
  const c=new Client({name:'node-sdk-local-validation',version:'1.0.0'},{capabilities:{}});
  await c.connect(new StreamableHTTPClientTransport(new URL(base+'/mcp'),{requestInit:{headers:{Authorization:'Bearer '+token}}}));return c;
}
const call=async(c,name,args={})=>{const r=await c.callTool({name,arguments:args});return {...r,value:r.content?.find(x=>x.type==='text')?JSON.parse(r.content.find(x=>x.type==='text').text):null};};
async function agent(d,handle=()=>({ok:true})){const ws=new WebSocket(base.replace('http:','ws:')+'/api/device/socket',{headers:{Authorization:'Bearer '+d.deviceToken}});let generation;const welcome=new Promise((resolve,reject)=>{ws.once('error',reject);ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='welcome'){generation=m.connectionGeneration;ws.send(JSON.stringify({type:'heartbeat',protocolVersion:1,connectionGeneration:generation,status:{ownerIntent:'active',adb:{state:'healthy',checkedAt:Date.now()},chrome:{state:'healthy',checkedAt:Date.now()}}}));resolve();}if(m.type==='command')Promise.resolve(handle(m,ws)).then(result=>{if(result!==undefined&&ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'response',protocolVersion:1,requestId:m.requestId,actionId:m.actionId,payloadDigest:m.payloadDigest,connectionGeneration:m.connectionGeneration,status:'DONE',result}));});});});await welcome;await new Promise(r=>setTimeout(r,30));return {ws,get generation(){return generation;}};}

test('local Worker with real Durable Objects and official MCP client',async(t)=>{
  const cookie=await login(),a=await enroll(cookie,'Fixture A'),b=await enroll(cookie,'Fixture B');
  const auth=await oauth(cookie,[a.deviceId,b.deviceId]);const c=await client(auth.access_token);
  const narrowAuth=await oauth(cookie,[a.deviceId],'bridge:read');const narrow=await client(narrowAuth.access_token);
  let agentA,agentB;const clean=[];
  try{
    await t.test('MCP initialize/list, unauthenticated endpoints, CSRF and enrollment replay',async()=>{
      const tools=await c.listTools();assert(tools.tools.some(x=>x.name==='screenshot'));assert(!tools.tools.some(x=>x.name==='shell'));
      assert.equal((await req('/api/devices')).r.status,401);
      assert.equal((await req('/internal/auth',{token:auth.access_token})).r.status,404);
      assert.equal((await req('/api/enroll',{method:'POST',data:{enrollmentToken:a.enrollmentToken,alias:'replay'}})).r.status,401);
      assert.equal((await req('/api/enrollment',{method:'POST',data:{},headers:{Cookie:cookie,Origin:'https://evil.example'}})).r.status,403);
      assert.equal((await call(c,'tabs')).value.error.code,'EXPLICIT_DEVICE_SELECTION_REQUIRED');
    });
    await t.test('explicit offline target and isolated device scope',async()=>{
      assert.equal((await call(narrow,'select_device',{deviceId:b.deviceId})).value.error.code,'DEVICE_SCOPE_DENIED');
      await call(c,'select_device',{deviceId:b.deviceId});assert.equal((await call(c,'tabs')).value.error.code,'DEVICE_OFFLINE');
      agentA=await agent(a);clean.push(agentA.ws);
      assert.equal((await call(c,'tabs')).value.error.code,'DEVICE_OFFLINE');
      await call(c,'select_device',{deviceId:a.deviceId});assert.equal((await call(c,'tabs')).value.status,'DONE');
      await call(narrow,'select_device',{deviceId:a.deviceId});assert.equal((await call(narrow,'navigate',{tabId:'tab',url:'https://example.com',actionId:action()})).value.error.code,'TOOL_SCOPE_DENIED');
    });
    await t.test('device credential rotation preserves identity and invalidates previous credential',async()=>{
      const old=b.deviceToken;const {r,out}=await req('/api/device/renew',{method:'POST',token:old,data:{}});assert.equal(r.status,200);b.deviceToken=out.deviceToken;
      assert.equal((await req('/api/device/renew',{method:'POST',token:old,data:{}})).r.status,401);
      assert.equal((await req('/api/device/renew',{method:'POST',token:auth.access_token,data:{}})).r.status,403);
    });
    await t.test('durable duplicate mutation, conflict and lost acknowledgement',async()=>{
      let executed=0;agentA.ws.close();await once(agentA.ws,'close');
      agentA=await agent(a,()=>{executed++;return {done:true};});clean.push(agentA.ws);
      const id=action(),args={tabId:'tab',url:'https://example.com',actionId:id};
      assert.equal((await call(c,'navigate',args)).value.status,'DONE');assert.equal((await call(c,'navigate',args)).value.status,'DONE');assert.equal(executed,1);
      assert.equal((await call(c,'navigate',{...args,url:'https://different.example'})).value.error.code,'ACTION_CONFLICT');
      agentA.ws.close();await once(agentA.ws,'close');agentA=await agent(a,(m,ws)=>{executed++;ws.close();});clean.push(agentA.ws);
      const ambiguous=action();assert.equal((await call(c,'navigate',{...args,actionId:ambiguous})).value.status,'UNKNOWN');
      assert.equal((await call(c,'receipt',{actionId:ambiguous})).value.status,'UNKNOWN');
      const count=executed;assert.equal((await call(c,'navigate',{...args,actionId:ambiguous})).value.status,'UNKNOWN');assert.equal(executed,count);
    });
    await t.test('capture stall does not block status or independent browser read; valid image content',async()=>{
      agentA=await agent(a,(m,ws)=>{
        if(m.method==='screenshot'){setTimeout(()=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:'response',protocolVersion:1,requestId:m.requestId,actionId:m.actionId,payloadDigest:m.payloadDigest,connectionGeneration:m.connectionGeneration,status:'ERROR',error:{code:'SCREENSHOT_UNAVAILABLE'}}));},300);return;}
        return {text:'fixture',untrustedContent:true};
      });clean.push(agentA.ws);
      const pending=call(c,'screenshot',{tabId:'tab'});const start=Date.now();assert.equal((await call(c,'status')).value.online,true);assert(Date.now()-start<1000);assert.equal((await call(c,'read',{tabId:'tab'})).value.status,'DONE');assert.equal((await pending).value.error.code,'SCREENSHOT_UNAVAILABLE');
      agentA.ws.close();await once(agentA.ws,'close');
      agentA=await agent(a,()=>({data:fs.readFileSync(new URL('../../../tests/fixture.jpg',import.meta.url)).toString('base64'),mimeType:'image/jpeg',width:1,height:1,bytes:631,capturedAt:Date.now()}));clean.push(agentA.ws);
      const image=await c.callTool({name:'screenshot',arguments:{tabId:'tab'}});assert.equal(image.isError,false);assert.equal(image.content[0].type,'image');assert.equal(image.content[0].mimeType,'image/jpeg');assert(Buffer.from(image.content[0].data,'base64').subarray(0,3).equals(Buffer.from([255,216,255])));
    });
    await t.test('revocation closes one device and prevents its reconnect, leaves other device available',async()=>{
      agentB=await agent(b);clean.push(agentB.ws);
      assert.equal((await req('/api/revoke',{method:'POST',cookie,data:{deviceId:a.deviceId}})).r.status,200);
      assert.equal((await call(c,'status')).value.error.code,'DEVICE_SCOPE_DENIED');
      await call(c,'select_device',{deviceId:b.deviceId});assert.equal((await call(c,'tabs')).value.status,'DONE');
      const rejected=new WebSocket(base.replace('http:','ws:')+'/api/device/socket',{headers:{Authorization:'Bearer '+a.deviceToken}});const [error]=await once(rejected,'error');assert(error.message.includes('401'));
    });
    await t.test('refresh tokens cannot control devices, rotate on use, and owner can revoke client grants',async()=>{
      assert.equal((await req('/api/devices',{token:narrowAuth.refresh_token})).r.status,401);
      const form=new URLSearchParams({grant_type:'refresh_token',refresh_token:narrowAuth.refresh_token,client_id:narrowAuth.clientId,resource:base+'/mcp'});
      const {r,out}=await req('/oauth/token',{method:'POST',form});assert.equal(r.status,200);
      assert.equal((await req('/oauth/token',{method:'POST',form})).r.status,401);
      assert.equal((await req('/api/revoke-client',{method:'POST',cookie,data:{clientId:narrowAuth.clientId}})).r.status,200);
      assert.equal((await req('/api/devices',{token:out.access_token})).r.status,401);
    });
  }finally{for(const ws of clean)ws.close();await c.close();await narrow.close();await req('/api/revoke',{method:'POST',cookie,data:{deviceId:b.deviceId}});await req('/api/logout',{method:'POST',cookie,data:{}});}
});
