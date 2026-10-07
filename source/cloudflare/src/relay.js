import {BridgeError, body, json, hash, canonical, MUTATIONS, validId, validateCommand} from './protocol.js';

export class DeviceRelay {
  constructor(ctx,env) {
    this.ctx=ctx;this.env=env;this.sql=ctx.storage.sql;this.pending=new Map();
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS journal(id TEXT PRIMARY KEY,digest TEXT,state TEXT,result TEXT,created INTEGER)');
    this.sql.exec("UPDATE journal SET state='UNKNOWN' WHERE state='DISPATCHED'");
    this.rate={minute:0,count:0};
  }
  one(query,...args){return this.sql.exec(query,...args).toArray()[0];}
  get(key){return this.one('SELECT value FROM meta WHERE key=?',key)?.value;}
  set(key,value){this.sql.exec('INSERT OR REPLACE INTO meta VALUES(?,?)',key,String(value));}
  currentSocket(){const gen=Number(this.get('generation')||0);if(Number(this.get('credentialExpires')||0)<Date.now())return null;return this.ctx.getWebSockets().find(s=>s.deserializeAttachment()?.generation===gen);}
  async fetch(request) {
    try{return await this.route(request);}catch(e){return json({error:{code:e instanceof BridgeError?e.code:'INTERNAL_ERROR'}},e instanceof BridgeError?e.status:500);}
  }
  async route(request) {
    const url=new URL(request.url);
    if(url.pathname==='/socket') {
      if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')throw new BridgeError('WEBSOCKET_REQUIRED',426);
      if(this.get('revoked')==='true')throw new BridgeError('DEVICE_REVOKED',403);
      const device=request.headers.get('X-Device-Id'),owner=request.headers.get('X-Owner-Id');validId(device);
      if(this.get('device')&&this.get('device')!==device||this.get('owner')&&this.get('owner')!==owner)throw new BridgeError('IDENTITY_MISMATCH',403);
      this.set('device',device);this.set('owner',owner);
      const expires=Number(request.headers.get('X-Credential-Expires'));if(!Number.isSafeInteger(expires)||expires<=Date.now())throw new BridgeError('DEVICE_TOKEN_EXPIRED',401);
      this.set('credentialExpires',expires);await this.ctx.storage.setAlarm(expires);
      for(const s of this.ctx.getWebSockets())try{s.close(1000,'REPLACED');}catch{}
      this.disconnectPending();
      const generation=Number(this.get('generation')||0)+1;this.set('generation',generation);this.set('heartbeat','0');
      const pair=new WebSocketPair();this.ctx.acceptWebSocket(pair[1]);pair[1].serializeAttachment({generation});
      pair[1].send(JSON.stringify({type:'welcome',protocolVersion:1,connectionGeneration:generation}));
      return new Response(null,{status:101,webSocket:pair[0]});
    }
    if(url.pathname==='/revoke'){
      this.set('revoked','true');for(const s of this.ctx.getWebSockets())try{s.close(1008,'REVOKED');}catch{}this.disconnectPending();return json({ok:true});
    }
    if(url.pathname==='/status'){
      const checkedAt=Date.now(),heartbeat=Number(this.get('heartbeat')||0),online=!!this.currentSocket()&&checkedAt-heartbeat<15000;
      const layers=JSON.parse(this.get('health')||'{}');
      if(!online)for(const [k,l] of Object.entries(layers))if(l&&typeof l==='object')layers[k]={...l,state:'unknown',reasonCode:'STALE_DEVICE_HEARTBEAT'};
      return json({deviceId:this.get('device'),online,relay:{state:online?'healthy':'unavailable',checkedAt,lastSuccessAt:heartbeat||null,connectionGeneration:Number(this.get('generation')||0)},layers,pendingCount:this.pending.size});
    }
    if(url.pathname==='/receipt'){
      const row=this.one('SELECT * FROM journal WHERE id=?',validId(url.searchParams.get('id')));return json(row?{actionId:row.id,status:row.state,payloadDigest:row.digest,result:row.result?JSON.parse(row.result):null}:{status:'NOT_FOUND'});
    }
    if(url.pathname==='/command'&&request.method==='POST') {
      const p=await body(request);validateCommand(p.method,p.payload);
      const minute=Math.floor(Date.now()/60000);if(this.rate.minute!==minute)this.rate={minute,count:0};if(++this.rate.count>60)throw new BridgeError('RATE_LIMITED',429);
      const mutation=MUTATIONS.has(p.method),digest=await hash(canonical({method:p.method,payload:p.payload}));
      if(mutation){
        validId(p.actionId);const old=this.one('SELECT * FROM journal WHERE id=?',p.actionId);
        if(old){if(old.digest!==digest)throw new BridgeError('ACTION_CONFLICT',409);return json({status:old.state,result:old.result?JSON.parse(old.result):null,actionId:p.actionId,receipt:true});}
        if(this.one('SELECT count(*) AS n FROM journal').n>=10000)throw new BridgeError('JOURNAL_FULL',429);
      }
      const socket=this.currentSocket();if(this.get('revoked')==='true'||!socket||Date.now()-Number(this.get('heartbeat')||0)>=15000)throw new BridgeError('DEVICE_OFFLINE',503);
      if(JSON.parse(this.get('health')||'{}').ownerIntent!=='active')throw new BridgeError('OWNER_PAUSED',409);
      if(this.pending.size>=6||p.method==='screenshot'&&[...this.pending.values()].some(x=>x.method==='screenshot'))throw new BridgeError('OVERLOADED',429);
      const remaining=p.deadlineAt-Date.now();if(!Number.isSafeInteger(p.deadlineAt)||remaining<=0||remaining>30000)throw new BridgeError('DEADLINE_EXPIRED',408);
      const generation=Number(this.get('generation')),requestId=crypto.randomUUID();
      const envelope={type:'command',protocolVersion:1,installationId:this.env.INSTALLATION_ID,deviceId:this.get('device'),connectionGeneration:generation,requestId,actionId:p.actionId||null,payloadDigest:digest,method:p.method,deadlineAt:p.deadlineAt,payload:p.payload};
      if(mutation)this.sql.exec("INSERT INTO journal VALUES(?,?,'DISPATCHED',NULL,?)",p.actionId,digest,Date.now());
      return await new Promise(resolve=>{
        const timer=setTimeout(()=>this.complete(requestId,mutation?'UNKNOWN':'ERROR',null,'TIMEOUT'),remaining);
        this.pending.set(requestId,{resolve,timer,mutation,digest,actionId:p.actionId,generation,method:p.method,deadlineAt:p.deadlineAt});
        try{socket.send(JSON.stringify(envelope));}catch{this.complete(requestId,mutation?'UNKNOWN':'ERROR',null,'TRANSPORT_CLOSED');}
      });
    }
    throw new BridgeError('NOT_FOUND',404);
  }
  complete(id,status,result,error) {
    const p=this.pending.get(id);if(!p)return;
    clearTimeout(p.timer);this.pending.delete(id);
    if(p.mutation)this.sql.exec('UPDATE journal SET state=?,result=? WHERE id=?',status,result?JSON.stringify({executedAt:result.executedAt||Date.now()}):null,p.actionId);
    p.resolve(json({status,result,error:error?{code:error}:null,actionId:p.actionId||null,connectionGeneration:p.generation}));
  }
  disconnectPending(){for(const [id,p]of this.pending)this.complete(id,p.mutation?'UNKNOWN':'ERROR',null,'DISCONNECTED');}
  async webSocketMessage(socket,message) {
    if(socket.deserializeAttachment()?.generation!==Number(this.get('generation'))||this.get('revoked')==='true')return;
    if(typeof message!=='string'||message.length>2400000){socket.close(1009,'FRAME_TOO_LARGE');return;}
    let m;try{m=JSON.parse(message);}catch{socket.close(1008,'INVALID_FRAME');return;}
    if(m.protocolVersion!==1||m.connectionGeneration!==Number(this.get('generation')))return;
    if(m.type==='heartbeat'){
      if(!m.status||JSON.stringify(m.status).length>12000)return;
      const safe={ownerIntent:['active','paused','stopped'].includes(m.status.ownerIntent)?m.status.ownerIntent:'unknown'};
      for(const k of ['adb','chrome','discovery','relay']){const l=m.status[k];if(l&&['healthy','connecting','unavailable','unknown','paused','stopped','permission_required'].includes(l.state))safe[k]={state:l.state,reasonCode:/^[A-Z_]{1,80}$/.test(l.reasonCode||'')?l.reasonCode:null,checkedAt:l.checkedAt,lastSuccessAt:l.lastSuccessAt,connectionGeneration:l.connectionGeneration};}
      this.set('health',JSON.stringify(safe));this.set('heartbeat',Date.now());socket.send(JSON.stringify({type:'pong',protocolVersion:1,connectionGeneration:Number(this.get('generation'))}));return;
    }
    if(m.type==='response'){
      const p=this.pending.get(m.requestId);if(!p||p.generation!==m.connectionGeneration||m.payloadDigest!==p.digest||p.mutation&&m.actionId!==p.actionId)return;
      if(Date.now()>p.deadlineAt){this.complete(m.requestId,p.mutation?'UNKNOWN':'ERROR',null,'TIMEOUT');return;}
      if(!['DONE','UNKNOWN','ERROR'].includes(m.status)){this.complete(m.requestId,p.mutation?'UNKNOWN':'ERROR',null,'INVALID_RESPONSE');return;}
      if(p.method==='screenshot'&&m.status==='DONE'){
        const r=m.result;
        if(!r||r.mimeType!=='image/jpeg'||typeof r.data!=='string'||r.data.length>2000000||!/^[A-Za-z0-9+/]+={0,2}$/.test(r.data)||!r.data.startsWith('/9j/')||!Number.isFinite(r.width)||r.width<1||r.width>2560||r.height<1||r.height>2560){this.complete(m.requestId,'ERROR',null,'SCREENSHOT_UNAVAILABLE');return;}
      }
      this.complete(m.requestId,m.status,m.result,m.error?.code&&/^[A-Z_]{1,80}$/.test(m.error.code)?m.error.code:null);
    }
  }
  webSocketClose(socket){try{socket.close(1000,'CLOSED');}catch{}if(socket.deserializeAttachment()?.generation===Number(this.get('generation'))){this.set('heartbeat','0');this.disconnectPending();}}
  webSocketError(socket){this.webSocketClose(socket);}
  alarm(){if(Number(this.get('credentialExpires')||0)<=Date.now()){for(const socket of this.ctx.getWebSockets())try{socket.close(1008,'DEVICE_TOKEN_EXPIRED');}catch{}this.set('heartbeat','0');this.disconnectPending();}}
}
