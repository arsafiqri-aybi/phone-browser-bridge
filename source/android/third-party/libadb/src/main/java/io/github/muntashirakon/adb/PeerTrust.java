// Bridge-specific patch. Apache-2.0. Pairing authentication is SPAKE2 with a TLS exporter.
package io.github.muntashirakon.adb;

import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import javax.net.ssl.X509TrustManager;

public final class PeerTrust {
    public interface Policy {
        void verify(X509Certificate certificate) throws CertificateException;
        void remember(X509Certificate certificate) throws CertificateException;
    }
    private static volatile Policy policy;
    public static void configure(Policy value) { policy = value; }
    static void paired(X509Certificate certificate) throws CertificateException { require().remember(certificate); }
    private static Policy require() throws CertificateException {
        if (policy == null) throw new CertificateException("PAIRING_REQUIRED");
        return policy;
    }
    static X509TrustManager manager(boolean pairing) {
        return new X509TrustManager() {
            public void checkClientTrusted(X509Certificate[] chain, String type) throws CertificateException { throw new CertificateException("CLIENT_NOT_SUPPORTED"); }
            public void checkServerTrusted(X509Certificate[] chain, String type) throws CertificateException {
                if (chain == null || chain.length == 0) throw new CertificateException("EMPTY_CERTIFICATE");
                require();
                if (!pairing) require().verify(chain[0]);
                // On the pairing-only channel, proof of the manually supplied code and TLS exporter
                // authenticates the peer before this candidate certificate can ever be remembered.
            }
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
        };
    }
}
