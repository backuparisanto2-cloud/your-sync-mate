import { useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/app.functions";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  Paperclip,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  fetchDashboard,
  fetchReminders,
  removeReminder,
  sendReminderNow,
  setReminderEnabled,
} from "@/lib/app.functions";
import { formatDateTime } from "@/lib/format";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reminder Mail — Penjadwal Email SMTP Otomatis" },
      {
        name: "description",
        content:
          "Kelola pengingat email otomatis lewat server SMTP sendiri: multi periode tanggal, jam kirim, lampiran, dan riwayat pengiriman.",
      },
      { property: "og:title", content: "Reminder Mail — Penjadwal Email SMTP Otomatis" },
      {
        property: "og:description",
        content: "Jadwalkan email pengingat dengan SMTP sendiri, multi periode tanggal dan lampiran.",
      },
    ],
  }),
  component: Dashboard,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="border-border/70 shadow-[var(--shadow-soft)]">
      <CardContent className="p-5">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
        <p className="mt-2 font-display text-2xl font-semibold">{value}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const router = useRouter();
  const qc = useQueryClient();
  const list = useServerFn(fetchReminders);
  const stats = useServerFn(fetchDashboard);
  const toggle = useServerFn(setReminderEnabled);
  const sendNow = useServerFn(sendReminderNow);
  const destroy = useServerFn(removeReminder);

  const reminders = useQuery({ queryKey: ["reminders"], queryFn: () => list() });
  const dashboard = useQuery({ queryKey: ["dashboard"], queryFn: () => stats() });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["reminders"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const toggleMutation = useMutation({
    mutationFn: (v: { id: string; enabled: boolean; title: string }) =>
      toggle({ data: { id: v.id, enabled: v.enabled } }).then(() => v),
    onSuccess: (v) => {
      toast.success(v.enabled ? `“${v.title}” dilanjutkan` : `“${v.title}” dijeda`);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => setTogglingId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => destroy({ data: { id } }),
    onSuccess: () => {
      toast.success("Reminder dihapus");
      refresh();
      router.invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => sendNow({ data: { id } }),
    onSuccess: (res) => {
      if (res.ok) toast.success("Email berhasil dikirim");
      else toast.error(res.error ?? "Gagal mengirim");
      refresh();
      qc.invalidateQueries({ queryKey: ["logs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <AppShell>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold sm:text-3xl">Dasbor pengingat</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Jadwalkan email pengingat lewat server SMTP Anda sendiri.
          </p>
        </div>
        <Button asChild className="shrink-0 rounded-full">
          <Link to="/reminders/new">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Reminder baru</span>
          </Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total reminder" value={String(dashboard.data?.total ?? 0)} />
        <Stat label="Aktif" value={String(dashboard.data?.active ?? 0)} />
        <Stat
          label="Jadwal terdekat"
          value={dashboard.data?.nextRun ? formatDateTime(dashboard.data.nextRun) : "—"}
        />
        <Stat
          label="50 kiriman terakhir"
          value={`${dashboard.data?.successCount ?? 0} berhasil`}
          hint={`${dashboard.data?.failedCount ?? 0} gagal`}
        />
      </div>

      <div className="mt-8 space-y-3">
        {reminders.isLoading ? (
          <>
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </>
        ) : null}

        {reminders.data?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <CalendarClock className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 font-display text-lg">Belum ada reminder</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Buat reminder pertama dan tentukan periode tanggalnya.
              </p>
              <Button asChild className="mt-5 rounded-full">
                <Link to="/reminders/new">Buat reminder</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {reminders.data?.map((r) => (
          <Card key={r.id} className="border-border/70 shadow-[var(--shadow-soft)]">
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">{r.title}</h2>
                  {r.enabled ? (
                    <Badge className="rounded-full bg-accent text-accent-foreground">Aktif</Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">
                      Nonaktif
                    </Badge>
                  )}
                  {r.attachment_count > 0 ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Paperclip className="h-3 w-3" />
                      {r.attachment_count}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{r.subject}</p>
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  Ke: {(r.to_emails ?? []).join(", ") || "—"} · SMTP: {r.smtp_name ?? "belum dipilih"}
                </p>
                <p className="mt-1 text-xs">
                  <span className="text-muted-foreground">Berikutnya: </span>
                  <span className="font-medium">
                    {r.next_run
                      ? `${formatDateTime(r.next_run, r.timezone ?? undefined)} (${r.timezone ?? "Asia/Jakarta"})`
                      : "tidak ada jadwal mendatang"}
                  </span>
                </p>

              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={r.enabled ? "outline" : "default"}
                  className="rounded-full"
                  disabled={toggleMutation.isPending && togglingId === r.id}
                  onClick={() => {
                    setTogglingId(r.id);
                    toggleMutation.mutate({ id: r.id, enabled: !r.enabled, title: r.title });
                  }}
                >
                  {toggleMutation.isPending && togglingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : r.enabled ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  {r.enabled ? "Jeda" : "Lanjutkan"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="rounded-full"
                  disabled={sendMutation.isPending}
                  onClick={() => sendMutation.mutate(r.id)}
                >
                  <Send className="h-4 w-4" /> Kirim
                </Button>
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to="/reminders/$id" params={{ id: r.id }}>
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-destructive hover:text-destructive"
                      aria-label={`Hapus reminder ${r.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus reminder ini?</AlertDialogTitle>
                      <AlertDialogDescription>
                        “{r.title}” beserta jadwal dan lampirannya akan dihapus permanen. Riwayat
                        pengiriman tetap tersimpan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteMutation.mutate(r.id)}
                      >
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Pengiriman otomatis dicek setiap menit
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="h-4 w-4" /> Kegagalan tercatat di halaman Riwayat
        </span>
      </div>
    </AppShell>
  );
}
