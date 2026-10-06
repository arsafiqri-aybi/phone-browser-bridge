package id.privatebridge.phone;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONObject;
import android.util.Base64;
import java.security.SecureRandom;

public final class BridgeState {
    private static SharedPreferences preferences;
    public static void init(Context context) { preferences = context.getSharedPreferences("bridge", Context.MODE_PRIVATE); }
    public static volatile long agentSeen = 0;
    public static volatile boolean relayConnected = false, chromeConnected = false, adbRecovery = false;
    public static volatile String accessibilityEvent = "belum tersambung";
    public static JSONObject status(Context context) throws Exception {
        android.os.PowerManager power=(android.os.PowerManager)context.getSystemService(Context.POWER_SERVICE);
        String enabled=android.provider.Settings.Secure.getString(context.getContentResolver(), android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        boolean permission=enabled!=null && enabled.toLowerCase(java.util.Locale.ROOT).contains("id.privatebridge.phone/");
        return new JSONObject().put("active", active()).put("session_duration_limit", JSONObject.NULL)
          .put("accessibility_enabled", permission).put("accessibility_connected", ControlService.instance!=null)
          .put("accessibility_event", accessibilityEvent).put("bridge_running", BridgeService.running)
          .put("wake_lock_held", BridgeService.wakeHeld()).put("agent_connected", android.os.SystemClock.elapsedRealtime()-agentSeen<45000 && agentSeen>0)
          .put("android_api", android.os.Build.VERSION.SDK_INT).put("screen_awake", power.isInteractive())
          .put("locked", ((android.app.KeyguardManager)context.getSystemService(Context.KEYGUARD_SERVICE)).isKeyguardLocked())
          .put("battery_optimization_exempt", power.isIgnoringBatteryOptimizations(context.getPackageName()));
    }
    private BridgeState() {}
    public static void startSession() { preferences.edit().putBoolean("owner_enabled", true).commit(); }
    public static void pause() { BridgeService.releaseWake(); if(preferences!=null) preferences.edit().putBoolean("owner_enabled", false).commit(); }
    public static boolean active() { return preferences!=null && preferences.getBoolean("owner_enabled", false); }
    public static long remainingSeconds() { return 0; }
    public static synchronized String token(Context context) {
        SharedPreferences prefs = context.getSharedPreferences("bridge", Context.MODE_PRIVATE);
        String value = prefs.getString("token", null);
        if (value == null) { value = generate(); prefs.edit().putString("token", value).apply(); }
        return value;
    }
    public static synchronized void rotateToken(Context context) { pause(); context.getSharedPreferences("bridge", Context.MODE_PRIVATE).edit().putString("token", generate()).commit(); }
    private static String generate() { byte[] bytes = new byte[32]; new SecureRandom().nextBytes(bytes); return Base64.encodeToString(bytes, Base64.NO_WRAP | Base64.URL_SAFE | Base64.NO_PADDING); }
}

