import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Cloud,
  Globe,
  Package,
  ServerCog,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/hosting-guide")({
  head: () => ({
    meta: [
      { title: "Panduan Hosting Statis — Reminder Mail" },
      {
        name: "description",
        content:
          "Setelan Apache, Nginx, Netlify, Vercel, dan Cloudflare Pages agar paket statis Reminder Mail tidak menampilkan halaman kosong setelah deploy.",
      },
      { property: "og:title", content: "Panduan Hosting Statis — Reminder Mail" },
      {
        property: "og:description",
        content:
          "Konfigurasi rewrite, MIME type, dan HTTPS untuk Apache, Nginx, dan platform statis lain.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HostingGuidePage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Globe;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-[var(--shadow-soft)]">
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h2>
        <div className="mt-3 space-y-3 text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
      <code>{children}</code>
    </pre>
  );
}

function HostingGuidePage() {
  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Panduan hosting statis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Setelan minimum untuk Apache, Nginx, dan platform statis lain supaya paket export tidak
          tampil kosong (layar putih) setelah di-deploy.
        </p>
      </div>

      <Card className="mt-6 border-border/70 shadow-[var(--shadow-soft)]">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-muted-foreground">
            Belum punya paketnya? Unduh ZIP statis lebih dulu di halaman Export.
          </p>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/export">
              <Package className="h-4 w-4" /> Halaman Export
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-4">
        <Section icon={AlertTriangle} title="Kenapa halaman bisa kosong?">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Folder <code>assets/</code> tidak ikut terunggah, sehingga file JavaScript 404 dan{" "}
              <code>&lt;div id="root"&gt;</code> tetap kosong.
            </li>
            <li>
              File dibuka lewat <code>file://</code> — modul ES hanya jalan lewat http/https.
            </li>
            <li>
              Server tidak mengarahkan URL dalam (mis. <code>/smtp</code>) ke{" "}
              <code>index.html</code>, jadi refresh menghasilkan 404 atau halaman kosong.
            </li>
            <li>
              Tipe MIME <code>.js</code> salah (dikirim sebagai <code>text/plain</code>), browser
              menolak mengeksekusinya.
            </li>
            <li>Cache lama menyimpan versi index.html yang menunjuk aset yang sudah dihapus.</li>
          </ul>
          <p>
            Paket export sudah memakai jalur aset relatif dan mendeteksi basepath otomatis, jadi
            bisa dipasang di root domain, subfolder, maupun subdomain tanpa build ulang.
          </p>
        </Section>

        <Section icon={ServerCog} title="Apache / cPanel">
          <p>
            File <code>.htaccess</code> sudah ada di dalam ZIP. Pastikan ikut terunggah — File
            Manager cPanel menyembunyikan file berawalan titik, aktifkan “show hidden files”. Host
            harus mengaktifkan <code>mod_rewrite</code> dan <code>AllowOverride All</code>.
          </p>
          <Code>{`<IfModule mod_rewrite.c>
  RewriteEngine On
  # Untuk subfolder, aktifkan dan sesuaikan:
  # RewriteBase /app/

  # Deep link meminta aset relatif -> arahkan ke folder assets asli
  RewriteRule ^(?:.*/)?assets/(.*)$ assets/$1 [L]

  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  RewriteRule ^ index.html [L]
</IfModule>

AddType application/javascript .js .mjs
AddType text/css .css
AddType font/woff2 .woff2

ErrorDocument 404 /index.html`}</Code>
          <p>
            Jika dipasang di subfolder <code>public_html/app/</code>, cukup hapus tanda pagar pada{" "}
            <code>RewriteBase /app/</code>.
          </p>
        </Section>

        <Section icon={ServerCog} title="Nginx">
          <p>
            Salin blok berikut ke server block Anda, ganti <code>root</code> dengan lokasi file.
          </p>
          <Code>{`server {
  listen 80;
  server_name contoh-domain.com;
  root /var/www/remindly;
  index index.html;

  location ~ ^/.+/assets/(.*)$ {
    try_files /assets/$1 =404;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }
}`}</Code>
          <p>
            Jalankan <code>nginx -t</code> lalu <code>systemctl reload nginx</code> setelah
            mengubah konfigurasi.
          </p>
        </Section>

        <Section icon={Cloud} title="Netlify & Cloudflare Pages">
          <p>
            Keduanya membaca file <code>_redirects</code> yang sudah disertakan:
          </p>
          <Code>{`/*/assets/*    /assets/:splat   200
/*    /index.html   200`}</Code>
          <p>
            Saat upload manual, unggah isi folder (bukan foldernya) sebagai publish directory.
          </p>
        </Section>

        <Section icon={Cloud} title="Vercel (static)">
          <p>
            File <code>vercel.json</code> sudah menyertakan rewrite berikut:
          </p>
          <Code>{`{
  "rewrites": [
    { "source": "/(?:.*/)?assets/(.*)", "destination": "/assets/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}`}</Code>
        </Section>

        <Section icon={Globe} title="Platform statis lain (GitHub Pages, S3, Firebase)">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              GitHub Pages: salin <code>index.html</code> menjadi <code>404.html</code> (sudah
              disertakan di paket) agar deep link tetap termuat.
            </li>
            <li>
              Amazon S3 + CloudFront: set “Index document” dan “Error document” sama-sama ke{" "}
              <code>index.html</code>, dan buat custom error response 403/404 → 200{" "}
              <code>/index.html</code>.
            </li>
            <li>
              Firebase Hosting: tambahkan rewrite{" "}
              <code>{'{ "source": "**", "destination": "/index.html" }'}</code>.
            </li>
          </ul>
        </Section>

        <Section icon={ShieldCheck} title="HTTPS wajib">
          <p>
            Login dan akses database berjalan lewat HTTPS. Aktifkan SSL (misalnya Let&rsquo;s
            Encrypt di cPanel) dan pastikan seluruh situs dipaksa ke HTTPS, karena konten campuran
            (http di halaman https) akan diblokir browser dan membuat halaman kosong.
          </p>
        </Section>

        <Section icon={Wrench} title="Cek cepat bila masih kosong">
          <ol className="list-decimal space-y-1 pl-5">
            <li>Buka Developer Tools → Console dan Network, cari file yang 404 atau merah.</li>
            <li>
              Akses langsung salah satu file aset, mis. <code>/assets/index-xxxx.js</code>. Jika 404,
              berarti unggahan belum lengkap.
            </li>
            <li>
              Jika file terbuka tapi tampil sebagai teks/download, tipe MIME salah — tambahkan{" "}
              <code>AddType</code> di Apache atau <code>types</code> di Nginx.
            </li>
            <li>Muat ulang keras dengan Ctrl/Cmd + Shift + R untuk melewati cache.</li>
            <li>
              Paket akan menampilkan kotak diagnosa otomatis beberapa detik setelah bundel gagal
              dimuat — baca pesannya, di situ tertulis penyebab paling mungkin.
            </li>
          </ol>
        </Section>
      </div>
    </AppShell>
  );
}
