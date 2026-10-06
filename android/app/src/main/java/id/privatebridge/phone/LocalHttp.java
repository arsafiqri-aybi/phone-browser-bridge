package id.privatebridge.phone;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Bounded HTTP/1.1 parser shared with pure-Java tests. One request per socket. */
public final class LocalHttp {
    public static final int MAX_BODY = 65536;
    public static final class Request {
        public String method, path;
        public final Map<String, String> headers = new HashMap<>();
        public byte[] body;
    }
    private static String line(InputStream in) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(); int previous = -1;
        for (int count = 0; count < 4096; count++) {
            int value = in.read(); if (value == -1) throw new IOException("Unexpected EOF");
            if (previous == '\r' && value == '\n') {
                byte[] buffer = bytes.toByteArray(); return new String(buffer, 0, buffer.length - 1, StandardCharsets.US_ASCII);
            }
            if (value == '\n') throw new IOException("CRLF required");
            bytes.write(value); previous = value;
        }
        throw new IOException("Header line too long");
    }
    public static Request parse(InputStream in) throws IOException {
        Request request = new Request(); String[] first = line(in).split(" ");
        if (first.length != 3 || !"HTTP/1.1".equals(first[2])) throw new IOException("Invalid request line");
        request.method = first[0]; request.path = first[1]; int total = 0;
        for (int count = 0; count < 40; count++) {
            String value = line(in); total += value.length(); if (total > 16384) throw new IOException("Headers too large");
            if (value.isEmpty()) {
                if (request.headers.containsKey("transfer-encoding")) throw new IOException("Chunked bodies unsupported");
                int length;
                try { length = Integer.parseInt(request.headers.getOrDefault("content-length", "0")); }
                catch (NumberFormatException error) { throw new IOException("Invalid length"); }
                if (length < 0 || length > MAX_BODY) throw new IOException("Body too large");
                request.body = new byte[length]; int offset = 0;
                while (offset < length) { int read = in.read(request.body, offset, length - offset); if (read == -1) throw new IOException("Truncated body"); offset += read; }
                return request;
            }
            int colon = value.indexOf(':'); if (colon <= 0 || value.charAt(0) == ' ' || value.charAt(0) == '\t') throw new IOException("Invalid header");
            String key = value.substring(0, colon).toLowerCase(Locale.ROOT);
            if (!key.matches("[a-z0-9-]+") || request.headers.containsKey(key)) throw new IOException("Duplicate/invalid header");
            request.headers.put(key, value.substring(colon + 1).trim());
        }
        throw new IOException("Too many headers");
    }
    public static void respond(OutputStream out, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        String header = "HTTP/1.1 " + status + " Result\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: " + bytes.length +
            "\r\nCache-Control: no-store\r\nX-Content-Type-Options: nosniff\r\nConnection: close\r\n\r\n";
        out.write(header.getBytes(StandardCharsets.US_ASCII)); out.write(bytes); out.flush();
    }
}
