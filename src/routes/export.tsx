import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  Globe,
  KeyRound,
  Loader2,
  ServerCog,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/export")({
  head: () => ({
    meta: [
      { title: "Export Static — Reminder Mail" },
      {
        name: "description",
        content:
          "Unduh versi statis Reminder Mail dalam satu file ZIP dan ikuti panduan deploy ke hosting biasa, dengan database tetap di Lovable Cloud.",
      },
      { property: "og:title", content: "Export Static — Reminder Mail" },
      {
        property: "og:description",
        content: "Unduh paket statis Reminder Mail beserta panduan deploy ke hosting biasa.",
      },
    ],
  }),
  component: ExportPage,
});

type ExportCheck = { id: string; label: string; ok: boolean; detail: string };
type ExportMeta = {
  file: string;
  bytes: number;
  builtAt: string;
  fileCount?: number;
  valid?: boolean;
  checks?: ExportCheck[];
};

const ZIP_URL = "/exports/remindly-static.zip";


function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Globe;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/70 shadow-[var(--shadow-soft)]">
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h2>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
      <code>{children}</code>
    </pre>
  );
}

function ExportPage() {
  const meta = useQuery<ExportMeta | null>({
    queryKey: ["static-export-meta"],
    queryFn: async () => {
      const res = await fetch("/exports/remindly-static.json", { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as ExportMeta;
    },
  });

  const sizeMb = meta.data ? (meta.data.bytes / 1024 / 1024).toFixed(2) : null;
  const checks = meta.data?.checks ?? [];
  const failed = checks.filter((c) => !c.ok);
  const validated = Boolean(meta.data) && checks.length > 0;
  const ready = validated ? failed.length === 0 : Boolean(meta.data);

  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Export static</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unduh aplikasi ini sebagai paket HTML/CSS/JS siap unggah. Database, login, dan lampiran
          tetap memakai backend yang sama, jadi data Anda tidak berpindah.
        </p>
      </div>

      <Card className="mt-6 border-border/70 shadow-[var(--shadow-soft)]">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <FileArchive className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="font-medium">remindly-static.zip</p>
              <p className="text-xs text-muted-foreground">
                {meta.isLoading
                  ? "Memeriksa paket…"
                  : meta.data
                    ? `${sizeMb} MB · ${meta.data.fileCount ?? "?"} berkas · dibuat ${formatDateTime(meta.data.builtAt)}`
                    : "Paket belum tersedia — jalankan perintah export di bawah."}
              </p>
            </div>
          </div>
          {ready ? (
            <Button asChild className="rounded-full">
              <a href={ZIP_URL} download>
                <Download className="h-4 w-4" /> Unduh ZIP statis
              </a>
            </Button>
          ) : (
            <Button className="rounded-full" disabled>
              {meta.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {meta.isLoading ? "Memvalidasi…" : "Belum lolos validasi"}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="mt-4 border-border/70 shadow-[var(--shadow-soft)]">
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" /> Validasi bundel
            </h2>
            <span
              className={
                "rounded-full px-3 py-1 text-xs font-medium " +
                (ready
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive")
              }
            >
              {meta.isLoading
                ? "Memeriksa…"
                : !validated
                  ? "Belum ada hasil validasi"
                  : ready
                    ? `Lolos ${checks.length}/${checks.length} pemeriksaan`
                    : `${failed.length} pemeriksaan gagal`}
            </span>
          </div>

          {validated ? (
            <ul className="mt-4 space-y-2">
              {checks.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm">
                  {c.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span className="min-w-0">
                    <span className={c.ok ? "" : "text-destructive"}>{c.label}</span>
                    <span className="block text-xs text-muted-foreground">{c.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Jalankan <code className="rounded bg-muted px-1 py-0.5">npm run export:static</code>{" "}
              untuk membangun ulang paket sekaligus menjalankan pemeriksaan otomatis (entry point,
              aset, kredensial ter-inject, tidak ada rahasia yang bocor, konfigurasi hosting).
            </p>
          )}

          {validated && !ready && (
            <p className="mt-3 text-sm text-destructive">
              Unduhan dinonaktifkan karena bundel belum valid. Perbaiki poin di atas lalu jalankan
              ulang <code className="rounded bg-muted px-1 py-0.5">npm run export:static</code> —
              ZIP hanya dibuat ketika semua pemeriksaan lolos.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="mt-3 text-xs text-muted-foreground">
        Catatan: format RAR butuh perangkat lunak berlisensi, jadi ekspor memakai ZIP yang bisa
        dibuka semua sistem. Untuk membuat ulang paket setelah ada perubahan tampilan, jalankan{" "}
        <code className="rounded bg-muted px-1 py-0.5">npm run export:static</code>.
      </p>

      <Card className="mt-4 border-border/70 shadow-[var(--shadow-soft)]">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-muted-foreground">
            Butuh nilai variabel lingkungan atau setelan server hosting?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/hosting-guide">
                <ServerCog className="h-4 w-4" /> Panduan hosting
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/env-guide">
                <KeyRound className="h-4 w-4" /> Panduan variabel lingkungan
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>



      <div className="mt-8 space-y-4">
        <Section icon={Globe} title="1. Unggah ke hosting">
          <p>
            Ekstrak ZIP-nya, lalu unggah <strong>seluruh isi folder</strong> (bukan foldernya) ke
            hosting — misalnya <code>public_html/</code> di cPanel. Folder <code>assets/</code>{" "}
            wajib ikut terunggah lengkap di samping <code>index.html</code>.
          </p>
          <p>
            Aset memakai jalur relatif, jadi paket ini bisa dipasang di root domain, di subfolder
            (<code>public_html/app/</code> → <code>domain.com/app</code>), maupun di subdomain tanpa
            perlu build ulang. Jika halaman tampil kosong, paket akan menampilkan pesan diagnosa
            penyebabnya — biasanya folder <code>assets/</code> belum terunggah atau{" "}
            <code>mod_rewrite</code>/<code>AllowOverride</code> belum aktif.
          </p>
          <p>Aktifkan HTTPS (Let&rsquo;s Encrypt) karena login dan akses data memerlukannya.</p>

        </Section>

        <Section icon={ServerCog} title="2. Arahkan semua URL ke index.html">
          <p>
            Routing berjalan di browser, jadi server harus melayani <code>index.html</code> untuk
            setiap URL. File konfigurasi sudah ikut di dalam ZIP:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Apache / cPanel: <code>.htaccess</code> (langsung aktif)
            </li>
            <li>
              Netlify / Cloudflare Pages: <code>_redirects</code>
            </li>
            <li>
              Vercel static: <code>vercel.json</code>
            </li>
            <li>
              Nginx: salin dari <code>nginx.conf.example</code>
            </li>
          </ul>
          <Code>{`location / {\n  try_files $uri $uri/ /index.html;\n}`}</Code>
          <p>Tanpa aturan ini, halaman seperti /smtp akan 404 saat di-refresh.</p>
        </Section>

        <Section icon={ShieldCheck} title="3. Login dan SMTP setelah deploy">
          <p>
            Buka domain Anda dan masuk dengan akun yang sudah terdaftar di backend (akun baru dibuat
            dari dasbor backend, bukan dari halaman login).
          </p>
          <p>
            Lalu buka halaman SMTP, isi kredensial, dan pakai tombol <strong>Uji koneksi</strong>{" "}
            serta <strong>Kirim email uji</strong> untuk memverifikasi.
          </p>
        </Section>

        <Section icon={ServerCog} title="Yang tetap berjalan di backend">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Pengiriman email SMTP butuh koneksi soket, jadi tetap diproses backend dan dipanggil
              lewat HTTPS oleh paket statis.
            </li>
            <li>
              Penjadwalan otomatis dijalankan cron di backend; bila proyek backend dihentikan,
              tampilan statis tetap terbuka tetapi email terjadwal berhenti.
            </li>
            <li>
              Jika backend pindah URL, build ulang dengan variabel <code>VITE_BACKEND_URL</code>{" "}
              yang menunjuk ke URL baru.
            </li>
          </ul>
        </Section>
      </div>
    </AppShell>
  );
}
