import {now,token,digest,json,body,callbackAllowed,cookies,verifyPassword} from './security.js';
import {loginPage,consentPage,panelPage} from './ui.js';
const scope='phone:control';
const empty=()=>({clients:{},codes:{},tokens:{},refresh:{},sessions:{},consents:{},limits:{}});
export class Auth{
  constructor(storage,env){this.storage=storage;this.env=env;this.base=env.PUBLIC_BASE_URL;this.resource=this.base+'/mcp';}
  async init(){this.db=await this.storage.get('oauth')||empty();}
  async save(){await this.storage.put('oauth',this.db);}
  clean(){for(const type of ['codes','tokens','refresh','sessions','consents','limits'])for(const [key,item]of Object.entries(this.db[type]))if(item.expires<now())delete this.db[type][key];}
  cookie(name,value,age){return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${this.base.startsWith('https:')?'; Secure':''}`;}
  html(text,status=200,cookie){return new Response(text,{status,headers:{'content-type':'text/html; charset=utf-8',...(cookie?{'set-cookie':cookie}:{})}});}
  async session(request){const item=this.db.sessions[await digest(cookies(request).pb_session||'')];return item?.expires>now()?item:null;}
  async bearer(request){const access=(request.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];const item=this.db.tokens[await digest(access||'')];return item?.expires>now()&&item.resource===this.resource&&item.scope?.split(' ').includes(scope)?item:null;}
  challenge(){return json({error:'invalid_token'},401,{'WWW-Authenticate':`Bearer resource_metadata="${this.base}/.well-known/oauth-protected-resource/mcp", scope="${scope}"`});}
  csrf(request,session){return request.headers.get('origin')===this.base&&request.headers.get('x-csrf-token')===session?.csrf;}
  async limited(request,category,maximum){
    const key=category+':'+await digest(request.headers.get('cf-connecting-ip')||'local');this.clean();let item=this.db.limits[key];
    if(!item)item=this.db.limits[key]={count:0,expires:now()+900};item.count++;await this.save();return item.count>maximum;
  }
  async issue(clientId,resource,family=token(),grantedScope=scope){
    const access=token(),refresh=token();this.db.tokens[await digest(access)]={clientId,resource,scope:grantedScope,family,expires:now()+3600};
    this.db.refresh[await digest(refresh)]={clientId,resource,scope:grantedScope,family,used:false,expires:now()+30*86400};await this.save();
    return{access_token:access,refresh_token:refresh,token_type:'Bearer',expires_in:3600,scope:grantedScope};
  }
  revoke(family){for(const type of ['tokens','refresh'])for(const [key,item]of Object.entries(this.db[type]))if(item.family===family)delete this.db[type][key];}
  async route(request,hub){
    const url=new URL(request.url),path=url.pathname,method=request.method;this.clean();
    if(method==='GET'&&['/.well-known/oauth-protected-resource','/.well-known/oauth-protected-resource/mcp'].includes(path))return json({resource:this.resource,authorization_servers:[this.base],scopes_supported:[scope,'offline_access'],bearer_methods_supported:['header']});
    if(method==='GET'&&path==='/.well-known/oauth-authorization-server')return json({issuer:this.base,authorization_endpoint:this.base+'/oauth/authorize',token_endpoint:this.base+'/oauth/token',registration_endpoint:this.base+'/oauth/register',revocation_endpoint:this.base+'/oauth/revoke',response_types_supported:['code'],grant_types_supported:['authorization_code','refresh_token'],token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256'],scopes_supported:[scope,'offline_access'],authorization_response_iss_parameter_supported:true});
    if(method==='POST'&&path==='/oauth/register'){
      if(await this.limited(request,'register',30))return json({error:'rate_limited'},429);const q=await body(request);
      if(!Array.isArray(q.redirect_uris)||!q.redirect_uris.length||q.redirect_uris.length>5||q.redirect_uris.some(uri=>!callbackAllowed(uri))||q.token_endpoint_auth_method&&q.token_endpoint_auth_method!=='none'||q.grant_types&&(!Array.isArray(q.grant_types)||q.grant_types.some(v=>!['authorization_code','refresh_token'].includes(v)))||q.response_types&&(!Array.isArray(q.response_types)||q.response_types.some(v=>v!=='code')))return json({error:'invalid_client_metadata'},400);
      if(Object.keys(this.db.clients).length>=100)return json({error:'client_limit'},429);
      const client_id=token(),record={client_id,client_id_issued_at:now(),redirect_uris:q.redirect_uris,client_name:String(q.client_name||'ChatGPT').slice(0,80),token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code']};this.db.clients[client_id]=record;await this.save();return json(record,201);
    }
    if(path==='/oauth/authorize'&&method==='GET'){
      if(await this.limited(request,'authorize',30))return json({error:'rate_limited'},429);
      const q=Object.fromEntries(url.searchParams),client=this.db.clients[q.client_id];
      if(!client||!client.redirect_uris?.includes(q.redirect_uri)||!callbackAllowed(q.redirect_uri)||q.response_type!=='code'||q.code_challenge_method!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(q.code_challenge||'')||q.resource!==this.resource||q.scope&&(!q.scope.split(' ').includes(scope)||q.scope.split(' ').some(s=>![scope,'offline_access'].includes(s)))||typeof q.state!=='string'||q.state.length>2048)return json({error:'invalid_authorization_request'},400);
      const id=token(),csrf=token();this.db.consents[id]={clientId:q.client_id,redirect:q.redirect_uri,state:q.state,challenge:q.code_challenge,resource:q.resource,scope:q.scope||scope,csrf,expires:now()+600};await this.save();
      return this.html(consentPage(client.client_name,id,q.redirect_uri),200,this.cookie('pb_consent',csrf,600));
    }
    if(path==='/oauth/authorize'&&method==='POST'){
      if(await this.limited(request,'authorize-post',20))return json({error:'rate_limited'},429);
      const q=await body(request),item=this.db.consents[q.request_id];if(!item||item.expires<now()||cookies(request).pb_consent!==item.csrf||request.headers.get('origin')!==this.base)return json({error:'invalid_consent'},400);
      const redirect=new URL(item.redirect);redirect.searchParams.set('state',item.state);redirect.searchParams.set('iss',this.base);
      if(q.decision==='deny'){delete this.db.consents[q.request_id];redirect.searchParams.set('error','access_denied');await this.save();return new Response(null,{status:302,headers:{location:redirect.href}});}
      if(q.decision!=='approve'||!await verifyPassword(q.password,this.env.OWNER_PASSWORD_HASH))return json({error:'invalid_owner_password'},401);
      delete this.db.consents[q.request_id];const code=token();this.db.codes[await digest(code)]={...item,expires:now()+120};await this.save();redirect.searchParams.set('code',code);
      return new Response(null,{status:302,headers:{location:redirect.href,'set-cookie':this.cookie('pb_consent','',0)}});
    }
    if(path==='/oauth/token'&&method==='POST'){
      if(await this.limited(request,'token',120))return json({error:'rate_limited'},429);const q=await body(request);
      if(!this.db.clients[q.client_id]||q.resource!==this.resource)return json({error:'invalid_grant'},400);
      if(q.grant_type==='authorization_code'){
        const key=await digest(q.code||''),item=this.db.codes[key];if(!item||item.expires<now()||item.clientId!==q.client_id||item.resource!==q.resource||item.redirect!==q.redirect_uri||!/^[A-Za-z0-9._~-]{43,128}$/.test(q.code_verifier||'')||await digest(q.code_verifier)!==item.challenge)return json({error:'invalid_grant'},400);
        delete this.db.codes[key];return json(await this.issue(q.client_id,q.resource,undefined,item.scope));
      }
      if(q.grant_type==='refresh_token'){
        const key=await digest(q.refresh_token||''),item=this.db.refresh[key];if(!item||item.expires<now()||item.clientId!==q.client_id||item.resource!==q.resource)return json({error:'invalid_grant'},400);
        if(item.used){this.revoke(item.family);await this.save();return json({error:'invalid_grant',error_description:'Refresh reuse; reconnect.'},400);}
        item.used=true;return json(await this.issue(q.client_id,q.resource,item.family,item.scope));
      }return json({error:'unsupported_grant_type'},400);
    }
    if(path==='/oauth/revoke'&&method==='POST'){
      if(await this.limited(request,'revoke',120))return json({error:'rate_limited'},429);const q=await body(request),key=await digest(q.token||''),item=this.db.tokens[key]||this.db.refresh[key];if(item?.clientId===q.client_id)this.revoke(item.family);await this.save();return new Response(null,{status:200});
    }
    if(path==='/admin'&&method==='GET'){
      if(await this.session(request))return this.html(panelPage(this.base));const nonce=token();return this.html(loginPage(nonce),200,this.cookie('pb_login',nonce,600));
    }
    if(path==='/admin/login'&&method==='POST'){
      if(await this.limited(request,'login',20))return json({error:'rate_limited'},429);const q=await body(request);
      if(!q.nonce||q.nonce!==cookies(request).pb_login||request.headers.get('origin')!==this.base)return json({error:'csrf'},403);
      if(!await verifyPassword(q.password,this.env.OWNER_PASSWORD_HASH))return this.html(loginPage(q.nonce,'Password belum cocok. Coba password dari berkas konfigurasi pribadimu.'),401);
      const access=token();this.db.sessions[await digest(access)]={csrf:token(),expires:now()+8*3600};await this.save();return new Response(null,{status:302,headers:{location:'/admin','set-cookie':this.cookie('pb_session',access,8*3600)}});
    }
    if(path.startsWith('/admin/')){
      const session=await this.session(request);if(!session)return json({error:'Masuk ke panel dahulu.'},401);
      if(method==='GET'&&path==='/admin/session')return json({csrf:session.csrf});
      if(method==='GET'&&path==='/admin/state')return json(await hub.status());
      if(method!=='POST'||!this.csrf(request,session))return json({error:'CSRF check failed.'},403);
      if(path==='/admin/pause')return json(await hub.command('phone_handoff',{reason:'Pemilik menjeda dari panel',action_id:token()}));
      if(path==='/admin/revoke-all'){this.db.tokens={};this.db.codes={};this.db.refresh={};await this.save();return json({ok:true});}
      if(path==='/admin/logout'){delete this.db.sessions[await digest(cookies(request).pb_session)];await this.save();return json({ok:true},200,{'set-cookie':this.cookie('pb_session','',0)});}
    }return json({error:'Not found'},404);
  }
}
