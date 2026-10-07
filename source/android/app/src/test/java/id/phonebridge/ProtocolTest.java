package id.phonebridge;
import org.junit.Test;
import org.json.JSONObject;
import static org.junit.Assert.*;

public class ProtocolTest {
    JSONObject envelope()throws Exception{return new JSONObject().put("protocolVersion",1).put("installationId","install").put("deviceId","device").put("connectionGeneration",7).put("deadlineAt",System.currentTimeMillis()+10000).put("method","navigate").put("payload",new JSONObject().put("tabId","abc").put("url","https://example.com")).put("actionId","abcdefghijklmnop").put("payloadDigest",Protocol.digest("navigate",new JSONObject().put("url","https://example.com").put("tabId","abc")));}
    @Test public void validAndCrossDeviceDenied()throws Exception{JSONObject e=envelope();Protocol.validate(e,"install","device",7);try{Protocol.validate(e,"install","other",7);fail();}catch(Exception ex){assertEquals("WRONG_DEVICE",ex.getMessage());}}
    @Test public void staleAndExpiredDenied()throws Exception{JSONObject e=envelope();try{Protocol.validate(e,"install","device",8);fail();}catch(Exception ex){assertEquals("STALE_GENERATION",ex.getMessage());}e.put("deadlineAt",0);try{Protocol.validate(e,"install","device",7);fail();}catch(Exception ex){assertEquals("DEADLINE_EXPIRED",ex.getMessage());}}
    @Test public void alteredPayloadDenied()throws Exception{JSONObject e=envelope();e.getJSONObject("payload").put("url","https://different.example");try{Protocol.validate(e,"install","device",7);fail();}catch(Exception ex){assertEquals("DIGEST_MISMATCH",ex.getMessage());}}
    @Test public void canonicalDigestMatchesJavaScript()throws Exception{assertEquals("52c7455a2098c840b37b6f4fab04a03a7b7cd2a9f5b2b62f08a27d2ecae3aca7",Protocol.digest("tabs",new JSONObject()));}
    @Test public void canonicalEscapesMatchJsonStringify()throws Exception{assertEquals("{\"text\":\"</script>\\n😀\"}",Protocol.canonical(new JSONObject().put("text","</script>\n😀")));}
}
