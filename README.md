# SIPENIL
Sistem Informasi Pengelolaan dan Kalkulasi Nilai Mahasiswa, Prodi Sistem Informasi.

Status: **Tahap 1 (audit & perbaikan) selesai.** Lihat `LAPORAN-TAHAP-1.md` untuk temuan, perubahan, dan keterbatasan.

## Teknologi
HTML + CSS + JavaScript murni (tanpa framework, tanpa build). Data disimpan di `localStorage` browser (kunci `sipenil.v2`, berisi `v: 3`). Belum ada backend; backend dan database direncanakan di Tahap 2.

## Cara menjalankan
Buka lewat server statis (disarankan, karena login memakai Web Crypto yang membutuhkan HTTPS atau localhost):

```
cd web-SIPENIL-main
python3 -m http.server 8080      # lalu buka http://localhost:8080
```
GitHub Pages (HTTPS) juga berfungsi. Membuka `index.html` langsung dari berkas (`file://`) bekerja di Chrome/Edge, tetapi akses lewat `http://alamat-IP` biasa tidak akan bisa login.

## Akun awal
| Peran | Username | Password awal |
|---|---|---|
| Admin | `admin` | `admin123` |
| Dosen | nama depan huruf kecil (mis. `warno`, `mamun`) | `test123` |
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

## Skema data (localStorage v3)
```
{ v: 3,
  config: { scale: [[huruf, nilaiMin, bobotMutu], ...], passMinPoint: 1, semAktif: "Ganjil 2026/2027" },
  users:   [{ id, role: admin|dosen|mahasiswa, username, nim?, nama, pw: null | {alg,iter,salt,hash}, mustChange }],
  courses: [{ id, kode, nama, sks, semester, dosenId, w: {kehadiran,tugas1,tugas2,uts,uas}, published, locked }],
  enr:     [{ c: courseId, m: userId, s: {kehadiran,tugas1,tugas2,uts,uas} }],
  log:     [{ t, by, c: courseId, text }] }
```
Perubahan dari v2: `password` (plaintext) dihapus dan diganti `pw`/`mustChange`; ditambah `config` dan `v`. Data v2 dimigrasikan otomatis saat halaman dibuka (nilai, publikasi, dan riwayat dipertahankan; pendaftaran yatim/duplikat dibersihkan). Data yang rusak tidak ditimpa: salinannya disimpan di kunci `sipenil.v2.rusak-<waktu>`.

## Aturan akademik (dapat dikonfigurasi di `DB.config`)
- Nilai akhir = Σ(bobot × nilai) / 100, **dibulatkan 2 desimal (half-up) lebih dulu**, baru dikonversi ke huruf.
- Skala bawaan: A ≥ 85 (4), B ≥ 70 (3), C ≥ 55 (2), D ≥ 40 (1), E < 40 (0).
- IPS/IPK = Σ(SKS × mutu) / Σ SKS atas mata kuliah yang sudah dipublikasi (termasuk E), dibulatkan 2 desimal.
- SKS lulus = SKS dengan bobot mutu ≥ `passMinPoint` (bawaan 1, yaitu D). **Perlu dikonfirmasi** (lihat laporan).

## Pengujian
Suite uji otomatis (Playwright) ada di luar proyek: `sipenil-tests/run.js` (111 pemeriksaan).
