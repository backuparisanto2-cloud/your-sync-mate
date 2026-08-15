#!/usr/bin/env node
/**
 * Membangun versi statis (SPA) dari aplikasi ini dan membungkusnya menjadi
 * public/exports/remindly-static.zip supaya bisa diunduh lewat halaman /export.
 *
 * Jalankan: npm run export:static
 */
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workDir = join(root, ".static-export");
const siteDir = join(workDir, "site");
const outDir = join(root, "public", "exports");
const zipName = "remindly-static.zip";

function run(cmd, args) {
  execFileSync(cmd, args, { cwd: root, stdio: "inherit" });
}

console.log("→ Membangun bundel statis (SPA)…");
rmSync(workDir, { recursive: true, force: true });
run("npx", ["vite", "build", "--config", "spa/vite.config.ts"]);

console.log("→ Menyalin aset publik…");
for (const entry of readdirSync(join(root, "public"))) {
  if (entry === "exports") continue; // jangan ikutkan file zip itu sendiri
  cpSync(join(root, "public", entry), join(siteDir, entry), { recursive: true });
}

console.log("→ Menambahkan konfigurasi hosting…");
// Apache / cPanel
writeFileSync(
  join(siteDir, ".htaccess"),
  `# SPA routing: semua URL dilayani index.html.
# Berlaku baik di root domain maupun di subfolder (mis. public_html/app),
# karena substitusi relatif "index.html" diselesaikan terhadap folder ini.
Options -MultiViews
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  # File atau folder yang benar-benar ada dilayani apa adanya.
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule ^ index.html [L]
</IfModule>

# Cadangan bila mod_rewrite tidak aktif. Jika paket dipasang di subfolder,
# ubah menjadi: ErrorDocument 404 /nama-subfolder/index.html
ErrorDocument 404 /index.html


# Sebagian hosting menyajikan modul JS dengan tipe MIME salah sehingga
# browser menolak menjalankannya dan halaman tampak kosong.
<IfModule mod_mime.c>
  AddType application/javascript .js
  AddType application/javascript .mjs
  AddType text/css .css
  AddType image/svg+xml .svg
  AddType font/woff2 .woff2
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json image/svg+xml
</IfModule>
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>
`,
);

// Netlify / Cloudflare Pages
writeFileSync(join(siteDir, "_redirects"), "/*    /index.html   200\n");
// Vercel static
writeFileSync(
  join(siteDir, "vercel.json"),
  JSON.stringify({ rewrites: [{ source: "/(.*)", destination: "/index.html" }] }, null, 2) + "\n",
);
// Nginx contoh
writeFileSync(
  join(siteDir, "nginx.conf.example"),
  `server {
  listen 80;
  server_name contoh-domain.com;
  root /var/www/remindly;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
`,
);
// Fallback 404 untuk hosting yang hanya mendukung 404.html
cpSync(join(siteDir, "index.html"), join(siteDir, "404.html"));

console.log("→ Menulis panduan deploy…");
cpSync(join(root, "scripts", "deploy-guide.md"), join(siteDir, "README-DEPLOY.md"));

console.log("→ Memvalidasi hasil build…");

/** Kumpulkan semua file hasil build (relatif terhadap siteDir). */
function walk(dir, prefix = "") {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out;
}

const files = walk(siteDir);
const jsFiles = files.filter((f) => f.endsWith(".js"));
const cssFiles = files.filter((f) => f.endsWith(".css"));
const bundleText = jsFiles.map((f) => readFileSync(join(siteDir, f), "utf8")).join("\n");
const indexHtml = existsSync(join(siteDir, "index.html"))
  ? readFileSync(join(siteDir, "index.html"), "utf8")
  : "";

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? "";
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const checks = [
  {
    id: "entry",
    label: "index.html dan 404.html tersedia",
    ok: Boolean(indexHtml) && files.includes("404.html"),
    detail: "Halaman utama serta fallback 404 untuk hosting statis.",
  },
  {
    id: "assets",
    label: "Bundel JavaScript dan CSS ikut terbangun",
    ok: jsFiles.length > 0 && cssFiles.length > 0,
    detail: `${jsFiles.length} berkas JS · ${cssFiles.length} berkas CSS`,
  },
  {
    id: "entry-script",
    label: "index.html memuat skrip bundel",
    ok: /<script[^>]+type="module"[^>]+src="/.test(indexHtml),
    detail: "Tag <script type=\"module\"> menunjuk ke aset hasil build.",
  },
  {
    id: "backend-url",
    label: "URL backend ter-inject ke bundel",
    ok: Boolean(supabaseUrl) && bundleText.includes(supabaseUrl),
    detail: supabaseUrl ? supabaseUrl : "VITE_SUPABASE_URL belum diisi saat build.",
  },
  {
    id: "publishable-key",
    label: "Kunci publik (publishable key) ter-inject",
    ok: Boolean(publishableKey) && bundleText.includes(publishableKey),
    detail: "Diperlukan agar bundel statis bisa terhubung ke database.",
  },
  {
    id: "no-secret",
    label: "Tidak ada kredensial rahasia di bundel",
    ok:
      !/sb_secret_[A-Za-z0-9_-]{8,}/.test(bundleText) &&
      !/"role"\s*:\s*"service_role"/.test(bundleText) &&
      (!serviceRoleKey || !bundleText.includes(serviceRoleKey)),
    detail: "Service role key dan password SMTP hanya ada di backend.",
  },
  {
    id: "no-node",
    label: "Tidak ada modul Node.js yang bocor",
    ok: !/require\("node:(tls|net|fs|child_process)"\)|from"node:(tls|net|fs)"/.test(bundleText),
    detail: "Modul SMTP/server sudah digantikan stub saat build statis.",
  },
  {
    id: "hosting-config",
    label: "Konfigurasi routing hosting lengkap",
    ok: [".htaccess", "_redirects", "vercel.json", "nginx.conf.example"].every((f) =>
      files.includes(f),
    ),
    detail: "Apache, Netlify/Cloudflare, Vercel, dan contoh Nginx.",
  },
  {
    id: "guide",
    label: "Panduan deploy disertakan",
    ok: files.includes("README-DEPLOY.md"),
    detail: "README-DEPLOY.md ada di dalam paket.",
  },
];

for (const check of checks) {
  console.log(`${check.ok ? "  ✓" : "  ✗"} ${check.label}`);
}
const failed = checks.filter((c) => !c.ok);

console.log("→ Membuat arsip ZIP…");
mkdirSync(outDir, { recursive: true });
const zipPath = join(outDir, zipName);
rmSync(zipPath, { force: true });
if (!failed.length) {
  execFileSync("zip", ["-r", "-q", zipPath, "."], { cwd: siteDir, stdio: "inherit" });
}

const size = existsSync(zipPath) ? statSync(zipPath).size : 0;
const zipCheck = {
  id: "archive",
  label: "Arsip ZIP terbentuk dan tidak kosong",
  ok: size > 1024,
  detail: size ? `${(size / 1024 / 1024).toFixed(2)} MB` : "ZIP tidak dibuat karena validasi gagal.",
};

writeFileSync(
  join(outDir, "remindly-static.json"),
  JSON.stringify(
    {
      file: zipName,
      bytes: size,
      builtAt: new Date().toISOString(),
      fileCount: files.length,
      valid: !failed.length && zipCheck.ok,
      checks: [...checks, zipCheck],
    },
    null,
    2,
  ) + "\n",
);

if (failed.length) {
  console.error(`✗ Validasi gagal (${failed.length}): ${failed.map((c) => c.label).join(", ")}`);
  process.exit(1);
}
if (!zipCheck.ok) throw new Error("ZIP gagal dibuat");
console.log(`✓ Selesai: public/exports/${zipName} (${(size / 1024 / 1024).toFixed(2)} MB)`);

