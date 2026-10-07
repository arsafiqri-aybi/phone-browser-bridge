# Format bukti

Setiap hasil gate menyebut ID, status, kontrak version, commit/build digest, test command/prosedur, lingkungan, waktu UTC, durasi, expected vs observed, artifact bukti, serta limit. Gunakan template JSON yang disediakan; jangan membiarkan nilai NOT_RUN default dianggap PASS.

Telemetry minimum yang disamarkan: UTC timestamp, monotonic duration, component/event/reason, device alias, connectionGeneration, process/service start age, network category, relay/ADB/CDP/target state, lastSuccess age, pending count/oldest age, queue depth, bytes/latency per stage, close code/reason yang teredaksi, reconnect attempt/result, owner intent, wake lock state/duration, memory metrics bila API tersedia.

Field “native process” hanya jika memang ada proses terpisah. Jangan menciptakan processId palsu di arsitektur yang semua native componentnya in-process. Health menunjukkan checkedAt dan freshness, bukan satu connected boolean untuk semua sistem.

Evidence metadata boleh disimpan default dengan retensi terbatas. URL lengkap/isi halaman/screenshots/login state hanya bila user menyetujui diagnostic tersebut; gunakan halaman test non-sensitif untuk paket evidence. Kunci/token tidak pernah diperlukan sebagai bukti.

Korelasi UTC tidak cukup untuk dedup; journal ID dan generation yang konsisten tetap wajib. Hindari mencetak pesan mentah exception yang berisi endpoint/token.
