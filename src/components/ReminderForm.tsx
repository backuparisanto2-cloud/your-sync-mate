import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@/lib/app.functions";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteAttachment,
  fetchSmtpProfiles,
  requestUploadTicket,
  saveAttachment,
  upsertReminder,
} from "@/lib/app.functions";
import {
  deviceTimezone,
  formatBytes,
  timezoneLabel,
  TIMEZONES,
  WEEKDAYS,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type ScheduleDraft = {
  kind: "single" | "range";
  start_date: string;
  end_date: string;
  send_time: string;
  weekdays: number[];
};

type AttachmentRow = { id: string; filename: string; size_bytes: number };

export type ReminderFormValues = {
  id: string | null;
  title: string;
  to_emails: string;
  cc_emails: string;
  bcc_emails: string;
  subject: string;
  body: string;
  smtp_profile_id: string | null;
  enabled: boolean;
  timezone: string;
  schedules: ScheduleDraft[];
  attachments: AttachmentRow[];
};

export const emptyReminder: ReminderFormValues = {
  id: null,
  title: "",
  to_emails: "",
  cc_emails: "",
  bcc_emails: "",
  subject: "",
  body: "",
  smtp_profile_id: null,
  enabled: true,
  timezone: "Asia/Jakarta",
  schedules: [
    {
      kind: "single",
      start_date: new Date().toISOString().slice(0, 10),
      end_date: "",
      send_time: "08:00",
      weekdays: [1, 2, 3, 4, 5],
    },
  ],
  attachments: [],
};

const splitEmails = (value: string) =>
  value
    .split(/[,;\s]+/)
    .map((v) => v.trim())
    .filter(Boolean);

export function ReminderForm({ initial }: { initial: ReminderFormValues }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<ReminderFormValues>(initial);
  const tzOptions = useMemo(() => {
    const list = [...TIMEZONES];
    for (const tz of [deviceTimezone(), initial.timezone]) {
      if (tz && !list.some((t) => t.value === tz)) list.unshift({ value: tz, label: tz });
    }
    return list;
  }, [initial.timezone]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const listSmtp = useServerFn(fetchSmtpProfiles);
  const save = useServerFn(upsertReminder);
  const ticket = useServerFn(requestUploadTicket);
  const registerFile = useServerFn(saveAttachment);
  const dropFile = useServerFn(deleteAttachment);

  const smtp = useQuery({ queryKey: ["smtp"], queryFn: () => listSmtp() });

  const set = <K extends keyof ReminderFormValues>(key: K, value: ReminderFormValues[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const patchSchedule = (index: number, patch: Partial<ScheduleDraft>) =>
    setForm((f) => ({
      ...f,
      schedules: f.schedules.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  async function persist(): Promise<string | null> {
    const to = splitEmails(form.to_emails);
    if (!form.title.trim()) return toast.error("Judul wajib diisi"), null;
    if (!to.length) return toast.error("Minimal satu email tujuan"), null;
    if (!form.subject.trim()) return toast.error("Subjek wajib diisi"), null;
    if (!form.smtp_profile_id) return toast.error("Pilih profil SMTP"), null;

    const res = await save({
      data: {
        id: form.id,
        title: form.title.trim(),
        to_emails: to,
        cc_emails: splitEmails(form.cc_emails),
        bcc_emails: splitEmails(form.bcc_emails),
        subject: form.subject.trim(),
        body: form.body,
        smtp_profile_id: form.smtp_profile_id,
        enabled: form.enabled,
        timezone: form.timezone,
        schedules: form.schedules.map((s) => ({
          kind: s.kind,
          start_date: s.start_date || null,
          end_date: s.kind === "range" ? s.end_date || null : null,
          send_time: s.send_time.length === 5 ? `${s.send_time}:00` : s.send_time,
          weekdays: s.kind === "range" ? s.weekdays : [],
        })),
      },
    });
    return res.id;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const id = await persist();
      if (id) {
        toast.success("Reminder tersimpan");
        navigate({ to: "/" });
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      let reminderId = form.id;
      if (!reminderId) {
        reminderId = await persist();
        if (!reminderId) return;
        setForm((f) => ({ ...f, id: reminderId }));
      }
      const t = await ticket({ data: { reminderId, filename: file.name } });
      const up = await supabase.storage.from("attachments").uploadToSignedUrl(t.path, t.token, file);
      if (up.error) throw new Error(up.error.message);
      const row = await registerFile({
        data: {
          reminder_id: reminderId,
          path: t.path,
          filename: file.name,
          size_bytes: file.size,
          mime_type: file.type || "application/octet-stream",
        },
      });
      setForm((f) => ({
        ...f,
        attachments: [
          ...f.attachments,
          { id: row!.id, filename: row!.filename, size_bytes: row!.size_bytes },
        ],
      }));
      toast.success("Lampiran diunggah");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="title">Judul reminder</Label>
              <Input
                id="title"
                value={form.title}
                maxLength={120}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Pengingat laporan harian"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="to">Kepada (pisahkan koma)</Label>
                <Input
                  id="to"
                  value={form.to_emails}
                  onChange={(e) => set("to_emails", e.target.value)}
                  placeholder="nama@perusahaan.co.id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc">CC</Label>
                <Input id="cc" value={form.cc_emails} onChange={(e) => set("cc_emails", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bcc">BCC</Label>
              <Input id="bcc" value={form.bcc_emails} onChange={(e) => set("bcc_emails", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subjek</Label>
              <Input
                id="subject"
                value={form.subject}
                maxLength={200}
                onChange={(e) => set("subject", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Isi pesan (mendukung HTML)</Label>
              <Textarea
                id="body"
                rows={9}
                value={form.body}
                onChange={(e) => set("body", e.target.value)}
                placeholder="Halo, ini pengingat untuk ..."
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardContent className="space-y-4 p-6">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <CalendarRange className="h-5 w-5 shrink-0 text-primary" /> Periode pengiriman
                </h2>
                <p className="text-xs text-muted-foreground">
                  Tambahkan beberapa tanggal tunggal atau rentang tanggal sekaligus.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="shrink-0 rounded-full"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    schedules: [
                      ...f.schedules,
                      {
                        kind: "single",
                        start_date: new Date().toISOString().slice(0, 10),
                        end_date: "",
                        send_time: "08:00",
                        weekdays: [1, 2, 3, 4, 5],
                      },
                    ],
                  }))
                }
              >
                <Plus className="h-4 w-4" /> Periode
              </Button>
            </div>

            {form.schedules.map((s, i) => (
              <div key={i} className="rounded-xl border border-border/70 bg-secondary/40 p-4">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <Select
                    value={s.kind}
                    onValueChange={(v) => patchSchedule(i, { kind: v as ScheduleDraft["kind"] })}
                  >
                    <SelectTrigger className="w-full sm:w-48 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Tanggal tunggal</SelectItem>
                      <SelectItem value="range">Rentang tanggal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-destructive"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        schedules: f.schedules.filter((_, idx) => idx !== i),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      {s.kind === "range" ? "Tanggal mulai" : "Tanggal"}
                    </Label>
                    <Input
                      type="date"
                      className="bg-background"
                      value={s.start_date}
                      onChange={(e) => patchSchedule(i, { start_date: e.target.value })}
                    />
                  </div>
                  {s.kind === "range" ? (
                    <div className="space-y-1">
                      <Label className="text-xs">Tanggal selesai</Label>
                      <Input
                        type="date"
                        className="bg-background"
                        value={s.end_date}
                        onChange={(e) => patchSchedule(i, { end_date: e.target.value })}
                      />
                    </div>
                  ) : null}
                  <div className="space-y-1">
                    <Label className="text-xs">Jam kirim</Label>
                    <Input
                      type="time"
                      className="bg-background"
                      value={s.send_time.slice(0, 5)}
                      onChange={(e) => patchSchedule(i, { send_time: e.target.value })}
                    />
                  </div>
                </div>

                {s.kind === "range" ? (
                  <div className="mt-3">
                    <Label className="text-xs">Hari aktif</Label>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((d) => {
                        const active = s.weekdays.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() =>
                              patchSchedule(i, {
                                weekdays: active
                                  ? s.weekdays.filter((w) => w !== d.value)
                                  : [...s.weekdays, d.value].sort(),
                              })
                            }
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                              active
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-accent",
                            )}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <Label>Profil SMTP</Label>
              <Select
                value={form.smtp_profile_id ?? ""}
                onValueChange={(v) => set("smtp_profile_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih server pengirim" />
                </SelectTrigger>
                <SelectContent>
                  {(smtp.data ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.from_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {smtp.data?.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Belum ada profil SMTP — tambahkan di menu SMTP.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="tz">Zona waktu</Label>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => set("timezone", deviceTimezone())}
                >
                  Pakai zona perangkat
                </button>
              </div>
              <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                <SelectTrigger id="tz">
                  <SelectValue placeholder="Pilih zona waktu" />
                </SelectTrigger>
                <SelectContent>
                  {tzOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Jam kirim di jadwal mengikuti waktu lokal {timezoneLabel(form.timezone)}.
              </p>
            </div>


            <Separator />

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium">Aktifkan pengiriman otomatis</p>
                <p className="text-xs text-muted-foreground">Jalankan sesuai jadwal di atas.</p>
              </div>
              <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-[var(--shadow-soft)]">
          <CardContent className="space-y-3 p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Paperclip className="h-4 w-4 text-primary" /> Lampiran
            </h2>
            {form.attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm">{a.filename}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatBytes(a.size_bytes)}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive"
                    onClick={async () => {
                      await dropFile({ data: { id: a.id } });
                      setForm((f) => ({
                        ...f,
                        attachments: f.attachments.filter((x) => x.id !== a.id),
                      }));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </span>
              </div>
            ))}
            <Input
              type="file"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void handleUpload(file);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Maksimal 25 MB per berkas. Menyimpan lampiran akan menyimpan reminder terlebih dahulu.
            </p>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full rounded-full" size="lg">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Simpan reminder
        </Button>
      </div>
    </div>
  );
}
