// Socket-generation guards prevent a late event from clearing a newer connection.
export class Relay {
  constructor({createSocket,run,onState=()=>{},log=console.log,interval=25000,pongTimeout=60000,retryDelay}={}){Object.assign(this,{createSocket,run,onState,log,interval,pongTimeout,retryDelay});this.attempt=0;this.stopped=true;}
  start(){if(!this.stopped)return;this.stopped=false;this.connect();}
  connect(){
    if(this.stopped)return;const current=this.createSocket();this.socket=current;let openedAt;
    current.on('open',()=>{if(this.socket!==current||this.stopped){current.close();return;}openedAt=Date.now();this.lastPong=openedAt;this.onState(true);this.log('Relay tersambung.');this.heartbeat=setInterval(()=>{if(this.socket!==current||this.stopped)return;if(Date.now()-this.lastPong>this.pongTimeout){current.terminate();return;}if(current.readyState===1)current.send('{"type":"ping"}');},this.interval);});
    current.on('message',async raw=>{if(this.socket!==current||this.stopped)return;let data;try{data=JSON.parse(raw);}catch{return;}if(data.type==='pong'){this.lastPong=Date.now();if(openedAt&&Date.now()-openedAt>=30000)this.attempt=0;return;}if(data.type!=='command'||typeof data.id!=='string')return;
      let result;try{result={type:'result',id:data.id,result:await this.run(data.name,data.args)};}catch(e){result={type:'result',id:data.id,error:String(e.message).slice(0,600)};}
      if(!this.stopped&&this.socket===current&&current.readyState===1)current.send(JSON.stringify(result));
    });
    current.on('error',()=>{});current.on('close',()=>{if(this.socket!==current)return;clearInterval(this.heartbeat);this.onState(false);if(this.stopped)return;this.log('Relay terputus. Menyambung ulang tanpa mengulang tindakan.');const delay=this.retryDelay?.(this.attempt)??Math.min(30000,1000*2**Math.min(this.attempt,5))+Math.random()*500;this.attempt++;this.timer=setTimeout(()=>this.connect(),delay);});
  }
  stop(){this.stopped=true;clearTimeout(this.timer);clearInterval(this.heartbeat);this.onState(false);this.socket?.terminate();}
}
