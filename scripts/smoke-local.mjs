#!/usr/bin/env node
import fs from 'node:fs';
const base=process.env.BRIDGE_TEST_URL||'http://127.0.0.1:8787';
const password=fs.readFileSync(new URL('../source/cloudflare/.dev.vars',import.meta.url),'utf8').match(/^OWNER_PASSWORD=(.+)$/m)?.[1];
const login=await fetch(base+'/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
if(!login.ok)throw Error('OWNER_LOGIN_FAILED');
const cookie=login.headers.get('set-cookie').split(';')[0];
const devices=await fetch(base+'/api/devices',{headers:{Cookie:cookie}});const result=await devices.json();
if(!devices.ok||!Array.isArray(result.devices))throw Error('DEVICE_REGISTRY_FAILED');
const unauthorized=await fetch(base+'/api/devices');if(unauthorized.status!==401)throw Error('AUTH_NEGATIVE_CHECK_FAILED');
await fetch(base+'/api/logout',{method:'POST',headers:{Cookie:cookie,Origin:base,'Content-Type':'application/json'},body:'{}'});
console.log('PASS: owner login, authenticated device registry, and anonymous access denial. Local development only.');
