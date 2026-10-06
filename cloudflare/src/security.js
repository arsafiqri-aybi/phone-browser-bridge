export const now=()=>Math.floor(Date.now()/1000);
export const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export const unb64=text=>Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export const token=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
export const digest=async value=>b64(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
export const escapeHtml=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function hashPassword(value,salt=token()){
  if(typeof value!=='string'||value.length<16||value.length>512)throw new Error('Password perlu 16–512 karakter.');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(value),'PBKDF2',false,['deriveBits']);
  return 'pbkdf2:100000:'+salt+':'+b64(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',iterations:100000,salt:unb64(salt)},key,256));
}
export async function verifyPassword(value,hash){
  try{const [kind,iterations,salt,expected]=hash.split(':');if(kind!=='pbkdf2'||iterations!=='100000')return false;const calculated=await hashPassword(value,salt);return calculated.split(':')[3]===expected;}catch{return false;}
}
export function json(value,status=200,headers={}){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}});}
export async function body(request){
  if(Number(request.headers.get('content-length')||0)>65536)throw new Error('Permintaan terlalu besar.');
  const text=await request.text();if(text.length>65536)throw new Error('Permintaan terlalu besar.');
  const value=(request.headers.get('content-type')||'').includes('application/json')?JSON.parse(text):Object.fromEntries(new URLSearchParams(text));
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Body harus objek.');return value;
}
export function callbackAllowed(value){
  try{const u=new URL(value);return u.origin==='https://chatgpt.com'&&!u.search&&!u.hash&&!u.username&&!u.password&&(u.pathname==='/connector_platform_oauth_redirect'||/^\/connector\/oauth\/[A-Za-z0-9_-]+$/.test(u.pathname));}catch{return false;}
}
export function cookies(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(v=>v.trim().split('=')).filter(v=>v.length===2));}
