package id.phonebridge;

import okhttp3.*;
import org.json.*;
import android.util.Base64;
import android.graphics.BitmapFactory;
import java.net.URI;
import java.util.*;
import java.util.concurrent.TimeUnit;

final class BrowserAgent implements AutoCloseable {
    private final OkHttpClient http=new OkHttpClient.Builder().callTimeout(8,TimeUnit.SECONDS).readTimeout(30,TimeUnit.SECONDS).build();
    private final String base;
    private final Map<String,CdpSession> sessions=new java.util.concurrent.ConcurrentHashMap<>();
    private volatile long generation;
    BrowserAgent(int port,long gen){base="http://127.0.0.1:"+port;generation=gen;}
    private Object endpoint(String path,boolean put,long deadline)throws Exception {
        Request.Builder b=new Request.Builder().url(base+path);if(put)b.put(RequestBody.create(new byte[0],null));
        Call call=http.newCall(b.build());call.timeout().timeout(Math.max(1,deadline-System.currentTimeMillis()),TimeUnit.MILLISECONDS);
        try(Response r=call.execute()){
            if(!r.isSuccessful()||r.body()==null)throw new Exception("CHROME_UNAVAILABLE");
            if(r.body().contentLength()>262144)throw new Exception("RESPONSE_TOO_LARGE");
            String text=r.body().string();if(text.length()>262144)throw new Exception("RESPONSE_TOO_LARGE");
            return text.startsWith("[")?new JSONArray(text):new JSONObject(text);
        }
    }
    void probe()throws Exception {endpoint("/json/version",false,System.currentTimeMillis()+4000);}
    private static void id(String id)throws Exception {if(!id.matches("[A-Za-z0-9_-]{1,100}"))throw new Exception("BAD_TAB_ID");}
    private static void url(String value)throws Exception {
        URI uri=new URI(value);if(!Set.of("https","http").contains(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||value.length()>2048)throw new Exception("BAD_URL");
    }
    private boolean protectedTab(JSONObject tab){try{String host=new URI(tab.optString("url")).getHost();return host!=null&&(host.equals("chatgpt.com")||host.endsWith(".chatgpt.com")||host.equals("chat.openai.com"));}catch(Exception e){return true;}}
    private JSONObject tab(String id,long deadline)throws Exception {
        id(id);JSONArray tabs=(JSONArray)endpoint("/json/list",false,deadline);
        for(int i=0;i<tabs.length();i++){JSONObject t=tabs.getJSONObject(i);if(id.equals(t.optString("id"))){if(protectedTab(t))throw new Exception("PROTECTED_CONTROLLER_TAB");if(!"page".equals(t.optString("type")))throw new Exception("NOT_PAGE");return t;}}
        throw new Exception("TAB_GONE");
    }
    private CdpSession session(String id,long deadline)throws Exception {
        JSONObject tab=tab(id,deadline);if(sessions.size()>6)throw new Exception("TOO_MANY_TAB_SESSIONS");
        CdpSession s=sessions.get(id);if(s!=null)return s;
        URI ws=new URI(tab.getString("webSocketDebuggerUrl"));
        // Never trust a DevTools-provided remote hostname. The proxy is only localhost.
        String socketUrl=base.replace("http:","ws:")+ws.getRawPath();
        s=new CdpSession(http,socketUrl);sessions.put(id,s);return s;
    }
    private JSONObject evaluate(CdpSession s,String expression,long deadline)throws Exception {
        JSONObject r=s.call("Runtime.evaluate",new JSONObject().put("expression",expression).put("returnByValue",true).put("awaitPromise",false),deadline);
        if(r.has("exceptionDetails"))throw new Exception("PAGE_CHANGED_OR_UNSUPPORTED");
        return r.getJSONObject("result");
    }
    JSONObject execute(String method,JSONObject p,long deadline)throws Exception {
        if(System.currentTimeMillis()>=deadline)throw new Exception("TIMEOUT");
        if(method.equals("tabs")){
            JSONArray raw=(JSONArray)endpoint("/json/list",false,deadline),out=new JSONArray();
            for(int i=0;i<raw.length();i++){JSONObject t=raw.getJSONObject(i);if("page".equals(t.optString("type")))out.put(new JSONObject().put("tabId",t.getString("id")).put("title",t.optString("title")).put("origin",origin(t.optString("url"))).put("protected",protectedTab(t)));}
            return new JSONObject().put("tabs",out).put("generation",generation);
        }
        if(method.equals("open")){
            String value=p.getString("url");url(value);JSONObject t=(JSONObject)endpoint("/json/new?"+java.net.URLEncoder.encode(value,"UTF-8"),true,deadline);
            return new JSONObject().put("tabId",t.getString("id"));
        }
        String id=p.getString("tabId");JSONObject current=tab(id,deadline);
        if(p.has("expectedOrigin")&&!p.getString("expectedOrigin").equals(origin(current.optString("url"))))throw new Exception("ORIGIN_CHANGED");
        if(method.equals("switch")||method.equals("close")){
            endpointText("/json/"+(method.equals("close")?"close/":"activate/")+id,deadline);
            if(method.equals("close")){CdpSession s=sessions.remove(id);if(s!=null)s.close();}
            return new JSONObject().put("tabId",id);
        }
        CdpSession s=session(id,deadline);
        try {
            switch(method){
                case "navigate":url(p.getString("url"));return s.call("Page.navigate",new JSONObject().put("url",p.getString("url")),deadline);
                case "reload":return s.call("Page.reload",new JSONObject(),deadline);
                case "back":{
                    JSONObject h=s.call("Page.getNavigationHistory",new JSONObject(),deadline);int index=h.getInt("currentIndex")-1;if(index<0)throw new Exception("NO_HISTORY");
                    return s.call("Page.navigateToHistoryEntry",new JSONObject().put("entryId",h.getJSONArray("entries").getJSONObject(index).getInt("id")),deadline);
                }
                case "read":{
                    String script="(()=>{const key='__phoneBridgeRefsV1';let r=window[key];if(!r||r.doc!==document){r={doc:document,id:crypto.randomUUID(),refs:[],at:0};window[key]=r;}r.at=Date.now();r.refs=[...document.querySelectorAll('a,button,input,textarea,select,[role=button]')].filter(e=>e.getBoundingClientRect().width>0).slice(0,120);return {documentId:r.id,origin:location.origin,text:(document.body?.innerText||'').slice(0,18000),elements:r.refs.map((e,i)=>({ref:String(i),tag:e.tagName,text:(e.innerText||e.getAttribute('aria-label')||'').slice(0,160),type:e.type||''}))};})()";
                    JSONObject out=evaluate(s,script,deadline).getJSONObject("value");out.put("tabId",id).put("generation",generation).put("untrustedContent",true);return out;
                }
                case "click":case "type":{
                    if(p.getLong("generation")!=generation)throw new Exception("STALE_REFERENCE");
                    String ref=p.getString("ref");if(!ref.matches("[0-9]{1,3}"))throw new Exception("BAD_REFERENCE");
                    String value=p.optString("text");if(value.length()>4096)throw new Exception("TEXT_TOO_LONG");
                    String script="(()=>{const r=window.__phoneBridgeRefsV1;if(!r||r.doc!==document||r.id!=="+JSONObject.quote(p.getString("documentId"))+"||Date.now()-r.at>60000)throw Error('STALE_REFERENCE');const e=r.refs["+ref+"];if(!e||!e.isConnected)throw Error('ELEMENT_GONE');";
                    if(method.equals("type"))script+="if(e.type==='password')throw Error('PASSWORD_INPUT_DENIED');if(!['INPUT','TEXTAREA'].includes(e.tagName))throw Error('NOT_TEXT_INPUT');e.focus();const set=Object.getOwnPropertyDescriptor(e.tagName==='INPUT'?HTMLInputElement.prototype:HTMLTextAreaElement.prototype,'value').set;set.call(e,"+JSONObject.quote(value)+");e.dispatchEvent(new Event('input',{bubbles:true}));";
                    else script+="e.click();";
                    evaluate(s,script+"return {done:true};})()",deadline);return new JSONObject().put("done",true);
                }
                case "scroll":{
                    int dy=p.getInt("dy");if(Math.abs((long)dy)>4000)throw new Exception("BAD_SCROLL");evaluate(s,"scrollBy(0,"+dy+");({done:true})",deadline);return new JSONObject().put("done",true);
                }
                case "screenshot":{
                    long start=System.nanoTime();JSONObject metrics=s.call("Page.getLayoutMetrics",new JSONObject(),deadline);JSONObject viewport=metrics.getJSONObject("cssVisualViewport");
                    double width=Math.min(1280,viewport.getDouble("clientWidth")),height=Math.min(1280,viewport.getDouble("clientHeight"));
                    JSONObject clip=new JSONObject().put("x",viewport.getDouble("pageX")).put("y",viewport.getDouble("pageY")).put("width",width).put("height",height).put("scale",Math.min(1,1280/Math.max(width,height)));
                    JSONObject capture=s.call("Page.captureScreenshot",new JSONObject().put("format","jpeg").put("quality",65).put("fromSurface",true).put("captureBeyondViewport",false).put("clip",clip),deadline);
                    String data=capture.getString("data");if(data.length()>2000000)throw new Exception("SCREENSHOT_TOO_LARGE");
                    byte[] decoded=Base64.decode(data,Base64.DEFAULT);BitmapFactory.Options opts=new BitmapFactory.Options();opts.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(decoded,0,decoded.length,opts);
                    if(opts.outWidth<=0||opts.outHeight<=0||!"image/jpeg".equals(opts.outMimeType))throw new Exception("SCREENSHOT_UNAVAILABLE");
                    return new JSONObject().put("data",data).put("mimeType","image/jpeg").put("width",opts.outWidth).put("height",opts.outHeight).put("bytes",decoded.length).put("captureMillis",(System.nanoTime()-start)/1000000).put("capturedAt",System.currentTimeMillis());
                }
                default:throw new Exception("UNSUPPORTED_METHOD");
            }
        }catch(Exception e){
            // Capture has its own connection in BridgeService; failed calls clear pending requests.
            if(e instanceof java.util.concurrent.TimeoutException||e.getMessage()!=null&&e.getMessage().contains("CDP_")){sessions.remove(id,s);s.close();}
            throw e;
        }
    }
    private void endpointText(String path,long deadline)throws Exception {Call call=http.newCall(new Request.Builder().url(base+path).build());call.timeout().timeout(Math.max(1,deadline-System.currentTimeMillis()),TimeUnit.MILLISECONDS);try(Response r=call.execute()){if(!r.isSuccessful())throw new Exception("CHROME_COMMAND_FAILED");}}
    private static String origin(String value){try{URI u=new URI(value);return u.getScheme()+"://"+u.getAuthority();}catch(Exception e){return "unknown";}}
    public void close(){for(CdpSession s:sessions.values())s.close();sessions.clear();http.dispatcher().cancelAll();http.connectionPool().evictAll();}
}
