package id.phonebridge;

import android.app.*;
import android.content.*;
import android.os.*;
import android.app.KeyguardManager;
import org.json.JSONObject;
import java.util.concurrent.*;

public final class BridgeService extends Service {
    public static volatile BridgeService live;
    final Health health=new Health();
    private SecureStore store;private EmbeddedAdb adb;private Discovery discovery;private AdbTunnel tunnel;
    private volatile BrowserAgent browser,capture;
    private RelayLink relay;private ActionJournal journal;private OverlayPopup popup;
    private final ScheduledExecutorService control=Executors.newSingleThreadScheduledExecutor();
    private final ExecutorService recovery=Executors.newSingleThreadExecutor();
    private final ThreadPoolExecutor actions=new ThreadPoolExecutor(1,1,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(4));
    private final ThreadPoolExecutor screenshots=new ThreadPoolExecutor(1,1,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(1));
    private volatile String intent="stopped";
    private volatile boolean recovering,destroyed;
    private long chromeGeneration,nextRecovery;private int failures;
    public IBinder onBind(Intent i){return null;}
    public void onCreate(){
        super.onCreate();live=this;store=new SecureStore(this);journal=new ActionJournal(this);popup=new OverlayPopup(this);
        NotificationManager nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);nm.createNotificationChannel(new NotificationChannel("bridge","Penghubung Chrome aktif",NotificationManager.IMPORTANCE_LOW));
        intent=getSharedPreferences("intent",0).getString("state","stopped");
        startForeground(1,notification());
        control.scheduleWithFixedDelay(this::tick,0,5,TimeUnit.SECONDS);
    }
    public int onStartCommand(Intent i,int flags,int id){
        String action=i==null?intent:i.getAction();
        if("stop".equals(action)){setIntent("stopped");stopSelf();return START_NOT_STICKY;}
        if("pause".equals(action)){setIntent("paused");closeChrome();actions.getQueue().clear();screenshots.getQueue().clear();}
        if("resume".equals(action)||"pair".equals(action)){setIntent("active");nextRecovery=0;}
        if("popup".equals(action))popup.show();
        if("pair".equals(action)){
            final int port=i.getIntExtra("port",0);final String code=i.getStringExtra("code");
            recovery.execute(()->{try{closeChrome();if(adb!=null)adb.disconnect();adb=new EmbeddedAdb(this,store);adb.pairLocal(port,code);health.set("adb","connecting","PAIR_SUCCESS_DISCOVERING",chromeGeneration);nextRecovery=0;}catch(Exception e){health.set("adb","permission_required","PAIRING_FAILED_REOPEN_SETTINGS",chromeGeneration);}});
        }
        if(intent.equals("stopped")){stopSelf();return START_NOT_STICKY;}
        ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).notify(1,notification());
        return START_STICKY;
    }
    private void setIntent(String value){intent=value;getSharedPreferences("intent",0).edit().putString("state",value).commit();}
    JSONObject status(){JSONObject s=health.snapshot(intent);try{s.put("actionQueue",actions.getQueue().size()).put("captureQueue",screenshots.getQueue().size()).put("processId",android.os.Process.myPid()).put("wakeLockHeld",false);}catch(Exception ignored){}return s;}
    private void tick(){
        if(destroyed||intent.equals("stopped"))return;
        try{
            if(relay==null){String endpoint=store.get("endpoint"),token=store.get("deviceToken");if(endpoint!=null&&token!=null)relay=new RelayLink(endpoint,token,store,health,this::command);else health.set("relay","permission_required","ENROLLMENT_REQUIRED",0);}
            if(relay!=null)relay.tick(status());
            if(intent.equals("paused")){health.set("adb","paused","OWNER_PAUSED",chromeGeneration);health.set("chrome","paused","OWNER_PAUSED",chromeGeneration);return;}
            if(!recovering&&System.currentTimeMillis()>=nextRecovery){recovering=true;recovery.execute(()->{try{recover();}finally{recovering=false;}});}
        }catch(Exception e){health.set("relay","unknown","LOCAL_CONFIGURATION_ERROR",0);}
    }
    private void recover(){
        if(destroyed||!intent.equals("active"))return;
        try{
            if(adb==null)adb=new EmbeddedAdb(this,store);
            if(discovery==null){discovery=new Discovery(this,health);discovery.start();}
            if(!adb.isConnected()){
                closeChrome();health.set("adb","connecting","DISCOVERING_PORT",chromeGeneration);
                boolean connected=false;
                for(int port:discovery.candidates())if(adb.connect("127.0.0.1",port)){connected=true;break;}
                if(!connected)throw new Exception("LOCAL_DEBUG_UNAVAILABLE");
                if(destroyed||!intent.equals("active")){adb.disconnect();return;}
                chromeGeneration++;health.set("adb","healthy","TRUSTED_LOCAL_TLS",chromeGeneration);
            }else health.set("adb","healthy","TRUSTED_LOCAL_TLS",chromeGeneration);
            if(destroyed||!intent.equals("active")){closeChrome();return;}
            if(tunnel==null){tunnel=new AdbTunnel(adb);browser=new BrowserAgent(tunnel.port(),chromeGeneration);capture=new BrowserAgent(tunnel.port(),chromeGeneration);}
            browser.probe();health.set("chrome","healthy","DEVTOOLS_PROBE_OK",chromeGeneration);failures=0;nextRecovery=System.currentTimeMillis()+5000;
        }catch(Exception e){
            health.set("chrome","unavailable","OPEN_CHROME_AND_WIRELESS_DEBUG",chromeGeneration);
            if(adb==null||!adb.isConnected())health.set("adb","unavailable","DEBUG_DISCOVERY_OR_TRUST_REQUIRED",chromeGeneration);
            nextRecovery=System.currentTimeMillis()+Math.min(30000,1000L<<Math.min(failures++,5))+ThreadLocalRandom.current().nextInt(500);
            if(browser!=null)closeChrome();
        }
    }
    private void command(JSONObject e,long generation){
        try{
            String installation=store.get("installationId"),device=store.get("deviceId");Protocol.validate(e,installation,device,generation);
            if(!intent.equals("active"))throw new Exception("OWNER_PAUSED");
            if(((KeyguardManager)getSystemService(KEYGUARD_SERVICE)).isKeyguardLocked())throw new Exception("DEVICE_LOCKED");
            ThreadPoolExecutor pool=e.getString("method").equals("screenshot")?screenshots:actions;
            pool.execute(()->execute(e,generation));
        }catch(Exception ex){reply(e,generation,"ERROR",null,errorCode(ex));}
    }
    private void execute(JSONObject e,long generation){
        String action=e.optString("actionId"),method=e.optString("method");boolean recorded=false;long start=System.nanoTime();
        try{
            if(!intent.equals("active")||destroyed)throw new Exception("OWNER_PAUSED");
            if(relay==null||!relay.connected()||relay.generation()!=generation)throw new Exception("STALE_GENERATION");
            if(((KeyguardManager)getSystemService(KEYGUARD_SERVICE)).isKeyguardLocked())throw new Exception("DEVICE_LOCKED");
            Protocol.validate(e,store.get("installationId"),store.get("deviceId"),generation);
            if(Protocol.mutating(method)){
                JSONObject prior=journal.begin(action,e.getString("payloadDigest"));if(prior!=null){reply(e,generation,prior.getString("status"),prior.optJSONObject("result"),null);return;}recorded=true;
            }
            BrowserAgent target=method.equals("screenshot")?capture:browser;if(target==null)throw new Exception("CHROME_UNAVAILABLE");
            JSONObject result=target.execute(method,e.getJSONObject("payload"),e.getLong("deadlineAt"));
            if(recorded)journal.finish(action,"DONE",new JSONObject().put("executedAt",System.currentTimeMillis()));
            reply(e,generation,"DONE",result,null);
        }catch(Exception ex){
            if(recorded)journal.finish(action,"UNKNOWN",null);
            reply(e,generation,recorded?"UNKNOWN":"ERROR",null,errorCode(ex));
        }finally{
            // Only metadata is logged: never exception messages, URLs, content, or tokens.
            android.util.Log.i("PhoneBridge","component=browser event=command_complete method="+method+" durationMs="+(System.nanoTime()-start)/1000000+" generation="+generation);
        }
    }
    private static String errorCode(Exception e){
        if(e instanceof RejectedExecutionException)return "OVERLOADED";
        if(e instanceof TimeoutException)return "TIMEOUT";
        String message=e.getMessage();return message!=null&&message.matches("[A-Z_]{3,80}")?message:"COMMAND_FAILED";
    }
    private void reply(JSONObject e,long generation,String state,JSONObject result,String error){
        try{if(relay!=null)relay.respond(new JSONObject().put("protocolVersion",1).put("requestId",e.optString("requestId")).put("actionId",e.optString("actionId")).put("payloadDigest",e.optString("payloadDigest")).put("connectionGeneration",generation).put("status",state).put("result",result==null?JSONObject.NULL:result).put("error",error==null?JSONObject.NULL:new JSONObject().put("code",error)).put("executedAt",state.equals("DONE")?System.currentTimeMillis():JSONObject.NULL));}catch(Exception ignored){}
    }
    private synchronized void closeChrome(){BrowserAgent b=browser,c=capture;browser=null;capture=null;if(b!=null)b.close();if(c!=null)c.close();if(tunnel!=null)tunnel.close();tunnel=null;}
    private Notification notification(){
        Notification.Builder b=new Notification.Builder(this,"bridge").setSmallIcon(id.phonebridge.R.drawable.ic_bridge).setContentTitle("Penghubung Chrome").setContentText(intent.equals("paused")?"Dijeda oleh Anda":"Layanan terlihat aktif; periksa status di aplikasi").setOngoing(true);
        b.setContentIntent(PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT));
        for(String a:new String[]{"pause","resume","stop","popup"})b.addAction(new Notification.Action.Builder(null,a.equals("pause")?"Jeda":a.equals("resume")?"Lanjut":a.equals("stop")?"Stop":"Popup",PendingIntent.getService(this,a.hashCode(),new Intent(this,BridgeService.class).setAction(a),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT)).build());
        return b.build();
    }
    public void onDestroy(){
        destroyed=true;live=null;popup.close();control.shutdownNow();recovery.shutdownNow();actions.shutdownNow();screenshots.shutdownNow();if(relay!=null)relay.close();if(discovery!=null)discovery.close();closeChrome();if(adb!=null)try{adb.disconnect();}catch(Exception ignored){}journal.close();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();
    }
}
