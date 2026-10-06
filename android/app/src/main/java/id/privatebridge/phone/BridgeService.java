package id.privatebridge.phone;

import android.app.*;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.*;
import org.json.JSONObject;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.concurrent.*;

public class BridgeService extends Service {
    public static volatile boolean running = false;
    private volatile boolean stopping=false;
    private ServerSocket listener;
    private static PowerManager.WakeLock wake;
    public static synchronized boolean wakeHeld(){return wake!=null && wake.isHeld();}
    public static synchronized void releaseWake(){if(wake!=null && wake.isHeld())wake.release();}
    private synchronized void holdWake(){if(wake==null){wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"id.privatebridge.phone:OwnerSession");wake.setReferenceCounted(false);}if(!wake.isHeld())wake.acquire();}
    private Thread acceptor;
    private final ThreadPoolExecutor workers = new ThreadPoolExecutor(1, 2, 30, TimeUnit.SECONDS, new ArrayBlockingQueue<>(8));
    private static final String CHANNEL = "phone_bridge";
    @Override public void onCreate() {
        super.onCreate();
        NotificationManager notifications = (NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        notifications.createNotificationChannel(new NotificationChannel(CHANNEL, "Kendali browser pribadi", NotificationManager.IMPORTANCE_LOW));
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent openIntent = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent pause = PendingIntent.getService(this, 1, new Intent(this, BridgeService.class).setAction("pause"), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notification = new Notification.Builder(this, CHANNEL).setSmallIcon(android.R.drawable.ic_menu_view)
            .setContentTitle("Chrome Bridge").setContentText("Penghubung perangkat aktif · kendali dapat dijeda")
            .setContentIntent(openIntent).setOngoing(true).addAction(new Notification.Action.Builder(null, "Jeda kendali", pause).build()).build();
        if (Build.VERSION.SDK_INT >= 34) startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE); else startForeground(1, notification);
        acceptor = new Thread(() -> {
            try {
                listener = new ServerSocket(); if(stopping){listener.close();return;} listener.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), 8765)); if(stopping){listener.close();return;} running = true;
                while (!listener.isClosed()) {
                    Socket socket = listener.accept(); socket.setSoTimeout(3000);
                    try { workers.execute(() -> handle(socket)); } catch (RejectedExecutionException error) { socket.close(); }
                }
            } catch (IOException error) { running = false; stopSelf(); }
        }, "phone-bridge-listener"); acceptor.start();
    }
    private void handle(Socket socket) {
        try (Socket connection = socket) {
            LocalHttp.Request request = LocalHttp.parse(connection.getInputStream());
            if (!"POST".equals(request.method) || !"/v1/command".equals(request.path)) { LocalHttp.respond(connection.getOutputStream(), 404, "{\"error\":\"Unknown endpoint\"}"); return; }
            String host = request.headers.get("host");
            if (!"127.0.0.1:8765".equals(host) || request.headers.containsKey("origin") || request.headers.containsKey("cookie")) { LocalHttp.respond(connection.getOutputStream(), 403, "{\"error\":\"Local native client only\"}"); return; }
            String authorization = request.headers.getOrDefault("authorization", "");
            String expected = "Bearer " + BridgeState.token(this);
            if (!MessageDigest.isEqual(authorization.getBytes(StandardCharsets.UTF_8), expected.getBytes(StandardCharsets.UTF_8))) { LocalHttp.respond(connection.getOutputStream(), 401, "{\"error\":\"Invalid pairing token\"}"); return; }
            if (!request.headers.getOrDefault("content-type", "").toLowerCase().startsWith("application/json")) { LocalHttp.respond(connection.getOutputStream(), 415, "{\"error\":\"JSON required\"}"); return; }
            JSONObject command = new JSONObject(new String(request.body, StandardCharsets.UTF_8));
            String operation=command.optString("operation");
            if ("agent_heartbeat".equals(operation)) {
                JSONObject a=command.optJSONObject("args");
                if(a==null){LocalHttp.respond(connection.getOutputStream(),400,"{}");return;}
                BridgeState.agentSeen=SystemClock.elapsedRealtime();BridgeState.relayConnected=a.optBoolean("relay_connected");BridgeState.chromeConnected=a.optBoolean("chrome_connected");BridgeState.adbRecovery=a.optBoolean("adb_recovery_configured");
                LocalHttp.respond(connection.getOutputStream(),200,"{\"ok\":true}");return;
            }
            if ("pause".equals(operation)) { BridgeState.pause(); LocalHttp.respond(connection.getOutputStream(),200,BridgeState.status(this).toString()); return; }
            if ("status".equals(operation)) {
                JSONObject status=BridgeState.status(this);
                if(ControlService.instance!=null) {
                    JSONObject screen=ControlService.instance.execute(new JSONObject().put("operation","status"));
                    if(screen.has("foreground_package")) status.put("foreground_package",screen.getString("foreground_package"));
                }
                LocalHttp.respond(connection.getOutputStream(),200,status.toString()); return;
            }
            ControlService controls = ControlService.instance;
            if (controls == null) { LocalHttp.respond(connection.getOutputStream(), 503, "{\"error\":\"Accessibility belum aktif\"}"); return; }
            JSONObject result = controls.execute(command);
            LocalHttp.respond(connection.getOutputStream(), result.has("error") ? 409 : 200, result.toString());
        } catch (Exception ignored) { /* Never log credentials, page content, or request bodies. */ }
    }
    @Override public int onStartCommand(Intent intent, int flags, int id) {
        if (intent != null && "pause".equals(intent.getAction())) BridgeState.pause();
        if(BridgeState.active())holdWake();else releaseWake();
        return BridgeState.active() ? START_STICKY : START_NOT_STICKY;
    }
    @Override public void onDestroy() {
        stopping=true; running = false; releaseWake();
        try { if (listener != null) listener.close(); } catch (IOException ignored) {}
        workers.shutdownNow(); super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}

