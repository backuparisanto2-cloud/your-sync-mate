# Panduan Deploy Versi Statis — Reminder Mail

Paket ini berisi aplikasi Reminder Mail versi statis (HTML/CSS/JS). Database,
login, dan penyimpanan lampiran tetap memakai backend Lovable Cloud yang sama,
jadi data Anda tidak berpindah.

## 1. Unggah file

1. Ekstrak file ZIP ini.
2. Unggah **seluruh isi** foldernya (bukan foldernya) ke web hosting Anda,
   misalnya `public_html/` di cPanel.
3. Pastikan `index.html` dan folder `assets/` berada di folder yang sama.
   Folder `assets/` **wajib** ikut terunggah lengkap.

Paket ini memakai jalur aset relatif, jadi boleh dipasang di:

- root domain — `public_html/` → `https://domain.com/`
- subfolder — `public_html/app/` → `https://domain.com/app/`
- subdomain — `https://app.domain.com/`

Tidak perlu build ulang untuk masing-masing kasus.

## 2. Atur rewrite ke index.html

Aplikasi ini memakai routing di sisi browser, sehingga server harus melayani
`index.html` untuk semua URL. File konfigurasi sudah disertakan:

| Hosting | File | Keterangan |
| --- | --- | --- |
| Apache / cPanel | `.htaccess` | otomatis aktif, tidak perlu diubah |
| Netlify / Cloudflare Pages | `_redirects` | otomatis terbaca |
| Vercel (static) | `vercel.json` | otomatis terbaca |
| Nginx | `nginx.conf.example` | salin blok `try_files` ke konfigurasi server |

Tanpa ini, halaman seperti `/smtp` akan 404 saat di-refresh.

Di Apache, `.htaccess` hanya dibaca bila host mengaktifkan `AllowOverride All`
dan modul `mod_rewrite`. Jika hosting Anda tidak mengaktifkannya, minta support
hosting untuk menyalakannya.

## Halaman tampil kosong (putih)?

Paket ini menampilkan pesan diagnosa otomatis setelah beberapa detik jika bundel
gagal dimuat. Penyebab paling umum:

1. **Folder `assets/` tidak ikut terunggah** atau unggahan terpotong — unggah
   ulang seluruh isi paket.
2. **File dibuka lewat `file://`** — harus diakses via http/https.
3. **`.htaccess` diabaikan** (mod_rewrite / AllowOverride mati). Deep link
   seperti `/app/smtp` lalu gagal memuat aset; buka dulu `/app/` untuk
   memastikan, lalu aktifkan mod_rewrite.
4. **Tipe MIME salah** untuk `.js` — `.htaccess` sudah menyetel `AddType`,
   pastikan file tersebut terunggah (file diawali titik sering tersembunyi di
   File Manager; aktifkan "show hidden files").
5. **Cache lama** — muat ulang dengan Ctrl/Cmd + Shift + R.

Buka Console di Developer Tools browser untuk melihat berkas mana yang 404.

## 3. Gunakan HTTPS

Login dan akses database memerlukan HTTPS. Aktifkan SSL (misalnya Let's Encrypt
di cPanel) sebelum dipakai.

## 4. Login dan SMTP

1. Buka domain Anda, lalu masuk dengan akun yang sudah terdaftar di backend.
   Akun baru dibuat dari dasbor backend (Users), bukan dari halaman login.
2. Buka halaman **SMTP**, isi host, port, TLS, dan kredensial, lalu gunakan
   tombol **Uji koneksi** dan **Kirim email uji** untuk memverifikasi.

## 5. Yang tetap berjalan di backend

- **Pengiriman email SMTP** butuh koneksi soket, jadi tetap diproses backend
  Lovable Cloud. Bundel statis memanggilnya lewat HTTPS.
- **Pengiriman otomatis terjadwal** dijalankan oleh cron di backend setiap
  beberapa menit. Jika proyek Lovable dihentikan, penjadwalan otomatis ikut
  berhenti walaupun tampilan statis tetap bisa dibuka.
- Jika Anda memindahkan backend ke URL lain, build ulang dengan variabel
  `VITE_BACKEND_URL` yang menunjuk ke URL backend baru.

## 6. Catatan keamanan

- Kunci publik (publishable key) memang boleh berada di sisi browser; akses data
  dibatasi oleh Row Level Security dan sesi login.
- Password SMTP tidak pernah dikirim ke browser — hanya backend yang membacanya.
- Ganti password SMTP secara berkala, terutama bila kredensial pernah tersimpan
  di repositori publik.
