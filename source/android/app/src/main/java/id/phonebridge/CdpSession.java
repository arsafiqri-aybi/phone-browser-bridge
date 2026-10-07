package id.phonebridge;

import okhttp3.*;
import org.json.JSONObject;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

final class CdpSession extends WebSocketListener implements AutoCloseable {
    private final ConcurrentHashMap<Long,CompletableFuture<JSONObject>> pending=new ConcurrentHashMap<>();
    private final AtomicLong ids=new AtomicLong();
    private final CompletableFuture<Void> open=new CompletableFuture<>();
    private volatile WebSocket socket;
    private volatile boolean closed;
    CdpSession(OkHttpClient client,String url){socket=client.newWebSocket(new Request.Builder().url(url).build(),this);}
    public void onOpen(WebSocket ws,Response r){if(closed){ws.cancel();return;}socket=ws;open.complete(null);}
    JSONObject call(String method,JSONObject params,long deadline)throws Exception {
        long remaining=deadline-System.currentTimeMillis(); if(remaining<=0)throw new Exception("TIMEOUT");
        open.get(remaining,TimeUnit.MILLISECONDS);
        if(closed||pending.size()>=16)throw new Exception("CDP_UNAVAILABLE_OR_OVERLOADED");
        long id=ids.incrementAndGet();CompletableFuture<JSONObject> future=new CompletableFuture<>();pending.put(id,future);
        try {
            if(!socket.send(new JSONObject().put("id",id).put("method",method).put("params",params).toString()))throw new Exception("CDP_SEND_FAILED");
            remaining=deadline-System.currentTimeMillis();if(remaining<=0)throw new Exception("TIMEOUT");
            JSONObject result=future.get(remaining,TimeUnit.MILLISECONDS);
            if(result.has("error"))throw new Exception("CDP_COMMAND_FAILED");
            return result.optJSONObject("result")==null?new JSONObject():result.getJSONObject("result");
        }finally{pending.remove(id);}
    }
    public void onMessage(WebSocket ws,String text){
        if(closed)return;
        if(text.length()>2400000){close();return;}
        try{JSONObject r=new JSONObject(text);CompletableFuture<JSONObject> f=pending.remove(r.optLong("id",-1));if(f!=null)f.complete(r);}catch(Exception ignored){}
    }
    public void onFailure(WebSocket ws,Throwable t,Response response){fail();}
    public void onClosed(WebSocket ws,int code,String reason){fail();}
    private void fail(){closed=true;open.completeExceptionally(new Exception("CDP_DISCONNECTED"));for(var f:pending.values())f.completeExceptionally(new Exception("CDP_DISCONNECTED"));pending.clear();}
    public void close(){fail();if(socket!=null)socket.cancel();}
}
