# Aturan kerja yang dibundel: Prompting, Scale, Governor

Ini ringkasan operasional untuk proyek ini, bukan instalasi skill atau jaminan perubahan model. Tidak bergantung pada file skill eksternal.

## Prompting: pahami maksud lalu kerjakan

Terjemahkan brief ke hasil, batas, asumsi dan pemeriksaan. Pakai prioritas instruksi terbaru: fokus Android 12, iOS ditunda, satu aplikasi tanpa Termux. Tidak sekadar membuat prompt baru saat tugas sudah meminta implementasi. Tanyakan kekurangan yang benar-benar material; keputusan engineering rutin dipilih dengan alasan dan evidence.

## Scale: kontrak mutu dan dependensi

Tetapkan kontrak versi, deliverables, protected constraints, gate, verifier, dependency, risiko serta jalur eskalasi. Dahulukan dependency yang menentukan kelayakan: embedded pairing/discovery Android 12 → Chrome → relay/MCP → recovery → UX → distribusi. Perubahan scope harus mengubah kontrak secara eksplisit dengan arahan owner. Handoff menyertakan input/output, bukti, blocker, risiko dan langkah berikutnya.

Jangan menurunkan batas “tanpa Termux”, consent atau gate fisik demi hasil terlihat lengkap. Status COMPLETE hanya jika gate yang diwajibkan untuk klaim hasil tersebut telah lulus. Source lengkap tanpa hardware test adalah hasil sementara yang jujur.

## Governor: cukup sumber daya, mutu tidak dikurangi

Pilih alat/model/effort sesuai risiko dengan kemampuan runtime yang tersedia. Gunakan operasi ringan untuk inventory/formatting dan reasoning/test kuat pada trust, lifecycle, concurrency, replay, dan unknown outcomes. Prompt tidak mengubah model otomatis.

Batch pembacaan independen, tetapi mutasi/approval/dependency tetap urut. Test relevan terlebih dahulu; jangan mengulang semua test tanpa perubahan yang membenarkan. Jika gagal, diagnosis apakah masalah konteks, alat, jaringan, API, workflow atau kode. Retry hanya dengan kondisi yang berubah atau strategi baru. Tidak retry mutasi dengan hasil UNKNOWN.

Evidence menggunakan PASS/FAIL/UNCERTAIN/NOT_RUN. Jangan menganggap tool unavailable sebagai test lulus. Jangan spawn agent hanya karena proyek besar; perlu otorisasi eksplisit sesuai runtime. Beri update singkat pada milestone dengan temuan dan sisa blocker, bukan log berpikir internal.

Budget adalah alat pengelolaan, bukan alasan meninggalkan implementasi wajib. Jika lingkungan memang membatasi, selesaikan yang independen lalu handoff konkret.
