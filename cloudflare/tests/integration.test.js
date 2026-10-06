import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import fs from 'node:fs/promises';
import {hashPassword,digest,token} from '../src/security.js';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {authorize} from './oauth-helper.js';
test('Actual workerd OAuth, SDK MCP, persistent state and authenticated phone socket',async()=>{
  const base='http://localhost:8791',password='test-owner-password-long-123',device=token();
  const modules=await Promise.all(['worker','security','catalog','auth','ui'].map(async n=>({type:'ESModule',path:new URL('../src/'+n+'.js',import.meta.url).pathname,contents:await fs.readFile(new URL('../src/'+n+'.js',import.meta.url),'utf8')})));
  const mf=new Miniflare(convertV4MiniflareOptions({modules,port:8791,compatibilityDate:'2026-10-06',bindings:{PUBLIC_BASE_URL:base,OWNER_PASSWORD_HASH:await hashPassword(password),PHONE_TOKEN_HASH:await digest(device)},durableObjects:{PHONE_HUB:{className:'PhoneHub',useSQLite:true}}}));
  try{
    await mf.ready;const send=(route,init)=>mf.dispatchFetch(base+route,init);
    assert.equal((await send('/mcp')).status,401);const publicList=await send('/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});assert.equal((await publicList.json()).result.tools.length,18);assert.equal((await send('/mcp',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'phone_status',arguments:{}}})})).status,401);assert.equal((await send('/admin/state')).status,401);
    assert.equal((await send('/healthz',{headers:{origin:'https://evil.example'}})).status,200);
    assert.equal((await send('/oauth/register',{method:'POST',headers:{origin:'https://evil.example'}})).status,403);
    assert.equal((await send('/device/connect',{headers:{upgrade:'websocket',authorization:'Bearer '+token()}})).status,401);
    const {tokens,client,exchange}=await authorize(base,send,password);
    const sdk=new Client({name:'actual-sdk-test',version:'1.0.0'});await sdk.connect(new StreamableHTTPClientTransport(new URL(base+'/mcp'),{fetch:(url,init)=>mf.dispatchFetch(String(url),init),requestInit:{headers:{authorization:'Bearer '+tokens.access_token}}}));
    assert.equal((await sdk.listTools()).tools.length,18);
    const status=await sdk.callTool({name:'phone_status',arguments:{}});assert.equal(JSON.parse(status.content[0].text).device_connected,false);
    const connected=await send('/device/connect',{headers:{upgrade:'websocket',authorization:'Bearer '+device}});assert.equal(connected.status,101);const ws=connected.webSocket;ws.accept();
    ws.addEventListener('message',e=>{const q=JSON.parse(e.data);if(q.type==='command')ws.send(JSON.stringify({type:'result',id:q.id,result:{active:true,mode:'fixture',native_connected:true}}));});
    const live=await sdk.callTool({name:'phone_status',arguments:{}});assert.equal(JSON.parse(live.content[0].text).device_connected,true);
    assert.equal((await sdk.callTool({name:'phone_click',arguments:{ref:'bad',action_id:'action-0001'}})).isError,true);
    ws.close();await sdk.close();
    const refreshed=await (await exchange({grant_type:'refresh_token',client_id:client.client_id,refresh_token:tokens.refresh_token,resource:base+'/mcp'})).json();assert.ok(refreshed.access_token);
    assert.equal((await exchange({grant_type:'refresh_token',client_id:client.client_id,refresh_token:tokens.refresh_token,resource:base+'/mcp'})).status,400);
    assert.equal((await send('/mcp',{headers:{authorization:'Bearer '+refreshed.access_token}})).status,401);
  }finally{await mf.dispose();}
});
