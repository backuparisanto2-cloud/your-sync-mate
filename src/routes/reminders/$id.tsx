import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/app.functions";
import { AppShell } from "@/components/AppShell";
import { Skeleton } from "@/components/ui/skeleton";
import { ReminderForm, emptyReminder, type ReminderFormValues } from "@/components/ReminderForm";
import { fetchReminder } from "@/lib/app.functions";

export const Route = createFileRoute("/reminders/$id")({
  head: () => ({
    meta: [
      { title: "Ubah Reminder Email — Reminder Mail" },
      {
        name: "description",
        content:
          "Perbarui penerima, isi pesan, periode tanggal, jam kirim, dan lampiran pada pengingat email terjadwal.",
      },
      { property: "og:title", content: "Ubah Reminder Email — Reminder Mail" },
      {
        property: "og:description",
        content: "Perbarui jadwal, penerima, dan lampiran pengingat email Anda.",
      },
    ],
  }),
  component: EditReminder,
});

function EditReminder() {
  const { id } = Route.useParams();
  const load = useServerFn(fetchReminder);
  const query = useQuery({ queryKey: ["reminder", id], queryFn: () => load({ data: { id } }) });

  type ScheduleRow = {
    kind: "single" | "range";
    start_date: string | null;
    end_date: string | null;
    send_time: string | null;
    weekdays: number[] | null;
  };
  type AttachRow = { id: string; filename: string; size_bytes: number };
  type ReminderRow = {
    id: string;
    title: string | null;
    to_emails: string[] | null;
    cc_emails: string[] | null;
    bcc_emails: string[] | null;
    subject: string | null;
    body: string | null;
    smtp_profile_id: string | null;
    enabled: boolean | null;
    timezone: string | null;
    reminder_schedules?: ScheduleRow[];
    reminder_attachments?: AttachRow[];
  };
  const data = query.data as ReminderRow | null | undefined;

  return (
    <AppShell>
      <h1 className="text-2xl font-semibold sm:text-3xl">Ubah reminder</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Perbarui isi pesan, jadwal, atau lampiran.
      </p>

      {query.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">Reminder tidak ditemukan.</p>
      ) : (
        <ReminderForm
          initial={
            {
              ...emptyReminder,
              id: data.id,
              title: data.title ?? "",
              to_emails: (data.to_emails ?? []).join(", "),
              cc_emails: (data.cc_emails ?? []).join(", "),
              bcc_emails: (data.bcc_emails ?? []).join(", "),
              subject: data.subject ?? "",
              body: data.body ?? "",
              smtp_profile_id: data.smtp_profile_id ?? null,
              enabled: !!data.enabled,
              timezone: data.timezone ?? "Asia/Jakarta",
              schedules: (data.reminder_schedules ?? []).map((s: ScheduleRow) => ({
                kind: s.kind,
                start_date: s.start_date ?? "",
                end_date: s.end_date ?? "",
                send_time: (s.send_time ?? "08:00:00").slice(0, 5),
                weekdays: s.weekdays ?? [],
              })),
              attachments: (data.reminder_attachments ?? []).map((a: AttachRow) => ({
                id: a.id,
                filename: a.filename,
                size_bytes: a.size_bytes,
              })),
            } satisfies ReminderFormValues
          }
        />
      )}
    </AppShell>
  );
}
