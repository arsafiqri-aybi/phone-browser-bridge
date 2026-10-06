import {Auth} from './auth.js';
import {digest,json,body,token} from './security.js';
import {catalog,instructions,validate} from './catalog.js';
import {css,panelJs} from './ui.js';
export class PhoneHub{
  constructor(state,env){this.state=state;this.env=env;this.pending=new Map();this.commandTail=Promise.resolve();this.authTail=Promise.resolve();this.queued=0;this.auth=new Auth(state.storage,env);state.blockConcurrencyWhile(()=>this.auth.init());}
  sockets(){return this.state.getWebSockets('phone').filter(socket=>socket.readyState===1&&socket.deserializeAttachment()?.tokenHash===this.env.PHONE_TOKEN_HASH);}
  async status(){if(!this.sockets().length)return{device_connected:false,active:false,mode:null,relay:'cloudflare',session_duration_limit:null};const data=await this.command('phone_status',{});return{...data,device_connected:true,relay:'cloudflare',session_duration_limit:null};}
  command(name,args){
    if(this.queued>=8)return Promise.reject(new Error('Perintah masih antre. Periksa hasil sebelum mengirim lagi.'));this.queued++;
    const task=this.commandTail.then(()=>new Promise((resolve,reject)=>{
      const socket=this.sockets()[0];if(!socket){reject(new Error('HP belum tersambung. Jalankan agen Termux.'));return;}
      const id=token(),timer=setTimeout(()=>{this.pending.delete(id);reject(new Error('Hasil belum diketahui: koneksi HP timeout. Periksa Chrome sebelum mengulang tindakan.'));},25000);
      this.pending.set(id,{resolve,reject,timer,socket});
      try{socket.send(JSON.stringify({type:'command',id,name,args}));}catch{clearTimeout(timer);this.pending.delete(id);reject(new Error('Koneksi HP terputus; periksa hasil sebelum mencoba kembali.'));}
    }));this.commandTail=task.catch(()=>{});return task.finally(()=>this.queued--);
  }
  async webSocketMessage(socket,message){
    if(typeof message!=='string'||message.length>6*1024*1024){socket.close(1009,'Payload too large');return;}
    let data;try{data=JSON.parse(message);}catch{socket.close(1003,'Invalid JSON');return;}
    if(data.type==='ping'){socket.send('{"type":"pong"}');return;}
    if(data.type!=='result'||typeof data.id!=='string')return;
    const pending=this.pending.get(data.id);if(!pending||pending.socket!==socket)return;clearTimeout(pending.timer);this.pending.delete(data.id);
    if(data.error)pending.reject(new Error(String(data.error).slice(0,600)));else pending.resolve(data.result);
  }
  webSocketClose(socket){for(const [id,pending]of this.pending)if(pending.socket===socket){clearTimeout(pending.timer);this.pending.delete(id);pending.reject(new Error('HP terputus. Hasil tindakan belum diketahui; jangan otomatis mengulang.'));}}
  webSocketError(socket){this.webSocketClose(socket);}
  async fetch(request){
    try{
      const path=new URL(request.url).pathname;
      if(path==='/device/connect'){
        if(request.headers.get('upgrade')?.toLowerCase()!=='websocket')return json({error:'WebSocket required'},426);
        const credential=(request.headers.get('authorization')||'').match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
        if(!credential||await digest(credential)!==this.env.PHONE_TOKEN_HASH)return json({error:'invalid_device_token'},401);
        for(const existing of this.sockets())existing.close(4001,'New owner phone connection');
        const [client,server]=Object.values(new WebSocketPair());this.state.acceptWebSocket(server,['phone']);server.serializeAttachment({tokenHash:this.env.PHONE_TOKEN_HASH});return new Response(null,{status:101,webSocket:client});
      }
      if(path==='/mcp'){
        const authorized=await this.auth.bearer(request);
        if(request.method!=='POST'&&!authorized)return this.auth.challenge();
        if(request.method!=='POST')return json({error:'Use stateless MCP HTTP POST'},405,{Allow:'POST'});
        if(!(request.headers.get('content-type')||'').includes('application/json'))return json({error:'JSON required'},415);
        const q=await body(request);if(q.jsonrpc!=='2.0'||typeof q.method!=='string')return json({jsonrpc:'2.0',id:q.id??null,error:{code:-32600,message:'Invalid request'}},400);
        if(!authorized&&!['initialize','tools/list','ping','notifications/initialized'].includes(q.method))return this.auth.challenge();
        if(q.id===undefined)return new Response(null,{status:202});
        const success=result=>json({jsonrpc:'2.0',id:q.id,result});
        if(q.method==='initialize'){const versions=['2024-11-05','2025-03-26','2025-06-18','2025-11-25'];return success({protocolVersion:versions.includes(q.params?.protocolVersion)?q.params.protocolVersion:'2025-11-25',capabilities:{tools:{listChanged:false}},serverInfo:{name:'phone-chrome-mcp',version:'2.0.0'},instructions});}
        if(q.method==='ping')return success({});
        if(q.method==='tools/list')return success({tools:catalog});
        if(q.method==='tools/call'){
          const tool=catalog.find(tool=>tool.name===q.params?.name);
          if(!tool)return json({jsonrpc:'2.0',id:q.id,error:{code:-32602,message:'Unknown tool'}});
          try{
            const args=q.params.arguments||{};validate(tool.inputSchema,args);
            const result=tool.name==='phone_status'?await this.status():await this.command(tool.name,args);
            if(tool.name==='phone_screenshot'){
              if(result?.mime!=='image/jpeg'||typeof result.base64!=='string')throw new Error('Screenshot perangkat tidak valid.');
              const {base64,...metadata}=result;return success({content:[{type:'text',text:JSON.stringify(metadata)},{type:'image',mimeType:result.mime,data:base64}]});
            }return success({content:[{type:'text',text:JSON.stringify(result)}]});
          }catch(error){return success({isError:true,content:[{type:'text',text:String(error.message).slice(0,600)}]});}
        }return json({jsonrpc:'2.0',id:q.id,error:{code:-32601,message:'Method not found'}});
      }
      // Serialize OAuth updates so one-time codes/refresh tokens cannot race.
      const task=this.authTail.then(()=>this.auth.route(request,this));this.authTail=task.catch(()=>{});return await task;
    }catch{return json({error:'Permintaan tidak valid atau layanan belum siap.'},400);}
  }
}
export default{
  async fetch(request,env){
    const url=new URL(request.url),base=env.PUBLIC_BASE_URL;
    if(url.pathname==='/healthz')return json({ok:true,service:'phone-chrome-mcp',version:'2.0.0',browser_location:'owner_phone',device_verified:false,session_duration_limit:null});
    if(!base||url.origin!==base)return json({error:'Host not allowed'},400);
    const origin=request.headers.get('origin');if(origin&&![base,'https://chatgpt.com'].includes(origin))return json({error:'Origin not allowed'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin||base,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type, MCP-Protocol-Version'}});
    let result;
    if(url.pathname==='/style.css')result=new Response(css,{headers:{'content-type':'text/css; charset=utf-8'}});
    else if(url.pathname==='/panel.js')result=new Response(panelJs,{headers:{'content-type':'text/javascript; charset=utf-8'}});
    else if(url.pathname==='/')result=new Response(null,{status:302,headers:{location:'/admin'}});
    else result=await env.PHONE_HUB.get(env.PHONE_HUB.idFromName('owner')).fetch(request);
    if(result.status===101)return result;
    const response=new Response(result.body,result);response.headers.set('cache-control','no-store');response.headers.set('x-content-type-options','nosniff');response.headers.set('referrer-policy','same-origin');response.headers.set('x-frame-options','DENY');response.headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https://chatgpt.com");
    if(origin)response.headers.set('Access-Control-Allow-Origin',origin);return response;
  }
};
