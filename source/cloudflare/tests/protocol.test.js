import test from 'node:test';
import assert from 'node:assert/strict';
import {validateCommand,canonical,hash,authorizeDevice,requireOrigin,body} from '../src/protocol.js';

test('scope binds owner, device and revocation',()=>{
  const p={ownerId:'A',devices:['deviceA']};const device={ownerId:'A',deviceId:'deviceA',revoked:false};
  assert.doesNotThrow(()=>authorizeDevice(p,device));
  for(const d of [{...device,ownerId:'B'},{...device,deviceId:'deviceB'},{...device,revoked:true},null])assert.throws(()=>authorizeDevice(p,d),/DEVICE_SCOPE_DENIED/);
});
test('method, URL, schema and action consent validation',()=>{
  for(const method of ['shell','evaluate','cookies','file_read'])assert.throws(()=>validateCommand(method,{}),/UNSUPPORTED_METHOD/);
  for(const url of ['javascript:alert(1)','file:///etc/passwd','https://user:secret@example.com'])assert.throws(()=>validateCommand('open',{url}),/BAD_URL/);
  assert.throws(()=>validateCommand('read',{tabId:'abc;rm -rf /'}),/BAD_TAB_ID/);
  assert.throws(()=>validateCommand('read',{tabId:'abc',script:'alert(1)'}),/UNKNOWN_FIELD/);
  assert.throws(()=>validateCommand('click',{tabId:'abc',ref:'1'}),/EXPLICIT_ACTION_CONSENT_REQUIRED/);
  assert.doesNotThrow(()=>validateCommand('type',{tabId:'abc',ref:'1',documentId:'doc',generation:1,expectedOrigin:'https://example.com',text:'hello',consent:true}));
});
test('digest stable across property order, different for different actions',async()=>{
  assert.equal(canonical({b:1,a:['x',null]}),'{"a":["x",null],"b":1}');
  assert.equal(await hash(canonical({method:'tabs',payload:{}})),'52c7455a2098c840b37b6f4fab04a03a7b7cd2a9f5b2b62f08a27d2ecae3aca7');
  assert.notEqual(await hash(canonical({method:'read',payload:{tabId:'a'}})),await hash(canonical({method:'read',payload:{tabId:'b'}})));
});
test('cross origin denied and body streaming capped',async()=>{
  assert.throws(()=>requireOrigin(new Request('https://own.example/api/login',{headers:{Origin:'https://foreign.example'}})),/ORIGIN_DENIED/);
  await assert.rejects(body(new Request('https://own.example/',{method:'POST',body:'x'.repeat(70000)})),/BODY_TOO_LARGE/);
});
