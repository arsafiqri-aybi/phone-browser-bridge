# Keamanan, izin, dan klaim

Threat model mencakup client MCP tanpa scope, device palsu, enrollment replay, token bocor, Wi-Fi tidak dipercaya, command duplicate setelah disconnect, stale connection, prompt injection halaman, path/URL input berbahaya, overlay menutupi UI sensitif, dependency supply chain, dan log berisi rahasia.

Wajib: semua endpoint kontrol autentikasi; kredensial per instalasi/device; authz setiap tool; TLS; key private terlindungi; consent jelas; revoke/forget; payload/schema/size validation; action journal; bounded resources; redaksi; dependency audit dengan hasil dan keterbatasan.

MCP tidak menyediakan remote shell generik, arbitrary file read, export cookies, password dump, install package, atau kontrol sistem tanpa kebutuhan spesifik. ADB internal hanya operasi yang dipilih, input tervalidasi, tidak string concatenation ke shell dengan data website/user. Jika runtime evaluate diperlukan, batasi pada Chrome target yang diotorisasi, dokumentasikan daya aksesnya, serta hindari API yang secara tidak langsung memberi akses sistem.

Izin ADB Android dapat memberi kemampuan lebih besar daripada browser. Allowlist dalam APK membatasi software ini, bukan mempersempit grant ADB sistem. Jelaskan bahwa owner harus mencabut key/debugging jika perangkat/kunci tak lagi dipercaya. Jangan menyebut izin browser-only bila bukan demikian.

Overlay, Accessibility, battery exemption, notifikasi, dan Wireless Debugging masing-masing punya alasan dan consent tersendiri. Tidak ada bypass approval Android. Aksi yang mengirim, membeli, mempublikasikan, menghapus, atau mengubah akun memerlukan izin yang sesuai konteks pengguna; receipt bukan pengganti izin.

Kunci signing release disimpan pemilik/CI secret dan tidak masuk ZIP. Update memiliki signature stabil, verifikasi integritas, dan tidak mengganti trust secara diam-diam. Jangan menyimpan private key ADB di backup yang dapat dipulihkan ke perangkat lain tanpa kontrol.

Sebut status keamanan berdasarkan bukti: threat model reviewed, checks run, findings open/resolved, dependency scan date, signer identity fingerprint publik, checksum APK. Bila belum diperiksa, `NOT_RUN`. Build sukses bukan sertifikasi. Penilaian Play Protect/Play Store atau kebijakan Accessibility terbaru harus diverifikasi lewat sumber/proses resmi jika akan diklaim; jangan janjikan pasti lolos.

Tutorial harus menjelaskan cakupan izin, cara Pause/Stop/revoke, kondisi perlu setup ulang, serta cara menghapus instalasi dan resource dengan aman. Jangan mengumpulkan konten browsing untuk analitik default.
