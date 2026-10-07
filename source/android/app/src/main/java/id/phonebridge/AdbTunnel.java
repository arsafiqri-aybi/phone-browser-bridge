package id.phonebridge;

import io.github.muntashirakon.adb.AdbStream;
import java.net.*;
import java.io.*;
import java.util.Set;
import java.util.concurrent.*;

// A loopback-only proxy to one allowlisted ADB service, never a remote shell.
final class AdbTunnel implements AutoCloseable {
    private final EmbeddedAdb adb;
    private final ServerSocket server;
    private final Set<Socket> sockets=ConcurrentHashMap.newKeySet();
    private final Set<AdbStream> streams=ConcurrentHashMap.newKeySet();
    private final ExecutorService pumps=Executors.newFixedThreadPool(16);
    private volatile boolean closed;
    AdbTunnel(EmbeddedAdb client) throws IOException {
        adb=client;server=new ServerSocket(0,8,InetAddress.getByName("127.0.0.1"));
        Thread t=new Thread(this::accept,"chrome-loopback");t.setDaemon(true);t.start();
    }
    int port(){return server.getLocalPort();}
    private void accept(){
        while(!closed) try {
            Socket socket=server.accept();
            if(sockets.size()>=6){socket.close();continue;}
            socket.setSoTimeout(30000);sockets.add(socket);
            pumps.execute(()->{
                AdbStream stream=null;
                try {
                    stream=adb.openStream("localabstract:chrome_devtools_remote");streams.add(stream);
                    final AdbStream target=stream;
                    pumps.execute(()->{try{copy(target.openInputStream(),socket.getOutputStream());}catch(Exception ignored){}finally{close(socket,target);}});
                    copy(socket.getInputStream(),stream.openOutputStream());
                }catch(Exception ignored){}finally{close(socket,stream);}
            });
        }catch(Exception e){if(!closed)close();}
    }
    private static void copy(InputStream input,OutputStream output)throws IOException {
        byte[] buffer=new byte[16384];int n;while((n=input.read(buffer))!=-1){output.write(buffer,0,n);output.flush();}
    }
    private void close(Socket socket,AdbStream stream){sockets.remove(socket);if(stream!=null)streams.remove(stream);try{socket.close();}catch(Exception ignored){}try{if(stream!=null)stream.close();}catch(Exception ignored){}}
    public void close(){closed=true;try{server.close();}catch(Exception ignored){}for(Socket s:sockets)try{s.close();}catch(Exception ignored){}for(AdbStream s:streams)try{s.close();}catch(Exception ignored){}pumps.shutdownNow();}
}
