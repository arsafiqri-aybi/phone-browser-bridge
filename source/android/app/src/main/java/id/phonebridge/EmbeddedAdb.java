package id.phonebridge;

import android.content.Context;
import android.os.Build;
import android.util.Base64;
import io.github.muntashirakon.adb.*;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.jcajce.*;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import java.math.BigInteger;
import java.security.*;
import java.security.cert.*;
import java.security.spec.PKCS8EncodedKeySpec;
import java.io.ByteArrayInputStream;
import java.util.Date;
import java.util.concurrent.TimeUnit;

final class EmbeddedAdb extends AbsAdbConnectionManager {
    private final PrivateKey key;
    private final X509Certificate cert;
    EmbeddedAdb(Context c,SecureStore store) throws Exception {
        setApi(Build.VERSION.SDK_INT); setTimeout(5,TimeUnit.SECONDS); setThrowOnUnauthorised(true); setHostAddress("127.0.0.1");
        String k=store.get("adbKey"), certificate=store.get("adbCert");
        if(k==null || certificate==null) {
            KeyPairGenerator generator=KeyPairGenerator.getInstance("RSA"); generator.initialize(2048); java.security.KeyPair pair=generator.generateKeyPair();
            X500Name name=new X500Name("CN=Phone Browser Bridge");
            cert=new JcaX509CertificateConverter().getCertificate(new JcaX509v3CertificateBuilder(name,new BigInteger(128,new SecureRandom()),new Date(System.currentTimeMillis()-60000),new Date(System.currentTimeMillis()+10L*365*86400000),name,pair.getPublic()).build(new JcaContentSignerBuilder("SHA256withRSA").build(pair.getPrivate())));
            key=pair.getPrivate(); store.put("adbKey",Base64.encodeToString(key.getEncoded(),Base64.NO_WRAP)); store.put("adbCert",Base64.encodeToString(cert.getEncoded(),Base64.NO_WRAP));
        } else {
            key=KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(Base64.decode(k,0)));
            cert=(X509Certificate)CertificateFactory.getInstance("X.509").generateCertificate(new ByteArrayInputStream(Base64.decode(certificate,0)));
        }
        PeerTrust.configure(new PeerTrust.Policy() {
            public void verify(X509Certificate peer) throws CertificateException {
                try {
                    String pin=store.get("adbPeerPin");
                    if(pin==null || !MessageDigest.isEqual(pin.getBytes(),fingerprint(peer).getBytes())) throw new CertificateException("PAIRING_REQUIRED_OR_PEER_CHANGED");
                } catch(CertificateException e) {throw e;} catch(Exception e) {throw new CertificateException("TRUST_STORAGE_FAILED");}
            }
            public void remember(X509Certificate peer) throws CertificateException {
                try {store.put("adbPeerPin",fingerprint(peer));} catch(Exception e) {throw new CertificateException("TRUST_STORAGE_FAILED");}
            }
        });
    }
    private static String fingerprint(X509Certificate certificate) throws Exception { return Protocol.hash(Base64.encodeToString(certificate.getPublicKey().getEncoded(),Base64.NO_WRAP)); }
    String publicFingerprint() throws Exception { return fingerprint(cert); }
    protected PrivateKey getPrivateKey() {return key;}
    protected java.security.cert.Certificate getCertificate() {return cert;}
    protected String getDeviceName() {return "PhoneBrowserBridge";}
    void pairLocal(int port,String code) throws Exception { if(port<1||port>65535||!code.matches("[0-9]{6}")) throw new Exception("INVALID_PAIRING_INPUT"); pair("127.0.0.1",port,code); }
}
