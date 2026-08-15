import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/app.functions";
import { CheckCircle2, Loader2, Plus, Send, Server, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  fetchSmtpProfiles,
  removeSmtpProfile,
  sendSmtpTestEmail,
  testSmtpProfile,
  upsertSmtpProfile,
} from "@/lib/app.functions";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/smtp")({
  head: () => ({
    meta: [
      { title: "Pengaturan Server SMTP — Reminder Mail" },
      {
        name: "description",
        content:
          "Kelola profil server SMTP: host, port, TLS, alamat pengirim, dan kredensial untuk pengiriman email pengingat.",
      },
      { property: "og:title", content: "Pengaturan Server SMTP — Reminder Mail" },
      {
        property: "og:description",
        content: "Simpan dan uji koneksi profil SMTP untuk pengiriman email pengingat.",
      },
    ],
  }),
  component: SmtpPage,
});

type Draft = {
  id: string | null;
  name: string;
  host: string;
  port: number;
  tls: boolean;
  from_email: string;
  from_name: string;
  username: string;
  password: string;
  verify_cert: boolean;
};

const emptyDraft: Draft = {
  id: null,
  name: "",
  host: "",
  port: 465,
  tls: true,
  from_email: "",
  from_name: "",
  username: "",
  password: "",
  verify_cert: true,
};

function SmtpPage() {
  const qc = useQueryClient();
  const list = useServerFn(fetchSmtpProfiles);
  const save = useServerFn(upsertSmtpProfile);
  const destroy = useServerFn(removeSmtpProfile);
  const test = useServerFn(testSmtpProfile);
  const sendTest = useServerFn(sendSmtpTestEmail);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});


  const profiles = useQuery({ queryKey: ["smtp"], queryFn: () => list() });
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  async function submit() {
    setBusy(true);
    try {
      await save({
        data: {
          id: draft.id,
          name: draft.name.trim(),
          host: draft.host.trim(),
          port: Number(draft.port),
          tls: draft.tls,
          from_email: draft.from_email.trim(),
          from_name: draft.from_name.trim() || null,
          username: draft.username.trim(),
          password: draft.password || null,
          verify_cert: draft.verify_cert,
        },
      });
      toast.success("Profil SMTP tersimpan");
      setDraft(emptyDraft);
      qc.invalidateQueries({ queryKey: ["smtp"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold sm:text-3xl">Server SMTP</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Kredensial disimpan di server dan tidak pernah dikirim kembali ke browser.
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardContent className="space-y-4 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Server className="h-5 w-5 shrink-0 text-primary" />
              {draft.id ? "Ubah profil" : "Profil baru"}
            </h2>
            <div className="space-y-2">
              <Label htmlFor="name">Nama profil</Label>
              <Input id="name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
              <div className="space-y-2">
                <Label htmlFor="host">Server</Label>
                <Input
                  id="host"
                  placeholder="webmail.contoh.co.id"
                  value={draft.host}
                  onChange={(e) => set("host", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  type="number"
                  value={draft.port}
                  onChange={(e) => set("port", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from">Email pengirim</Label>
                <Input
                  id="from"
                  type="email"
                  value={draft.from_email}
                  onChange={(e) => set("from_email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromname">Nama pengirim</Label>
                <Input
                  id="fromname"
                  value={draft.from_name}
                  onChange={(e) => set("from_name", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user">Username</Label>
                <Input
                  id="user"
                  value={draft.username}
                  onChange={(e) => set("username", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass">Password</Label>
                <Input
                  id="pass"
                  type="password"
                  placeholder={draft.id ? "Biarkan kosong jika tidak diubah" : ""}
                  value={draft.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Gunakan TLS</p>
                <p className="text-xs text-muted-foreground">
                  Port 465 memakai TLS langsung, port 587 memakai STARTTLS.
                </p>
              </div>
              <Switch checked={draft.tls} onCheckedChange={(v) => set("tls", v)} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Verifikasi sertifikat</p>
                <p className="text-xs text-muted-foreground">Matikan bila server memakai self-signed.</p>
              </div>
              <Switch checked={draft.verify_cert} onCheckedChange={(v) => set("verify_cert", v)} />
            </div>

            <div className="flex gap-2">
              <Button onClick={submit} disabled={busy} className="rounded-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Simpan profil
              </Button>
              {draft.id ? (
                <Button variant="ghost" className="rounded-full" onClick={() => setDraft(emptyDraft)}>
                  Batal
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {(profiles.data ?? []).map((p) => (
            <Card key={p.id} className="border-border/70 shadow-[var(--shadow-soft)]">
              <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.host}:{p.port} · {p.tls ? "TLS" : "tanpa TLS"} · {p.from_email}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs">
                    {p.last_status?.startsWith("Succeeded") ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    ) : p.last_status ? (
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    ) : null}
                    <span className="text-muted-foreground">
                      {p.last_status ? `${p.last_status} · ${formatDateTime(p.last_tested_at)}` : "belum diuji"}
                    </span>
                  </p>
                  {testing === p.id ? (
                    <p className="mt-2 flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Menguji koneksi & kredensial ke {p.host}:{p.port}…
                    </p>
                  ) : results[p.id] ? (
                    <div
                      className={`mt-2 flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
                        results[p.id]!.ok
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {results[p.id]!.ok ? (
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      ) : (
                        <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      )}
                      <span className="min-w-0 break-words">
                        <strong className="font-medium">
                          {results[p.id]!.ok ? "Kredensial valid" : "Uji gagal"}
                        </strong>{" "}
                        · {results[p.id]!.message}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="rounded-full"
                    disabled={testing === p.id}
                    onClick={async () => {
                      setTesting(p.id);
                      setResults((m) => {
                        const next = { ...m };
                        delete next[p.id];
                        return next;
                      });
                      try {
                        const res = await test({ data: { id: p.id } });
                        const ok = res.status.startsWith("Succeeded");
                        setResults((m) => ({ ...m, [p.id]: { ok, message: res.status } }));
                        if (ok) toast.success("Koneksi & kredensial SMTP valid");
                        else toast.error(`Uji gagal: ${res.status}`);
                      } catch (e) {
                        const message = (e as Error).message;
                        setResults((m) => ({ ...m, [p.id]: { ok: false, message } }));
                        toast.error(message);
                      } finally {
                        setTesting(null);
                        qc.invalidateQueries({ queryKey: ["smtp"] });
                      }
                    }}
                  >

                    {testing === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Uji koneksi
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() =>
                      setDraft({
                        id: p.id,
                        name: p.name,
                        host: p.host,
                        port: p.port,
                        tls: p.tls,
                        from_email: p.from_email,
                        from_name: p.from_name ?? "",
                        username: p.username,
                        password: "",
                        verify_cert: p.verify_cert,
                      })
                    }
                  >
                    Ubah
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full text-destructive"
                    onClick={async () => {
                      if (!confirm(`Hapus profil "${p.name}"?`)) return;
                      await destroy({ data: { id: p.id } });
                      qc.invalidateQueries({ queryKey: ["smtp"] });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="col-span-2 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                  <Input
                    type="email"
                    className="h-9 w-full sm:w-64"
                    placeholder="email tujuan uji"
                    value={testEmail[p.id] ?? ""}
                    onChange={(e) => setTestEmail((m) => ({ ...m, [p.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    className="rounded-full"
                    disabled={sending === p.id}
                    onClick={async () => {
                      const to = (testEmail[p.id] ?? "").trim();
                      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
                        toast.error("Masukkan alamat email tujuan yang valid");
                        return;
                      }
                      setSending(p.id);
                      try {
                        const res = await sendTest({ data: { id: p.id, to } });
                        if (res.error) toast.error(`Gagal kirim: ${res.error}`);
                        else toast.success(`Email uji terkirim ke ${to}`);
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setSending(null);
                        qc.invalidateQueries({ queryKey: ["smtp"] });
                      }
                    }}
                  >
                    {sending === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Kirim email uji
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {profiles.data?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                Belum ada profil SMTP.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
