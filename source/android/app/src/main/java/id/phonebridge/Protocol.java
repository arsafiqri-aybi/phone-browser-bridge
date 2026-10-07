package id.phonebridge;

import org.json.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class Protocol {
    public static final int VERSION = 1;
    public static final Set<String> METHODS = Set.of("tabs", "open", "switch", "close", "navigate", "back", "reload", "read", "click", "type", "scroll", "screenshot");
    public static boolean mutating(String method) { return !Set.of("tabs", "read", "screenshot").contains(method); }
    private static String quote(String value) {
        StringBuilder out=new StringBuilder("\"");
        for(int i=0;i<value.length();i++) {char c=value.charAt(i);switch(c){case '"':out.append("\\\"");break;case '\\':out.append("\\\\");break;case '\b':out.append("\\b");break;case '\f':out.append("\\f");break;case '\n':out.append("\\n");break;case '\r':out.append("\\r");break;case '\t':out.append("\\t");break;default:
            if(c<32||(Character.isSurrogate(c)&&!(Character.isHighSurrogate(c)&&i+1<value.length()&&Character.isLowSurrogate(value.charAt(i+1)))&&!(Character.isLowSurrogate(c)&&i>0&&Character.isHighSurrogate(value.charAt(i-1)))))out.append(String.format("\\u%04x",(int)c));else out.append(c);
        }}
        return out.append('"').toString();
    }
    public static String canonical(Object value) throws JSONException {
        if (value instanceof JSONObject o) {
            List<String> keys = new ArrayList<>(); o.keys().forEachRemaining(keys::add); Collections.sort(keys);
            List<String> out = new ArrayList<>(); for (String k : keys) out.add(quote(k) + ":" + canonical(o.get(k)));
            return "{" + String.join(",", out) + "}";
        }
        if (value instanceof JSONArray a) { List<String> out = new ArrayList<>(); for (int i=0;i<a.length();i++) out.add(canonical(a.get(i))); return "["+String.join(",",out)+"]"; }
        if (value == null || value == JSONObject.NULL) return "null";
        if (value instanceof String s) return quote(s);
        return String.valueOf(value);
    }
    public static String hash(String value) throws Exception {
        byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        StringBuilder s = new StringBuilder(); for (byte b : bytes) s.append(String.format("%02x", b)); return s.toString();
    }
    public static String digest(String method, JSONObject payload) throws Exception { return hash(canonical(new JSONObject().put("method",method).put("payload",payload))); }
    public static void validate(JSONObject e, String installation, String device, long generation) throws Exception {
        if (e.toString().length() > 65536 || e.getInt("protocolVersion") != VERSION) throw new Exception("BAD_ENVELOPE");
        if (!installation.equals(e.getString("installationId")) || !device.equals(e.getString("deviceId"))) throw new Exception("WRONG_DEVICE");
        if (e.getLong("connectionGeneration") != generation) throw new Exception("STALE_GENERATION");
        long remaining=e.getLong("deadlineAt")-System.currentTimeMillis();
        if (remaining <= 0 || remaining > 30000) throw new Exception("DEADLINE_EXPIRED");
        String m=e.getString("method"); if (!METHODS.contains(m)) throw new Exception("UNSUPPORTED_METHOD");
        JSONObject p=e.getJSONObject("payload");
        if(p.toString().length()>16000)throw new Exception("BAD_PAYLOAD");
        if(!Set.of("tabs","open").contains(m)&&!p.optString("tabId").matches("[A-Za-z0-9_-]{1,100}"))throw new Exception("BAD_TAB_ID");
        if(Set.of("click","type").contains(m)&&(!p.optBoolean("consent")||!p.has("expectedOrigin")||!p.has("documentId")||!p.has("generation")))throw new Exception("EXPLICIT_ACTION_CONSENT_REQUIRED");
        if (!digest(m,e.getJSONObject("payload")).equals(e.getString("payloadDigest"))) throw new Exception("DIGEST_MISMATCH");
        if (mutating(m) && !e.optString("actionId").matches("[A-Za-z0-9_-]{16,100}")) throw new Exception("ACTION_ID_REQUIRED");
    }
}
