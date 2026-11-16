# SIPENIL
Sistem Informasi Pengelolaan dan Kalkulasi Nilai Mahasiswa, Prodi Sistem Informasi.


## Teknologi
HTML + CSS + JavaScript murni (tanpa framework, tanpa build). Data disimpan di `localStorage` browser (kunci `sipenil.v2`, berisi `v: 3`). Belum ada backend; backend dan database direncanakan di Tahap 2.


## Cara masuk web nya?
https://bovisebastianp-tech.github.io/web-SIPENIL/


## Akun awal
| Peran | Username | Password awal |
|---|---|---|
| Admin | `admin` | `admin123` |
| Dosen | nama depan huruf kecil (misal. `warno`, `mamun`) | `test123` |
| Mahasiswa | NIM | `test123` |

Password awal **tidak disimpan** di data. Setelah pengguna memilih "Ganti password", yang tersimpan hanya hash PBKDF2-SHA256 + salt. Admin dapat mengembalikan akun ke password awal lewat tombol "Reset password".


## Struktur berkas
| Berkas | Isi |
|---|---|
| `core.js` | Konfigurasi, util, kalkulasi nilai/simulasi, semester, parser & rencana impor CSV, hashing password |
| `data.js` | Data awal, skema & migrasi data, penyimpanan, KHS/IPS/IPK |
| `components.js` | Modal, dialog konfirmasi, login, kerangka halaman |
| `admin.js` / `dosen.js` / `mahasiswa.js` / `khs.js` | Tampilan tiap peran dan KHS |
| `app.js` | Aksi, validasi form, hak akses, login, penghubung event |


## Aturan akademik (dapat dikonfigurasi di `DB.config`)
- Nilai akhir = Σ(bobot × nilai) / 100, **dibulatkan 2 desimal (half-up) lebih dulu**, baru dikonversi ke huruf.
- Skala bawaan: A ≥ 85 (4), B ≥ 70 (3), C ≥ 55 (2), D ≥ 40 (1), E < 40 (0).
- IPS/IPK = Σ(SKS × mutu) / Σ SKS atas mata kuliah yang sudah dipublikasi (termasuk E), dibulatkan 2 desimal.
- SKS lulus = SKS dengan bobot mutu ≥ `passMinPoint` (bawaan 1, yaitu D). **Perlu dikonfirmasi** (lihat laporan).
