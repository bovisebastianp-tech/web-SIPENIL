# Laporan Tahap 1: Audit dan Perbaikan SIPENIL

## 1. Kondisi proyek
- **Teknologi:** HTML/CSS/JS murni, 11 berkas, ±585 baris. Tanpa framework, tanpa backend, tanpa dependensi. Penyimpanan `localStorage`; sesi di `sessionStorage`. Font Plus Jakarta Sans dari Google Fonts. Identitas visual: hijau teal, kartu putih, pil huruf mutu.
- **Fitur lama yang berjalan:** login 3 peran, CRUD mahasiswa/dosen/mata kuliah, plotting, input nilai (simpan otomatis), bobot, impor CSV, rekap, publikasi + kunci + buka kunci, riwayat perubahan, simulasi target UAS, IPS/IPK/SKS, KHS cetak (print ke PDF).
- **Belum ada:** semua fitur baru di Tahap 3-5, backend, database, autentikasi server, audit log aktivitas admin, backup.

## 2. Temuan dan tindakan
Bug dibuktikan dulu pada kode asli (skrip `baseline.js`), lalu diperbaiki dan diuji ulang.

| # | Temuan | Dampak | Status |
|---|---|---|---|
| 1 | Huruf mutu dihitung dari nilai belum dibulatkan, yang tampil sudah dibulatkan (84,996 tampil 85 tetapi huruf **B**) | Nilai dan huruf tidak konsisten | Diperbaiki |
| 2 | Semester diurutkan sebagai teks: "Genap 2025/2026" muncul **setelah** "Ganjil 2026/2027" | KHS dan urutan IPS salah | Diperbaiki (format baku + urutan kronologis) |
| 3 | Parser CSV memecah teks per koma: kutip, "85,5", sel multibaris rusak; baris galat dilewati diam-diam; tidak ada log per nilai | Data nilai salah masuk tanpa tanda | Diganti parser RFC 4180, deteksi pemisah, header fleksibel, validasi per sel, **semua-atau-tidak-sama-sekali**, laporan galat per baris, log per mahasiswa |
| 4 | Bobot negatif lolos (mis. -10 dan 110), tidak ada batas, `wSave` tidak mengecek kunci | Bobot tidak valid | Diperbaiki (0-100, maks 2 desimal, total 100 dengan toleransi, cek kunci) |
| 5 | Publikasi diizinkan walau komponen belum lengkap (dihitung 0) | Nilai E palsu terpublikasi | Diblokir; daftar mahasiswa belum lengkap ditampilkan |
| 6 | Buka kunci membiarkan nilai tetap terlihat mahasiswa saat sedang dikoreksi; alasan hanya spasi lolos | Mahasiswa melihat nilai setengah dikoreksi | Publikasi ditarik saat buka kunci; alasan minimal 5 karakter |
| 7 | "SKS lulus" menghitung semua SKS termasuk nilai E | Total SKS menyesatkan | Dipisah: SKS ditempuh dan SKS lulus (bergantung `passMinPoint`) |
| 8 | Kode MK duplikat lolos; SKS desimal (2,5) dan semester teks bebas lolos; field berisi spasi lolos | Data tidak konsisten | Validasi lengkap; kode unik per semester |
| 9 | Hapus dosen menghapus mata kuliahnya **beserta nilai terpublikasi** dan meninggalkan 31 pendaftaran yatim | Kehilangan data | Diblokir bila dosen masih mengampu; hapus MK membersihkan relasi dan log; peringatan eksplisit |
| 10 | Plotting: mengeluarkan mahasiswa menghapus nilainya tanpa konfirmasi; menambah peserta ke MK terpublikasi memberi nilai E otomatis; error bila tak ada MK | Kehilangan/korupsi data | Konfirmasi, penguncian untuk MK terpublikasi, empty state |
| 11 | `save()` menelan error: kuota penuh tetap menampilkan "Tersimpan"; JSON rusak **menimpa** data dengan data awal | Kehilangan data diam-diam | Kegagalan dilaporkan dan perubahan dibatalkan; data rusak dicadangkan |
| 12 | Password plaintext di `localStorage`, `admin123` dan `test123` di sumber dan README | Kerentanan | Password plaintext dihapus; hash PBKDF2-SHA256; fitur ganti password; banner password awal |
| 13 | Tidak ada pemeriksaan peran/kepemilikan pada aksi | Dosen/mahasiswa dapat memanggil aksi lain lewat konsol | Pemeriksaan peran dan kepemilikan MK di setiap aksi (lapis kedua) |
| 14 | Riwayat dibatasi 300 entri total (satu MK sibuk menghapus riwayat MK lain); ID acak `Math.random` | Jejak hilang | Batas 3000; ID dari `crypto` |
| 15 | Simulasi UAS tidak memperhitungkan pembulatan nilai akhir | Hasil simulasi bisa meleset 0,01 | Diverifikasi memakai `calc()` (1200 kasus acak uji) |

XSS: seluruh keluaran sudah di-escape; diuji dengan nama `<img onerror>`. SQL injection tidak relevan (belum ada SQL).

## 3. Keterbatasan yang SENGAJA belum diselesaikan di Tahap 1
Semua ini hanya bisa diselesaikan dengan backend (Tahap 2):
1. **Autentikasi dan otorisasi masih di browser.** Siapa pun yang membuka DevTools dapat mengubah `localStorage`/`sessionStorage`, mengganti hash, atau berpindah akun. Pemeriksaan peran di Tahap 1 hanya lapis kedua, bukan pengaman.
2. Password awal (`admin123`, `test123`) masih ada di kode sumber karena tidak ada server yang bisa menyimpannya terpisah. Banner mengingatkan, belum memaksa ganti.
3. Tidak ada pembatasan percobaan login, lupa password, audit log aktivitas admin, maupun backup/restore.
4. Data hanya ada di satu browser; tiga peran tidak berbagi data antar-perangkat.
5. Hashing memakai Web Crypto; akses lewat `http://` non-localhost tidak bisa login (ada pesan jelas).

## 4. Asumsi yang perlu dikonfirmasi
- **SKS lulus:** nilai minimal D (mutu 1) dianggap lulus.
- **Skala nilai:** dipertahankan persis dari kode lama (A≥85, B≥70, C≥55, D≥40).
- **Komponen kosong:** tetap dihitung 0 pada tampilan sementara, tetapi publikasi mewajibkan semua komponen berbobot terisi.
- **Kode MK unik per semester** (kode sama di semester berbeda diizinkan); SKS 1-6.
- **Buka kunci menarik publikasi.**
