import assert from 'node:assert/strict';
import {token,digest} from '../src/security.js';
export async function authorize(base,send,password){
  const verifier=token(),redirect='https://chatgpt.com/connector_platform_oauth_redirect';
  const client=await (await send('/oauth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({redirect_uris:[redirect],client_name:'Integration test',token_endpoint_auth_method:'none'})})).json();
  assert.ok(client.client_id);
  const query=new URLSearchParams({client_id:client.client_id,redirect_uri:redirect,response_type:'code',code_challenge:await digest(verifier),code_challenge_method:'S256',state:'test-state',resource:base+'/mcp',scope:'phone:control offline_access'});
  const consent=await send('/oauth/authorize?'+query);assert.equal(consent.status,200);const html=await consent.text();const request_id=html.match(/name="request_id" value="([^"]+)"/)[1];
  const approved=await send('/oauth/authorize',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded',cookie:consent.headers.get('set-cookie').split(';')[0],origin:base},body:new URLSearchParams({request_id,password,decision:'approve'}).toString(),redirect:'manual'});assert.equal(approved.status,302);const callback=new URL(approved.headers.get('location'));assert.equal(callback.searchParams.get('state'),'test-state');
  const form={grant_type:'authorization_code',client_id:client.client_id,code:callback.searchParams.get('code'),redirect_uri:redirect,code_verifier:verifier,resource:base+'/mcp'};
  const exchange=params=>send('/oauth/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params).toString()});
  assert.equal((await exchange({...form,code_verifier:token()})).status,400);
  const tokens=await (await exchange(form)).json();assert.ok(tokens.access_token);assert.equal(tokens.scope,'phone:control offline_access');assert.equal((await exchange(form)).status,400);
  return {tokens,client,exchange};
}
