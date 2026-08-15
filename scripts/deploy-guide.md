# Panduan Deploy Versi Statis — Reminder Mail

Paket ini berisi aplikasi Reminder Mail versi statis (HTML/CSS/JS). Database,
login, dan penyimpanan lampiran tetap memakai backend Lovable Cloud yang sama,
jadi data Anda tidak berpindah.

## 1. Unggah file

1. Ekstrak file ZIP ini.
2. Unggah **seluruh isi** foldernya (bukan foldernya) ke root web hosting Anda,
   misalnya `public_html/` di cPanel.
3. Pastikan `index.html` berada tepat di root domain.

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
