import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {Relay} from '../src/relay.js';
import {AndroidLink} from '../src/android-link.js';
const wait=n=>new Promise(r=>setTimeout(r,n));
class Socket extends EventEmitter {readyState=0;sent=[];open(){this.readyState=1;this.emit('open');}send(s){this.sent.push(JSON.parse(s));}close(){this.readyState=3;this.emit('close');}terminate(){this.close();}}
test('Repeated disconnects recover, old commands are not replayed, stop cancels retries',async()=>{
 const sockets=[],calls=[];let release;
 const relay=new Relay({createSocket:()=>{const s=new Socket();sockets.push(s);return s;},run:async(name)=>{calls.push(name);return new Promise(r=>release=r);},retryDelay:()=>2,interval:10000,log:()=>{}});
 try{relay.start();sockets[0].open();sockets[0].emit('message',JSON.stringify({type:'command',id:'action-one',name:'phone_click',args:{}}));sockets[0].close();await wait(8);assert.equal(sockets.length,2);sockets[1].open();release({accepted:true});await wait(2);assert.equal(sockets[1].sent.length,0);assert.deepEqual(calls,['phone_click']);sockets[0].emit('close');assert.equal(relay.socket,sockets[1]);sockets[1].close();await wait(8);assert.equal(sockets.length,3);relay.stop();await wait(8);assert.equal(sockets.length,3);}finally{relay.stop();}
});
test('Missing pong terminates half-open socket and reconnects',async()=>{
 const sockets=[];const relay=new Relay({createSocket:()=>{const s=new Socket();sockets.push(s);return s;},run:async()=>{},interval:3,pongTimeout:7,retryDelay:()=>2,log:()=>{}});
 try{relay.start();sockets[0].open();await wait(30);assert.ok(sockets.length>=2);}finally{relay.stop();}
});
test('ADB heals only configured device and forwards again; healthy endpoint is left alone',async()=>{
 const commands=[];let available=false;const link=new AndroidLink({serial:'192.168.1.10:39211',probe:async()=>available,run:async(file,args)=>{commands.push([file,...args]);if(args.includes('forward'))available=true;return {stdout:args.includes('get-state')?'device\n':''};}});
 assert.equal((await link.ensure()).devtools_available,true);assert.deepEqual(commands,[['adb','connect','192.168.1.10:39211'],['adb','-s','192.168.1.10:39211','get-state'],['adb','-s','192.168.1.10:39211','forward','tcp:9222','localabstract:chrome_devtools_remote']]);await link.ensure();assert.equal(commands.length,3);
});
test('Unavailable ADB is recoverable, absent config and shell text never select arbitrary device',async()=>{
 assert.throws(()=>new AndroidLink({serial:'x; reboot'}));let calls=0;const result=await new AndroidLink({serial:'127.0.0.1:37123',probe:async()=>false,run:async()=>{calls++;throw Error('offline');}}).ensure();assert.equal(result.devtools_available,false);assert.equal(calls,1);assert.equal((await new AndroidLink({serial:null,probe:async()=>false,run:async()=>assert.fail()}).ensure()).adb_recovery_configured,false);
});
