import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Download, KeyRound, Server, ShieldAlert, Terminal } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { backendUrl } from "@/lib/backend";

export const Route = createFileRoute("/env-guide")({
  head: () => ({
    meta: [
      { title: "Panduan Variabel Lingkungan — Reminder Mail" },
      {
        name: "description",
        content:
          "Instruksi variabel lingkungan yang tersusun otomatis untuk menghubungkan bundel statis Reminder Mail ke backend, lengkap dengan file .env siap unduh.",
      },
      { property: "og:title", content: "Panduan Variabel Lingkungan — Reminder Mail" },
      {
        property: "og:description",
        content: "File .env siap pakai untuk build ulang bundel statis Reminder Mail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnvGuidePage,
});

type EnvVar = {
  name: string;
  value: string;
  scope: "client" | "server";
  required: boolean;
  description: string;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success(`${label} disalin`);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Browser menolak akses papan klip");
        }
      }}
    >
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Salin
    </Button>
  );
}

const SMTP_MODES = {
  "465": { port: 465, tls: true, label: "465 — TLS langsung (SMTPS)" },
  "587": { port: 587, tls: true, label: "587 — STARTTLS" },
  "25": { port: 25, tls: false, label: "25 — tanpa enkripsi" },
  custom: { port: 2525, tls: true, label: "Port khusus" },
} as const;

type SmtpMode = keyof typeof SMTP_MODES;

function EnvGuidePage() {
  const [domain, setDomain] = useState("");
  const [smtpMode, setSmtpMode] = useState<SmtpMode>("465");
  const [customPort, setCustomPort] = useState("2525");
  const [customTls, setCustomTls] = useState(true);
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");

  const env = import.meta.env as Record<string, string | undefined>;
  const backend = backendUrl();

  const smtpPort = smtpMode === "custom" ? customPort.trim() : String(SMTP_MODES[smtpMode].port);
  const smtpSecure = smtpMode === "custom" ? customTls : SMTP_MODES[smtpMode].tls;

  const vars = useMemo<EnvVar[]>(
    () => [
      {
        name: "VITE_SUPABASE_URL",
        value: env["VITE_SUPABASE_URL"] ?? "",
        scope: "client",
        required: true,
        description: "Alamat backend tempat data pengingat disimpan.",
      },
      {
        name: "VITE_SUPABASE_PUBLISHABLE_KEY",
        value: env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
        scope: "client",
        required: true,
        description: "Kunci publik. Aman berada di browser karena akses dibatasi RLS.",
      },
      {
        name: "VITE_SUPABASE_PROJECT_ID",
        value: env["VITE_SUPABASE_PROJECT_ID"] ?? "",
        scope: "client",
        required: false,
        description: "Penanda proyek backend, dipakai sebagian alat bantu.",
      },
      {
        name: "VITE_BACKEND_URL",
        value: env["VITE_BACKEND_URL"] ?? backend,
        scope: "client",
        required: true,
        description: "URL backend pengirim SMTP yang dipanggil bundel statis lewat HTTPS.",
      },
      {
        name: "SUPABASE_URL",
        value: env["VITE_SUPABASE_URL"] ?? "",
        scope: "server",
        required: true,
        description: "Sama seperti di atas, dibaca oleh endpoint email di backend.",
      },
      {
        name: "SUPABASE_PUBLISHABLE_KEY",
        value: env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "",
        scope: "server",
        required: true,
        description: "Dipakai backend untuk memverifikasi token login pemanggil.",
      },
      {
        name: "SUPABASE_SERVICE_ROLE_KEY",
        value: "",
        scope: "server",
        required: true,
        description:
          "Kunci rahasia backend. Tidak dapat ditampilkan di sini dan tidak boleh masuk ke bundel statis.",
      },
      {
        name: "ALLOWED_ORIGINS",
        value: domain.trim() ? normalizeOrigin(domain) : "",
        scope: "server",
        required: false,
        description: "Daftar domain yang boleh memanggil endpoint email, dipisah koma.",
      },
      {
        name: "SMTP_HOST",
        value: smtpHost.trim(),
        scope: "server",
        required: false,
        description: "Alamat server SMTP, contoh smtp.gmail.com.",
      },
      {
        name: "SMTP_PORT",
        value: smtpPort,
        scope: "server",
        required: false,
        description: "Port koneksi SMTP sesuai mode yang dipilih di atas.",
      },
      {
        name: "SMTP_SECURE",
        value: String(smtpSecure),
        scope: "server",
        required: false,
        description: "true untuk TLS langsung (465), false bila memakai STARTTLS atau tanpa TLS.",
      },
      {
        name: "SMTP_FROM",
        value: smtpFrom.trim(),
        scope: "server",
        required: false,
        description: "Alamat pengirim default. Password SMTP tetap disimpan di server saja.",
      },
    ],
    [env, backend, domain, smtpHost, smtpPort, smtpSecure, smtpFrom],
  );

  const clientVars = vars.filter((v) => v.scope === "client");
  const serverVars = vars.filter((v) => v.scope === "server");

  const dotEnv = useMemo(
    () =>
      [
        "# .env untuk build ulang bundel statis Reminder Mail",
        "# Dibuat otomatis dari konfigurasi aplikasi yang sedang berjalan.",
        "",
        ...clientVars.map((v) => `${v.name}=${v.value || "isi_nilai_di_sini"}`),
        "",
        "# --- Variabel backend (isi di server, JANGAN di bundel statis) ---",
        ...serverVars.map((v) => `# ${v.name}=${v.value || "isi_nilai_di_sini"}`),
        "",
      ].join("\n"),
    [clientVars, serverVars],
  );

  const missing = clientVars.filter((v) => v.required && !v.value);

  return (
    <AppShell>
      <div className="max-w-3xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Panduan variabel lingkungan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Nilai di bawah disusun otomatis dari konfigurasi yang sedang dipakai aplikasi ini. Pakai
          saat Anda membangun ulang bundel statis atau memindahkannya ke hosting lain.
        </p>
      </div>

      <Card className="mt-6 border-border/70 shadow-[var(--shadow-soft)]">
        <CardContent className="space-y-3 p-5">
          <label className="text-sm font-medium" htmlFor="domain">
            Domain tujuan setelah export (opsional)
          </label>
          <Input
            id="domain"
            placeholder="contoh: pengingat.domainanda.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Isi domain baru Anda supaya nilai <code>ALLOWED_ORIGINS</code> ikut tersusun otomatis.
          </p>
        </CardContent>
      </Card>

      <Card className="mt-4 border-border/70 shadow-[var(--shadow-soft)]">
        <CardContent className="space-y-4 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Server className="h-4 w-4 text-primary" /> Koneksi SMTP
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="smtp-mode">Port &amp; enkripsi</Label>
              <Select value={smtpMode} onValueChange={(v) => setSmtpMode(v as SmtpMode)}>
                <SelectTrigger id="smtp-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SMTP_MODES) as SmtpMode[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {SMTP_MODES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-host">Host SMTP (opsional)</Label>
              <Input
                id="smtp-host"
                placeholder="smtp.gmail.com"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>
            {smtpMode === "custom" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port khusus</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={customPort}
                    onChange={(e) => setCustomPort(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
                  <Label htmlFor="smtp-tls" className="text-sm">
                    Pakai TLS langsung
                  </Label>
                  <Switch id="smtp-tls" checked={customTls} onCheckedChange={setCustomTls} />
                </div>
              </>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="smtp-from">Alamat pengirim (opsional)</Label>
              <Input
                id="smtp-from"
                placeholder="pengingat@domainanda.com"
                value={smtpFrom}
                onChange={(e) => setSmtpFrom(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Port 465 memakai TLS langsung, port 587 memakai STARTTLS, port 25 tanpa enkripsi. Nilai
            ini harus sama dengan profil di halaman SMTP agar pengiriman berhasil.
          </p>
        </CardContent>
      </Card>

      <VarSection
        icon={KeyRound}
        title="1. Variabel build (masuk ke bundel statis)"
        note="Isi variabel ini di file .env sebelum menjalankan npm run export:static."
        vars={clientVars}
      />

      <Card className="mt-4 border-border/70 shadow-[var(--shadow-soft)]">
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Terminal className="h-4 w-4 text-primary" /> File .env siap pakai
            </h2>
            <div className="flex gap-2">
              <CopyButton text={dotEnv} label="Isi .env" />
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                onClick={() => downloadText(".env", dotEnv)}
              >
                <Download className="h-4 w-4" /> Unduh .env
              </Button>
            </div>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs text-foreground">
            <code>{dotEnv}</code>
          </pre>
          {missing.length > 0 && (
            <p className="text-xs text-destructive">
              Belum terisi: {missing.map((v) => v.name).join(", ")}. Lengkapi sebelum build.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Simpan file ini di root proyek, lalu jalankan{" "}
            <code className="rounded bg-muted px-1 py-0.5">npm run export:static</code>.
          </p>
        </CardContent>
      </Card>

      <VarSection
        icon={Server}
        title="2. Variabel backend (tetap di server)"
        note="Diatur di backend yang memproses pengiriman SMTP — jangan pernah dimasukkan ke bundel statis."
        vars={serverVars}
      />

      <Card className="mt-4 border-destructive/40 bg-destructive/5 shadow-[var(--shadow-soft)]">
        <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <ShieldAlert className="h-4 w-4 text-destructive" /> Catatan keamanan
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Hanya variabel berawalan <code>VITE_</code> yang boleh ikut ke bundel statis; semuanya
              terlihat oleh pengunjung.
            </li>
            <li>
              Service role key dan password SMTP tidak pernah ditampilkan maupun dikirim ke browser.
            </li>
            <li>
              Jangan menaruh file <code>.env</code> di folder publik hosting Anda.
            </li>
          </ul>
        </CardContent>
      </Card>
    </AppShell>
  );
}

function VarSection({
  icon: Icon,
  title,
  note,
  vars,
}: {
  icon: typeof Server;
  title: string;
  note: string;
  vars: EnvVar[];
}) {
  return (
    <Card className="mt-4 border-border/70 shadow-[var(--shadow-soft)]">
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{note}</p>
        <div className="mt-4 space-y-3">
          {vars.map((v) => (
            <div
              key={`${v.scope}-${v.name}`}
              className="rounded-xl border border-border/70 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <code className="font-medium">{v.name}</code>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {v.required ? "wajib" : "opsional"}
                  </span>
                  {v.value && <CopyButton text={`${v.name}=${v.value}`} label={v.name} />}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{v.description}</p>
              <p className="mt-2 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                {v.value || "— isi manual —"}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function normalizeOrigin(input: string) {
  const trimmed = input.trim().replace(/\/$/, "");
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
