# Phone Browser Bridge — Stress Test & Disconnect Report

**Tanggal:** 7 Oktober 2026  
**Zona waktu:** WIB (UTC+7)  
**Tujuan:** Menguji kestabilan Phone Browser Bridge dengan aktivitas browsing berulang dan mencatat pola timeout, disconnect, serta status komponen saat kegagalan terjadi.

---

## 1. Ringkasan Eksekutif

Stress test berhasil menangkap dua jenis gangguan yang berbeda:

1. **DevTools screenshot timeout**
   - Terjadi berulang saat fungsi screenshot dipanggil.
   - Tetap terjadi bahkan pada halaman sangat ringan seperti `example.com`.
   - Pada fase ini, koneksi utama masih sehat dan aktivitas lain seperti membaca halaman, berpindah tab, scrolling, reload, dan JavaScript evaluation masih berjalan.

2. **Disconnect penuh pada lapisan APK/native/Chrome**
   - Diawali dengan error `fetch failed`.
   - Setelah itu status menunjukkan:
     - `active: false`
     - `native_connected: false`
     - `chrome_connected: false`
   - Sementara:
     - `device_connected: true`
     - `device_responding: true`
     - `relay: cloudflare`
   - Ini menunjukkan bahwa HP dan relay Cloudflare masih terjangkau, tetapi koneksi APK/native ke Chrome/DevTools terputus.

Durasi browsing stabil sebelum disconnect penuh sekitar **4 menit 40 detik**.

Total periode observasi sampai pemeriksaan terakhir sekitar **5 menit 26 detik**.

---

## 2. Kondisi Awal

Pada awal test, status sistem:

- `active: true`
- `bridge_running: true`
- `wake_lock_held: true`
- `agent_connected: true`
- `native_connected: true`
- `chrome_connected: true`
- `ready: true`
- `device_connected: true`
- `device_responding: true`
- `relay: cloudflare`
- `battery_optimization_exempt: true`
- Mode: `devtools`

Artinya seluruh jalur utama dalam kondisi aktif saat test dimulai.

---

## 3. Aktivitas Stress Test

Aktivitas yang dilakukan selama test mencakup:

- Membuka beberapa tab baru.
- Google Search.
- Membuka Hacker News.
- Membuka MDN Web Docs.
- Membuka GitHub Trending.
- Membuka Wikipedia.
- Membuka Cloudflare.
- Membuka Mozilla.
- Membuka Python.org.
- Tab switching cepat.
- Reload halaman.
- Scroll atas/bawah.
- Membaca DOM/page content.
- Menjalankan JavaScript evaluation melalui DevTools.
- Navigasi `back`.
- Membuka URL langsung.
- Mencoba screenshot beberapa kali.
- Menambah dan menutup tab.

Test dilakukan secara aktif untuk memberikan beban pada koneksi Chrome DevTools dan bridge.

---

## 4. Timeline Kejadian

| Waktu WIB | Kejadian |
|---|---|
| **08:20:14** | Stress test dimulai. APK, native, Chrome, agent, device, dan relay Cloudflare sehat. |
| **08:20:54** | Muncul `DevTools timeout` pertama. Setelah dicek, status koneksi utama masih sehat. |
| **±08:21:42** | Screenshot kembali mengalami `DevTools timeout`. Navigasi dan read tetap normal. |
| **08:22–08:23** | Browsing, switching tab, reload, scroll, dan JavaScript evaluation berjalan normal. |
| **08:23:21** | Screenshot pada `example.com` tetap timeout. Halaman hanya sekitar 2 KB HTML, sehingga kecil kemungkinan masalah disebabkan beratnya halaman. |
| **08:23–08:24** | Navigasi lintas domain tetap stabil. |
| **08:24:12** | Status bridge masih sehat setelah sejumlah tab switch dan reload. |
| **±08:24:54** | Muncul error baru: `fetch failed`. |
| **Sesudah 08:24:54** | Pemeriksaan status juga sempat menghasilkan `fetch failed`. |
| **±08:25:07** | Status berhasil terbaca dan menunjukkan APK/native/Chrome disconnected. |
| **08:25:16** | Masih disconnected. |
| **08:25:23** | Masih disconnected. |
| **08:25:27** | Masih disconnected. |
| **08:25:40** | Masih disconnected. Device dan relay Cloudflare tetap reachable. |

---

## 5. Status Saat Disconnect Penuh

Status yang terbaca setelah kegagalan:

```text
active: false
native_connected: false
chrome_connected: false
mode: devtools

device_connected: true
device_responding: true
relay: cloudflare
```

Pesan error:

```text
APK belum tersambung. Mulai penghubung dan periksa token APK.
```

Interpretasi awal:

- HP tidak sepenuhnya hilang dari sistem.
- Relay Cloudflare masih tersedia.
- Device masih memberikan respons.
- Koneksi yang hilang berada pada jalur APK/native/Chrome.
- Kemungkinan besar kegagalan terjadi di sisi:
  - APK bridge,
  - native process,
  - Chrome DevTools Protocol connection,
  - WebSocket internal,
  - atau reconnect handling antara APK dan relay.

---

## 6. Temuan Screenshot

Screenshot menghasilkan:

```text
DevTools timeout; periksa hasil sebelum mengulang.
```

Hal ini terjadi berulang.

Tes isolasi dilakukan pada:

```text
https://example.com/
```

Dengan kondisi:

- halaman sangat kecil,
- `document.readyState = complete`,
- DOM ringan,
- koneksi utama sehat.

Namun screenshot tetap timeout.

### Indikasi

Masalah screenshot kemungkinan berada pada pipeline:

```text
ChatGPT / MCP
      ↓
Cloudflare relay
      ↓
APK/native bridge
      ↓
Chrome DevTools Protocol
      ↓
Page.captureScreenshot
```

Kemungkinan penyebab:

- `Page.captureScreenshot` tidak mengembalikan hasil tepat waktu.
- Payload screenshot terlalu besar untuk pipeline tertentu.
- Timeout MCP terlalu pendek.
- Encoding/base64 screenshot lambat.
- CDP request ID tidak diselesaikan.
- WebSocket message terlalu besar atau terfragmentasi.
- Chrome target/tab state bermasalah.
- Bridge menunggu respons yang sebenarnya sudah gagal.
- Screenshot call menyebabkan queue DevTools tersumbat.

Belum ada bukti cukup untuk menyatakan bahwa screenshot adalah penyebab disconnect penuh.

---

## 7. Pola Kegagalan yang Terdeteksi

Urutan yang terlihat:

```text
NORMAL
  ↓
Screenshot DevTools timeout
  ↓
Koneksi masih normal
  ↓
Browsing dan DevTools command tetap bekerja
  ↓
Screenshot timeout kembali
  ↓
Browsing tetap bekerja
  ↓
fetch failed
  ↓
Status request ikut gagal
  ↓
native_connected = false
chrome_connected = false
active = false
```

Ini menunjukkan bahwa terdapat kemungkinan **degradasi bertahap**, bukan crash instan.

---

## 8. Hipotesis Awal

### Hipotesis A — CDP/WebSocket connection instability

Kemungkinan koneksi antara native bridge dan Chrome DevTools terputus.

Perlu log:

- WebSocket open.
- WebSocket close.
- Close code.
- Close reason.
- Ping/pong.
- Last message timestamp.
- CDP request ID terakhir.
- CDP response ID terakhir.

---

### Hipotesis B — Queue atau pending CDP request menumpuk

Screenshot mungkin menciptakan request yang tidak selesai.

Jika implementation menggunakan satu queue global, sebuah request yang stuck dapat menyebabkan request berikutnya ikut terganggu.

Perlu monitor:

```text
pending_requests_count
oldest_pending_request_age
last_completed_request
request_method
request_id
```

---

### Hipotesis C — APK/native process restart

Walaupun device masih reachable, proses native atau service APK mungkin mati/restart.

Perlu log:

```text
process_start_time
process_id
service_onCreate
service_onDestroy
service_restart
uncaught_exception
OOM
ANR
```

---

### Hipotesis D — Relay connection tetap hidup tetapi downstream hilang

Cloudflare relay mungkin masih dapat menjawab status device tetapi socket downstream ke APK hilang.

Perlu pisahkan status:

```text
relay_connected
apk_websocket_connected
native_process_connected
cdp_socket_connected
chrome_target_attached
```

Jangan hanya menggunakan satu boolean `connected`.

---

## 9. Logging yang Disarankan

Untuk test berikutnya, setiap event sebaiknya memiliki timestamp presisi.

Contoh:

```text
2026-10-07T08:24:53.812+07:00
COMPONENT=cdp
EVENT=request_sent
METHOD=Runtime.evaluate
REQUEST_ID=184

2026-10-07T08:24:54.102+07:00
COMPONENT=relay
EVENT=fetch_failed

2026-10-07T08:24:54.118+07:00
COMPONENT=apk_socket
EVENT=websocket_close
CODE=1006
REASON=abnormal_closure

2026-10-07T08:24:54.121+07:00
COMPONENT=chrome
EVENT=cdp_disconnected
```

Dengan log seperti ini kita bisa mengetahui komponen pertama yang gagal.

---

## 10. Field Telemetry Minimum

Disarankan mencatat:

```text
timestamp
session_id
connection_id
apk_process_id
native_process_id
chrome_tab_id
chrome_target_id

relay_connected
apk_connected
native_connected
chrome_connected
cdp_connected

last_ping
last_pong
last_cdp_command
last_cdp_response

pending_cdp_requests
memory_usage
battery_state
network_type

disconnect_code
disconnect_reason
reconnect_attempt
reconnect_result
```

---

## 11. Rekomendasi Test Berikutnya

### Test A — Browsing tanpa screenshot

Jalankan stress test 10–15 menit:

- tab switching,
- scroll,
- reload,
- navigation,
- JavaScript evaluation.

Tidak menggunakan screenshot.

Tujuan:

Menentukan apakah disconnect tetap terjadi tanpa screenshot.

---

### Test B — Screenshot only

Gunakan satu halaman:

```text
https://example.com/
```

Lakukan screenshot berulang dengan interval tertentu.

Tujuan:

Mengetahui apakah screenshot sendiri dapat menyebabkan koneksi rusak.

---

### Test C — Heartbeat monitoring

Saat stress test berlangsung, log setiap 1–5 detik:

```text
relay
APK
native
Chrome
CDP
```

Tujuan:

Menentukan lapisan pertama yang kehilangan koneksi.

---

### Test D — WebSocket lifecycle

Catat seluruh lifecycle:

```text
CONNECTING
OPEN
PING
PONG
MESSAGE
ERROR
CLOSING
CLOSED
RECONNECTING
RECONNECTED
```

---

## 12. Kesimpulan Sementara

Stress test berhasil mereproduksi masalah.

Ada dua gangguan yang perlu dipisahkan:

### Masalah 1

**Screenshot DevTools timeout**

Terjadi konsisten, termasuk pada halaman sangat ringan.

### Masalah 2

**APK/native/Chrome disconnect**

Terjadi setelah sekitar:

```text
4 menit 40 detik
```

aktivitas browsing aktif.

Pada saat disconnect:

```text
device_connected = true
device_responding = true
relay = cloudflare
```

tetapi:

```text
native_connected = false
chrome_connected = false
active = false
```

Sehingga fokus debugging selanjutnya sebaiknya berada pada:

```text
APK
  ↕
native bridge
  ↕
Chrome DevTools / CDP
```

dan lifecycle WebSocket yang menghubungkan komponen tersebut.

Belum ada cukup bukti untuk menyatakan Cloudflare relay sebagai sumber utama masalah.

---

## Status Investigasi

**Reproduced:** YES  
**Disconnect captured:** YES  
**Timestamp captured:** YES  
**Screenshot bug reproduced:** YES  
**Root cause confirmed:** NO  
**Next step:** Instrumentasi telemetry + WebSocket/CDP lifecycle logging.
