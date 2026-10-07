import {BridgeError, body, json, hash, randomToken, validId, authorizeDevice, timingEqual, requireOrigin} from './protocol.js';

const TTL=3600000;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export class Registry {
  constructor(ctx,env) {
    this.ctx=ctx;this.env=env;this.sql=ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,owner TEXT,alias TEXT,revoked INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS credentials(hash TEXT PRIMARY KEY,kind TEXT,owner TEXT,device TEXT,scopes TEXT,expires INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS enrollments(hash TEXT PRIMARY KEY,owner TEXT,expires INTEGER,used INTEGER DEFAULT 0)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS clients(id TEXT PRIMARY KEY,redirects TEXT)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS codes(hash TEXT PRIMARY KEY,client TEXT,redirect TEXT,challenge TEXT,resource TEXT,owner TEXT,scopes TEXT,expires INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,credential TEXT,owner TEXT,selected TEXT,expires INTEGER)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS rates(key TEXT PRIMARY KEY,minute INTEGER,count INTEGER)`);
  }
  one(query,...args){return this.sql.exec(query,...args).toArray()[0];}
  device(row){return row?{deviceId:row.id,ownerId:row.owner,alias:row.alias,revoked:!!row.revoked}:null;}
  async principal(request) {
    const bearer=request.headers.get('Authorization'); const cookie=request.headers.get('Cookie')?.match(/(?:^|;\s*)bridge_session=([a-z0-9]+)/)?.[1];
    const token=bearer?.startsWith('Bearer ')?bearer.slice(7):cookie;
    if(!token)throw new BridgeError('UNAUTHORIZED',401);
    const digest=await hash(token),row=this.one('SELECT * FROM credentials WHERE hash=?',digest);
    if(!row||row.expires<Date.now()||row.kind==='refresh')throw new BridgeError('TOKEN_EXPIRED_OR_REVOKED',401);
    const scope=JSON.parse(row.scopes);
    return {ownerId:row.owner,deviceId:row.device,devices:scope.devices,permissions:scope.permissions,kind:row.kind,expiresAt:row.expires,credentialHash:digest,cookie:!bearer};
  }
  owner(p){if(p.kind!=='panel')throw new BridgeError('OWNER_SESSION_REQUIRED',403);}
  rate(request,route,max=30){
    const key=route+':'+(request.headers.get('CF-Connecting-IP')||'local');const minute=Math.floor(Date.now()/60000);
    const r=this.one('SELECT * FROM rates WHERE key=?',key);
    if(r?.minute===minute&&r.count>=max)throw new BridgeError('RATE_LIMITED',429);
    this.sql.exec('INSERT OR REPLACE INTO rates VALUES(?,?,?)',key,minute,r?.minute===minute?r.count+1:1);
    this.sql.exec('DELETE FROM rates WHERE minute<?',minute-2);
  }
  async issue(kind,owner,device,scope,expires=Date.now()+TTL){const token=randomToken();this.sql.exec('INSERT INTO credentials VALUES(?,?,?,?,?,?)',await hash(token),kind,owner,device,JSON.stringify(scope),expires);return token;}
  async fetch(request) {
    try{return await this.route(request);}catch(e){return json({error:{code:e instanceof BridgeError?e.code:'INTERNAL_ERROR'}},e instanceof BridgeError?e.status:500);}
  }
  async route(request) {
    const url=new URL(request.url),path=url.pathname,now=Date.now();
    if(path==='/api/login'&&request.method==='POST') {
      requireOrigin(request);this.rate(request,'login',5);const input=await body(request);
      if(!this.env.OWNER_PASSWORD||typeof input.password!=='string'||!timingEqual(await hash(input.password),await hash(this.env.OWNER_PASSWORD)))throw new BridgeError('LOGIN_FAILED',401);
      const token=await this.issue('panel','owner',null,{devices:'*',permissions:['read','control']});
      const secure=url.hostname!=='127.0.0.1'&&url.hostname!=='localhost'?'; Secure':'';
      return json({ok:true},200,{'Set-Cookie':`bridge_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600${secure}`});
    }
    if(path==='/api/enroll'&&request.method==='POST') {
      this.rate(request,'enroll',10);const input=await body(request),digest=await hash(String(input.enrollmentToken||''));
      const enrollment=this.one('SELECT * FROM enrollments WHERE hash=?',digest);
      if(!enrollment||enrollment.used||enrollment.expires<now)throw new BridgeError('ENROLLMENT_INVALID',401);
      const alias=String(input.alias||'Ponsel').slice(0,60),id=crypto.randomUUID().replaceAll('-','');
      // No awaits between the one-use check and durable consumption.
      this.sql.exec('UPDATE enrollments SET used=1 WHERE hash=?',digest);this.sql.exec('INSERT INTO devices(id,owner,alias) VALUES(?,?,?)',id,enrollment.owner,alias);
      const token=await this.issue('device',enrollment.owner,id,{devices:[id],permissions:[]},now+90*86400000);
      return json({deviceId:id,deviceToken:token,installationId:this.env.INSTALLATION_ID,expiresAt:now+90*86400000},201);
    }
    if(path==='/oauth/register'&&request.method==='POST') {
      this.rate(request,'register',10);const input=await body(request,16000);
      if(this.one('SELECT count(*) AS n FROM clients').n>=100)throw new BridgeError('CLIENT_REGISTRY_FULL',429);
      if(input.token_endpoint_auth_method&&input.token_endpoint_auth_method!=='none')throw new BridgeError('PUBLIC_PKCE_CLIENT_REQUIRED');
      if(!Array.isArray(input.redirect_uris)||input.redirect_uris.length<1||input.redirect_uris.length>5)throw new BridgeError('INVALID_REDIRECT');
      for(const redirect of input.redirect_uris){let u;try{u=new URL(redirect);}catch{throw new BridgeError('INVALID_REDIRECT');}if(u.hash||u.username||u.password||u.protocol!=='https:'&&!(u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname)))throw new BridgeError('INVALID_REDIRECT');}
      const id=randomToken();this.sql.exec('INSERT INTO clients VALUES(?,?)',id,JSON.stringify(input.redirect_uris));
      return json({client_id:id,redirect_uris:input.redirect_uris,grant_types:['authorization_code','refresh_token'],response_types:['code'],token_endpoint_auth_method:'none'},201);
    }
    if(path==='/oauth/token'&&request.method==='POST') {
      this.rate(request,'token',30);const text=await request.text();if(text.length>12000)throw new BridgeError('BODY_TOO_LARGE',413);const p=new URLSearchParams(text);
      if(p.get('grant_type')==='refresh_token') {
        const digest=await hash(p.get('refresh_token')||''),row=this.one('SELECT * FROM credentials WHERE hash=? AND kind=?',digest,'refresh');
        if(!row||row.expires<now)throw new BridgeError('INVALID_GRANT',401);
        const scope=JSON.parse(row.scopes);if(scope.client!==p.get('client_id')||scope.resource!==p.get('resource'))throw new BridgeError('INVALID_GRANT',401);
        this.sql.exec('DELETE FROM credentials WHERE hash=?',digest);
        const access=await this.issue('mcp',row.owner,null,scope);const refresh=await this.issue('refresh',row.owner,null,scope,now+30*86400000);
        return json({access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:3600,scope:scope.oauth});
      }
      if(p.get('grant_type')!=='authorization_code')throw new BridgeError('UNSUPPORTED_GRANT_TYPE');
      const digest=await hash(p.get('code')||''),code=this.one('SELECT * FROM codes WHERE hash=?',digest);
      const verifier=p.get('code_verifier')||'';
      if(!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))throw new BridgeError('INVALID_GRANT',401);
      const challenge=btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
      if(!code||code.expires<now||code.client!==p.get('client_id')||code.redirect!==p.get('redirect_uri')||code.resource!==p.get('resource')||code.challenge!==challenge)throw new BridgeError('INVALID_GRANT',401);
      this.sql.exec('DELETE FROM codes WHERE hash=?',digest);
      const scope={...JSON.parse(code.scopes),client:code.client,resource:code.resource};
      const access=await this.issue('mcp',code.owner,null,scope),refresh=await this.issue('refresh',code.owner,null,scope,now+30*86400000);
      return json({access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:3600,scope:scope.oauth});
    }
    if(path==='/oauth/revoke'&&request.method==='POST') {
      this.rate(request,'revoke-token',30);const raw=await request.text();if(raw.length>12000)throw new BridgeError('BODY_TOO_LARGE',413);
      const params=new URLSearchParams(raw),digest=await hash(params.get('token')||'');const token=this.one('SELECT * FROM credentials WHERE hash=?',digest);
      if(token&&JSON.parse(token.scopes).client===params.get('client_id'))this.sql.exec('DELETE FROM credentials WHERE hash=?',digest);
      return json({ok:true});
    }
    const principal=await this.principal(request);
    if(principal.cookie&&request.method!=='GET'&&request.headers.get('Origin')!==url.origin)throw new BridgeError('CSRF_ORIGIN_REQUIRED',403);
    if(path==='/api/device/renew'&&request.method==='POST') {
      if(principal.kind!=='device')throw new BridgeError('DEVICE_CREDENTIAL_REQUIRED',403);
      await body(request);const d=this.device(this.one('SELECT * FROM devices WHERE id=?',principal.deviceId));authorizeDevice(principal,d);
      const expiresAt=now+90*86400000,deviceToken=await this.issue('device',principal.ownerId,principal.deviceId,{devices:[principal.deviceId],permissions:[]},expiresAt);
      this.sql.exec('DELETE FROM credentials WHERE hash=?',principal.credentialHash);
      return json({deviceToken,expiresAt});
    }
    if(path==='/api/revoke-client'&&request.method==='POST') {
      this.owner(principal);const input=await body(request);const rows=this.sql.exec('SELECT * FROM credentials WHERE owner=?',principal.ownerId).toArray();
      for(const row of rows)if(JSON.parse(row.scopes).client===input.clientId)this.sql.exec('DELETE FROM credentials WHERE hash=?',row.hash);
      return json({ok:true});
    }
    if(path==='/oauth/authorize') {
      this.owner(principal);
      const params=request.method==='POST'?new URLSearchParams(await request.text()):url.searchParams;
      const client=this.one('SELECT * FROM clients WHERE id=?',params.get('client_id'));
      if(!client||!JSON.parse(client.redirects).includes(params.get('redirect_uri')))throw new BridgeError('INVALID_REDIRECT');
      if(params.get('response_type')!=='code'||params.get('code_challenge_method')!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(params.get('code_challenge')||'')||params.get('resource')!==url.origin+'/mcp')throw new BridgeError('INVALID_AUTHORIZATION_REQUEST');
      const scopes=(params.get('scope')||'bridge:read').split(' ');if(scopes.some(s=>!['bridge:read','bridge:control'].includes(s)))throw new BridgeError('INVALID_SCOPE');
      const devices=this.sql.exec('SELECT * FROM devices WHERE owner=? AND revoked=0',principal.ownerId).toArray();
      if(request.method==='GET') {
        const hidden=[...params].map(([k,v])=>`<input type="hidden" name="${escape(k)}" value="${escape(v)}">`).join('');
        return new Response(`<!doctype html><html lang="id"><meta charset="utf-8"><title>Izin koneksi MCP</title><h1>Izinkan koneksi MCP?</h1><p>Client ${escape(params.get('client_id').slice(0,12))}. Hak: ${escape(scopes.join(' '))}. Pilih perangkat yang diizinkan. Isi Chrome dapat mengandung sesi akun Anda.</p><form method="post">${hidden}${devices.map(d=>`<label><input type="checkbox" name="device" value="${escape(d.id)}">${escape(d.alias)}</label><br>`).join('')}<button name="approve" value="yes">Izinkan perangkat terpilih</button></form><a href="/">Batal</a></html>`,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
      }
      requireOrigin(request);
      const selected=params.getAll('device');if(params.get('approve')!=='yes'||selected.length<1||selected.some(id=>!devices.some(d=>d.id===id)))throw new BridgeError('EXPLICIT_DEVICE_SCOPE_REQUIRED');
      const code=randomToken();this.sql.exec('INSERT INTO codes VALUES(?,?,?,?,?,?,?,?)',await hash(code),params.get('client_id'),params.get('redirect_uri'),params.get('code_challenge'),params.get('resource'),principal.ownerId,JSON.stringify({devices:selected,permissions:scopes.includes('bridge:control')?['read','control']:['read'],oauth:scopes.join(' ')}),now+60000);
      const redirect=new URL(params.get('redirect_uri'));redirect.searchParams.set('code',code);if(params.has('state'))redirect.searchParams.set('state',params.get('state'));
      return new Response(null,{status:302,headers:{Location:redirect.href,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
    }
    if(path==='/api/logout'&&request.method==='POST'){await body(request);this.sql.exec('DELETE FROM credentials WHERE hash=?',principal.credentialHash);return json({ok:true},200,{'Set-Cookie':'bridge_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax'});}
    if(path==='/api/enrollment'&&request.method==='POST'){this.owner(principal);await body(request);this.rate(request,'new-enrollment',10);const token=randomToken();this.sql.exec('INSERT INTO enrollments VALUES(?,?,?,0)',await hash(token),principal.ownerId,now+300000);return json({enrollmentToken:token,expiresAt:now+300000});}
    if(path==='/api/devices'&&request.method==='GET'){
      if(!principal.permissions.includes('read'))throw new BridgeError('READ_SCOPE_REQUIRED',403);
      const devices=this.sql.exec('SELECT * FROM devices WHERE owner=?',principal.ownerId).toArray().map(x=>this.device(x)).filter(x=>principal.devices==='*'||principal.devices.includes(x.deviceId));return json({devices});
    }
    if(path==='/api/revoke'&&request.method==='POST'){
      this.owner(principal);const input=await body(request);const d=this.device(this.one('SELECT * FROM devices WHERE id=?',validId(input.deviceId)));authorizeDevice(principal,d);
      this.sql.exec('UPDATE devices SET revoked=1 WHERE id=?',d.deviceId);this.sql.exec('DELETE FROM credentials WHERE device=?',d.deviceId);
      const relay=this.env.DEVICES.get(this.env.DEVICES.idFromName(this.env.INSTALLATION_ID+':'+d.deviceId));await relay.fetch('https://internal/revoke',{method:'POST'});return json({ok:true});
    }
    if(path==='/internal/auth'){return json({principal});}
    if(path==='/internal/device'){const d=this.device(this.one('SELECT * FROM devices WHERE id=?',validId(url.searchParams.get('id'))));authorizeDevice(principal,d);return json({device:d,principal});}
    if(path==='/internal/session'&&request.method==='POST'){
      const p=await body(request);if(principal.kind!=='mcp'&&principal.kind!=='panel')throw new BridgeError('MCP_CREDENTIAL_REQUIRED',403);
      this.sql.exec('DELETE FROM sessions WHERE expires<?',now);
      if(p.create){if(this.one('SELECT count(*) AS n FROM sessions').n>=1000)throw new BridgeError('TOO_MANY_SESSIONS',429);const id=randomToken();this.sql.exec('INSERT INTO sessions VALUES(?,?,?,?,?)',id,principal.credentialHash,principal.ownerId,null,now+TTL);return json({id});}
      const row=this.one('SELECT * FROM sessions WHERE id=?',validId(p.id));if(!row||row.credential!==principal.credentialHash||row.expires<now)throw new BridgeError('SESSION_EXPIRED',404);
      if(p.remove){this.sql.exec('DELETE FROM sessions WHERE id=?',p.id);return json({ok:true});}
      if(p.select){const d=this.device(this.one('SELECT * FROM devices WHERE id=?',validId(p.select)));authorizeDevice(principal,d);this.sql.exec('UPDATE sessions SET selected=? WHERE id=?',d.deviceId,p.id);row.selected=d.deviceId;}
      return json({id:row.id,selected:row.selected,principal});
    }
    throw new BridgeError('NOT_FOUND',404);
  }
}
