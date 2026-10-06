import id.privatebridge.phone.LocalHttp;
import java.io.*;
import java.nio.charset.StandardCharsets;
public class LocalHttpTest {
    static int count=0;
    static LocalHttp.Request parse(String value)throws Exception{return LocalHttp.parse(new ByteArrayInputStream(value.getBytes(StandardCharsets.UTF_8)));}
    static void reject(String value)throws Exception{try{parse(value);throw new AssertionError("Malformed request accepted");}catch(IOException expected){count++;}}
    public static void main(String[] args)throws Exception{
        String start="POST /v1/command HTTP/1.1\r\nHost: 127.0.0.1:8765\r\n";
        LocalHttp.Request good=parse(start+"Content-Length: 2\r\n\r\n{}");if(!good.path.equals("/v1/command")||good.body.length!=2)throw new AssertionError();count++;
        reject(start+"Content-Length: 2\r\nContent-Length: 2\r\n\r\n{}");
        reject(start+"Transfer-Encoding: chunked\r\n\r\n0\r\n\r\n");
        reject(start+"Content-Length: 65537\r\n\r\n");
        reject(start+"Content-Length: -1\r\n\r\n");
        reject(start+"Content-Length: 3\r\n\r\n{}");
        reject("POST / HTTP/1.1\nHost: x\n\n");
        reject(start+" x: folded\r\n\r\n");
        reject(start+"X-Test: "+new String(new char[5000]).replace('\0','a')+"\r\n\r\n");
        ByteArrayOutputStream response=new ByteArrayOutputStream();LocalHttp.respond(response,200,"{\"value\":\"é\"}");
        String text=response.toString("UTF-8");if(!text.contains("Content-Length: 14\r\n")||!text.contains("Connection: close"))throw new AssertionError(text);count++;
        System.out.println("LocalHttp native parser: "+count+" checks passed.");
    }
}
