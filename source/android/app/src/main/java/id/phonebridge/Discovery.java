package id.phonebridge;

import android.content.Context;
import android.net.nsd.*;
import java.net.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

final class Discovery implements AutoCloseable {
    private final NsdManager nsd;
    private final Health health;
    private final Map<String,Integer> ports=new ConcurrentHashMap<>();
    private final ArrayDeque<NsdServiceInfo> waiting=new ArrayDeque<>();
    private boolean resolving,closed;
    Discovery(Context c,Health h) { nsd=(NsdManager)c.getSystemService(Context.NSD_SERVICE);health=h; }
    private final NsdManager.DiscoveryListener listener=new NsdManager.DiscoveryListener() {
        public void onDiscoveryStarted(String t) {health.set("discovery","connecting","SEARCHING_LOCAL_ENDPOINT",0);}
        public void onServiceFound(NsdServiceInfo service) { synchronized(Discovery.this){if(!closed&&waiting.size()<8){waiting.add(service);resolveNext();}} }
        public void onServiceLost(NsdServiceInfo service) {ports.remove(service.getServiceName());}
        public void onDiscoveryStopped(String t) {}
        public void onStartDiscoveryFailed(String t,int code) {health.set("discovery","unavailable","NSD_START_FAILED",0);}
        public void onStopDiscoveryFailed(String t,int code) {}
    };
    void start() {nsd.discoverServices("_adb-tls-connect._tcp.",NsdManager.PROTOCOL_DNS_SD,listener);}
    private synchronized void resolveNext() {
        if(closed||resolving||waiting.isEmpty()) return;
        resolving=true; NsdServiceInfo service=waiting.remove();
        nsd.resolveService(service,new NsdManager.ResolveListener(){
            public void onResolveFailed(NsdServiceInfo s,int code) {done();}
            public void onServiceResolved(NsdServiceInfo s) {
                try {
                    InetAddress address=s.getHost();
                    boolean local=address!=null&&(address.isLoopbackAddress()||NetworkInterface.getByInetAddress(address)!=null);
                    if(local&&s.getPort()>0){ports.put(s.getServiceName(),s.getPort());health.set("discovery","healthy","LOCAL_ENDPOINT_FOUND",0);}
                } catch(Exception ignored) {} finally {done();}
            }
            private void done() {synchronized(Discovery.this){resolving=false;resolveNext();}}
        });
    }
    List<Integer> candidates(){return new ArrayList<>(ports.values());}
    public synchronized void close(){closed=true;waiting.clear();ports.clear();try{nsd.stopServiceDiscovery(listener);}catch(Exception ignored){}}
}
