package id.phonebridge;

import okhttp3.*;
import org.json.JSONObject;
import java.util.concurrent.*;

final class RelayLink extends WebSocketListener implements AutoCloseable {
    interface Handler { void command(JSONObject request,long generation); }
    private final OkHttpClient client=new OkHttpClient.Builder().pingInterval(15,TimeUnit.SECONDS).build();
    private final Handler handler;
    private final Health health;
    private final String base;
    private volatile String token;
    private final SecureStore store;
    private final ScheduledExecutorService renewal=Executors.newSingleThreadScheduledExecutor();
    private volatile WebSocket socket;
    private volatile boolean connecting,closed;
    private volatile long generation;
    long generation(){return generation;}
    boolean connected(){return !closed&&socket!=null&&!connecting;}
    private long nextAttempt;private int attempts;
    RelayLink(String endpoint,String credential,SecureStore secrets,Health h,Handler handler){base=endpoint;token=credential;store=secrets;health=h;this.handler=handler;renewal.scheduleWithFixedDelay(this::renew,1,24,TimeUnit.HOURS);}
    private void renew(){
        if(closed)return;
        try(Response r=client.newCall(new Request.Builder().url(base+"/api/device/renew").header("Authorization","Bearer "+token).post(RequestBody.create("{}",MediaType.get("application/json"))).build()).execute()){
            if(!r.isSuccessful()||r.body()==null)return;
            String next=new JSONObject(r.body().string()).getString("deviceToken");store.put("deviceToken",next);token=next;
        }catch(Exception ignored){}
    }
    synchronized void tick(JSONObject status) {
        if(closed)return;
        if(socket!=null){send(newJson("heartbeat",status));return;}
        if(connecting||System.currentTimeMillis()<nextAttempt)return;
        connecting=true;
        socket=client.newWebSocket(new Request.Builder().url(base.replaceFirst("^https:","wss:")+"/api/device/socket").header("Authorization","Bearer "+token).build(),this);
    }
    private JSONObject newJson(String type,JSONObject status){try{return new JSONObject().put("type",type).put("status",status).put("connectionGeneration",generation).put("protocolVersion",1);}catch(Exception e){return new JSONObject();}}
    public void onOpen(WebSocket ws,Response response){if(closed){ws.cancel();return;}socket=ws;connecting=false;attempts=0;}
    public void onMessage(WebSocket ws,String text){
        if(ws!=socket||closed)return;
        if(text.length()>65536){ws.close(1009,"FRAME_TOO_LARGE");return;}
        try{
            JSONObject message=new JSONObject(text);
            if(message.optString("type").equals("welcome")){generation=message.getLong("connectionGeneration");health.set("relay","healthy","CONNECTED",generation);}
            else if(message.optString("type").equals("command"))handler.command(message,generation);
            else if(message.optString("type").equals("pong"))health.set("relay","healthy","HEARTBEAT_ACK",generation);
        }catch(Exception ignored){health.set("relay","unknown","INVALID_FRAME",generation);}
    }
    void respond(JSONObject response){try{response.put("type","response");}catch(Exception ignored){}send(response);}
    private void send(JSONObject value){WebSocket s=socket;if(s!=null&&s.queueSize()<3000000){if(!s.send(value.toString()))fail(s);}else if(s!=null)fail(s);}
    public void onClosed(WebSocket ws,int code,String reason){fail(ws);}
    public void onFailure(WebSocket ws,Throwable t,Response response){fail(ws);}
    private synchronized void fail(WebSocket ws){
        if(ws!=socket)return;
        ws.cancel();socket=null;connecting=false;
        long delay=Math.min(30000,1000L<<Math.min(attempts++,5));nextAttempt=System.currentTimeMillis()+delay+ThreadLocalRandom.current().nextLong(500);
        health.set("relay","unavailable","TRANSPORT_CLOSED",generation);
    }
    public synchronized void close(){closed=true;renewal.shutdownNow();WebSocket s=socket;socket=null;if(s!=null)s.cancel();client.dispatcher().cancelAll();client.connectionPool().evictAll();}
}
