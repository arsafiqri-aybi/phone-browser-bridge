package id.phonebridge;

import org.json.JSONObject;
import java.util.concurrent.ConcurrentHashMap;

final class Health {
    private final ConcurrentHashMap<String,JSONObject> layers = new ConcurrentHashMap<>();
    void set(String layer,String state,String reason,long generation) {
        try {
            long now=System.currentTimeMillis(); JSONObject prior=layers.get(layer);
            layers.put(layer,new JSONObject().put("state",state).put("reasonCode",reason).put("checkedAt",now)
                .put("lastSuccessAt",state.equals("healthy")?now:(prior==null?JSONObject.NULL:prior.opt("lastSuccessAt")))
                .put("connectionGeneration",generation));
        } catch(Exception ignored) {}
    }
    JSONObject snapshot(String intent) {
        JSONObject out=new JSONObject(); long now=System.currentTimeMillis();
        try {
            for(String name: new String[]{"discovery","adb","chrome","relay"}) {
                JSONObject layer=layers.get(name); if(layer==null) layer=new JSONObject().put("state","unknown");
                else layer=new JSONObject(layer.toString());
                if(now-layer.optLong("checkedAt",0)>20000) layer.put("state","unknown").put("reasonCode","STALE_OBSERVATION");
                out.put(name,layer);
            }
            out.put("ownerIntent",intent).put("checkedAt",now).put("heapBytes",Runtime.getRuntime().totalMemory()-Runtime.getRuntime().freeMemory());
        } catch(Exception ignored) {}
        return out;
    }
}
