# Perbaikan: hasil Export Static blank saat di-hosting

## Penyebab yang sudah dipastikan

Saya ekstrak paket `remindly-static.zip` yang ada sekarang dan menjalankannya di web server lokal:

- Diletakkan di **root domain** → aplikasi tampil normal (halaman login muncul).
- Diletakkan di **subfolder** (mis. `public_html/app/`) → **halaman putih total**, konsol menunjukkan 404 untuk berkas aset.

Sebabnya: `index.html` hasil build menunjuk aset dengan jalur absolut `/assets/index-*.js` dan `/assets/styles-*.css`. Di subfolder, jalur itu mengarah ke `domain.com/assets/...` yang tidak ada, sehingga JavaScript tidak pernah termuat dan `<div id="root">` tetap kosong. Hal yang sama terjadi bila file dibuka lewat `file://`. Selain itu router browser masih menganggap basis URL adalah `/`, jadi walau aset diperbaiki, navigasi di subfolder tetap salah, dan aturan `.htaccess` bawaan belum menyertakan `RewriteBase` untuk subfolder.

## Yang akan diperbaiki

1. **Aset memakai jalur relatif**
   Build statis diset agar menghasilkan `./assets/...` (dan ikon/favicon relatif), sehingga paket berjalan di root domain, di subfolder, maupun di subdomain tanpa perubahan manual.

2. **Router mengikuti lokasi pemasangan**
   Entry statis mendeteksi folder tempat aplikasi dipasang (dari lokasi skrip/`<base href>`) lalu memberi `basepath` ke router. Deep link seperti `/app/smtp` dan tombol navigasi bekerja benar di subfolder.

3. **Konfigurasi Apache yang tahan subfolder**
   `.htaccess` diperbarui: penambahan `RewriteBase` otomatis lewat `<base href>`-friendly rule, pengecualian file/direktori nyata, fallback `ErrorDocument 404 index.html`, plus tipe MIME eksplisit untuk `.js`/`.mjs`/`.css`/`.woff2` bagi hosting yang salah menyajikannya. Konfigurasi Netlify/Vercel/Nginx tetap disertakan.

4. **Pesan diagnosa, bukan layar putih**
   `index.html` diberi penanda: bila bundel gagal termuat dalam beberapa detik, muncul kotak pesan berbahasa Indonesia yang menjelaskan kemungkinan penyebab (aset 404, mod_rewrite mati, dibuka lewat `file://`) beserta langkah perbaikan — jadi tidak lagi "tidak muncul apa-apa".

5. **Validasi export diperketat**
   Skrip `export:static` menambah pemeriksaan: `index.html` tidak boleh memuat aset berjalur absolut, semua berkas aset yang dirujuk harus benar-benar ada di dalam paket, dan `.htaccess`/`_redirects`/`vercel.json` lengkap. Hasilnya tetap tampil sebagai daftar centang di halaman `/export`.

6. **Panduan deploy diperbarui**
   `README-DEPLOY.md` dan halaman `/export` menambahkan bagian khusus: cara pasang di root vs subfolder, cara memastikan `mod_rewrite`/`AllowOverride All` aktif di Apache/cPanel, keharusan HTTPS, dan cara cek cepat lewat konsol browser.

7. **Uji ulang sebelum selesai**
   Paket hasil build baru diuji otomatis di dua skenario (root dan subfolder) memakai server statis lokal + browser headless, dan harus menampilkan halaman login pada keduanya.

## Catatan teknis

- Perubahan berada di `spa/vite.config.ts` (`base: "./"`), `spa/index.html`, `spa/main.tsx` (deteksi basepath + fallback pesan), `src/router.tsx` (opsi `basepath`), `scripts/export-static.mjs` (penulisan `.htaccess` dan pemeriksaan baru), `scripts/deploy-guide.md`, dan teks di `src/routes/export.tsx`.
- Backend, database, dan pengiriman SMTP tidak berubah; paket statis tetap memanggil backend Lovable Cloud lewat HTTPS.
- ZIP `public/exports/remindly-static.zip` akan dibangun ulang agar unduhan di halaman `/export` sudah berisi perbaikan ini.
