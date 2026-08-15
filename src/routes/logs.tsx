import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/app.functions";
import { CheckCircle2, XCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchLogs } from "@/lib/app.functions";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/logs")({
  head: () => ({
    meta: [
      { title: "Riwayat Pengiriman Email — Reminder Mail" },
      {
        name: "description",
        content:
          "Pantau riwayat pengiriman email pengingat: status berhasil atau gagal, penerima, waktu kirim, dan pesan error SMTP.",
      },
      { property: "og:title", content: "Riwayat Pengiriman Email — Reminder Mail" },
      {
        property: "og:description",
        content: "Lihat status pengiriman email pengingat beserta pesan kesalahan SMTP.",
      },
    ],
  }),
  component: LogsPage,
});

function LogsPage() {
  const load = useServerFn(fetchLogs);
  const logs = useQuery({ queryKey: ["logs"], queryFn: () => load() });

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold sm:text-3xl">Riwayat pengiriman</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">200 aktivitas pengiriman terakhir.</p>

      {logs.isLoading ? <Skeleton className="h-40 w-full rounded-xl" /> : null}

      <div className="space-y-2">
        {(logs.data ?? []).map((l) => (
          <Card key={l.id} className="border-border/70">
            <CardContent className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 p-4">
              {l.status === "success" ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              ) : (
                <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.reminder_title ?? "(tanpa judul)"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {l.recipients ?? "—"} · {formatDateTime(l.sent_at)} · {l.trigger_source}
                </p>
                {l.error ? (
                  <p className="mt-1 text-xs break-words text-destructive">{l.error}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {logs.data?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Belum ada pengiriman.
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
