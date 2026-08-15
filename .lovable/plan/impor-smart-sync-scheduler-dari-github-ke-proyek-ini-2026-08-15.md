# Impor "Smart Sync Scheduler" dari GitHub ke proyek ini

Repo `backuparisanto2-cloud/clever-sync-tasks` bersifat publik dan sudah berupa proyek Lovable dengan stack yang sama (TanStack Start + Tailwind v4 + shadcn + Cloud/Supabase). Jadi isinya bisa disalin langsung ke proyek kosong ini.

## Apa yang akan diimpor

- Halaman: beranda daftar pengingat, detail pengingat, buat pengingat baru, autentikasi, log pengiriman, pengaturan SMTP, panduan environment, dan halaman ekspor statis.
- Komponen: AppShell, ReminderForm, dan set lengkap komponen UI shadcn.
- Logika: penjadwalan pengingat, format tanggal, pengiriman email lewat SMTP, endpoint publik untuk cron dispatch dan uji kirim email.
- Skrip ekspor statis beserta panduan deploy.
- Skema database (2 migrasi) berikut kebijakan akses.

## Langkah pengerjaan

1. Unduh snapshot repo dan salin seluruh `src/`, `spa/`, `scripts/`, `public/`, `supabase/`, serta konfigurasi (`components.json`, `vite.config.ts`, `tsconfig.json`) ke proyek ini. File `.env` repo tidak disalin — kredensial diisi ulang lewat Cloud/secret proyek ini.
2. Samakan dependensi di `package.json` dan pasang paket yang belum ada.
3. Aktifkan Lovable Cloud, lalu jalankan ulang kedua migrasi agar tabel, grant, dan kebijakan RLS ada di database proyek ini.
4. Tambahkan secret SMTP yang dibutuhkan (host, port, user, password, alamat pengirim) — nilai akan diminta ke Anda saat tahap ini.
5. Bersihkan sisa template: `src/routes/index.tsx` placeholder diganti halaman asli, dan regenerasi route tree.
6. Verifikasi: build berhasil, halaman utama serta rute lain terbuka tanpa error di preview.

## Catatan teknis

- Versi paket repo sedikit berbeda dari template ini; yang dipakai adalah versi dari repo agar kode tetap kompatibel, kecuali paket inti Lovable/TanStack yang sudah terpasang.
- `src/routeTree.gen.ts` tidak disalin mentah, tapi dibiarkan tergenerasi ulang dari file rute.
- Data pengingat lama di proyek sumber tidak ikut pindah — hanya struktur database. Kalau Anda mau, saya bisa tambahkan beberapa baris contoh saat migrasi.
