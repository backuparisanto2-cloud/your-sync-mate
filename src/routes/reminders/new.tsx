import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ReminderForm, emptyReminder } from "@/components/ReminderForm";

export const Route = createFileRoute("/reminders/new")({
  head: () => ({
    meta: [
      { title: "Buat Reminder Email Baru — Reminder Mail" },
      {
        name: "description",
        content:
          "Buat pengingat email baru: tentukan penerima, subjek, isi pesan, periode tanggal, jam kirim, dan lampiran.",
      },
      { property: "og:title", content: "Buat Reminder Email Baru — Reminder Mail" },
      {
        property: "og:description",
        content: "Atur penerima, periode tanggal, jam kirim, dan lampiran untuk pengingat email.",
      },
    ],
  }),
  component: NewReminder,
});

function NewReminder() {
  return (
    <AppShell>
      <h1 className="text-2xl font-semibold sm:text-3xl">Reminder baru</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Tentukan isi pesan dan periode pengirimannya.
      </p>
      <ReminderForm initial={emptyReminder} />
    </AppShell>
  );
}
