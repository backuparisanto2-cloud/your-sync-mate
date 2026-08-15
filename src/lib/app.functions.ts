/**
 * Data layer for the static (SPA) build.
 *
 * All reads/writes go straight from the browser to Lovable Cloud using the
 * signed-in admin session (RLS: authenticated only). Only SMTP delivery runs on
 * the backend, because it needs raw TCP sockets — see src/lib/backend.ts.
 */
import { supabase } from "@/integrations/supabase/client";
import { occurrencesFor, type ScheduleRow } from "./schedule";
import { callBackend } from "./backend";

/** Identity helper so page components keep the same call style as before. */
export function useServerFn<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}

export type SmtpInput = {
  id?: string | null | undefined;
  name: string;
  host: string;
  port: number;
  tls: boolean;
  from_email: string;
  from_name?: string | null | undefined;
  username: string;
  password?: string | null | undefined;
  verify_cert: boolean;
};

export type ReminderInput = {
  id?: string | null | undefined;
  title: string;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  subject: string;
  body: string;
  smtp_profile_id: string | null;
  enabled: boolean;
  timezone: string;
  schedules: {
    kind: "single" | "range";
    start_date: string | null;
    end_date: string | null;
    send_time: string;
    weekdays: number[];
  }[];
};

const SMTP_PUBLIC_COLUMNS =
  "id, name, host, port, tls, from_email, from_name, username, verify_cert, last_status, last_tested_at, created_at";

function unwrap<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export async function fetchReminders() {
  const data = unwrap(
    await supabase
      .from("reminders")
      .select("*, reminder_schedules(*), reminder_attachments(id, filename), smtp_profiles(name)")
      .order("created_at", { ascending: false }),
  );

  const now = Date.now();
  return (data ?? []).map((reminder) => {
    const schedules = (reminder.reminder_schedules ?? []) as ScheduleRow[];
    const upcoming = occurrencesFor(schedules, reminder.timezone ?? "Asia/Jakarta").find(
      (d) => d.getTime() > now,
    );
    return {
      ...reminder,
      next_run: upcoming ? upcoming.toISOString() : null,
      schedule_count: schedules.length,
      attachment_count: (reminder.reminder_attachments ?? []).length,
      smtp_name: (reminder.smtp_profiles as { name: string } | null)?.name ?? null,
    };
  });
}

export async function fetchLogs(limit = 200) {
  return (
    unwrap(
      await supabase
        .from("send_logs")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(limit),
    ) ?? []
  );
}

export async function fetchDashboard() {
  const reminders = await fetchReminders();
  const logs = await fetchLogs(50);
  return {
    total: reminders.length,
    active: reminders.filter((r) => r.enabled).length,
    nextRun:
      reminders
        .map((r) => r.next_run)
        .filter(Boolean)
        .sort()[0] ?? null,
    successCount: logs.filter((l) => l.status === "success").length,
    failedCount: logs.filter((l) => l.status === "failed").length,
  };
}

export async function fetchReminder({ data }: { data: { id: string } }) {
  return unwrap(
    await supabase
      .from("reminders")
      .select("*, reminder_schedules(*), reminder_attachments(*)")
      .eq("id", data.id)
      .maybeSingle(),
  );
}

export async function upsertReminder({ data: input }: { data: ReminderInput }) {
  const payload = {
    title: input.title,
    to_emails: input.to_emails,
    cc_emails: input.cc_emails,
    bcc_emails: input.bcc_emails,
    subject: input.subject,
    body: input.body,
    smtp_profile_id: input.smtp_profile_id,
    enabled: input.enabled,
    timezone: input.timezone,
  };

  let reminderId = input.id ?? null;
  if (reminderId) {
    unwrap(await supabase.from("reminders").update(payload).eq("id", reminderId).select("id"));
  } else {
    const row = unwrap(await supabase.from("reminders").insert(payload).select("id").single());
    reminderId = row!.id;
  }

  unwrap(await supabase.from("reminder_schedules").delete().eq("reminder_id", reminderId!).select("id"));
  if (input.schedules.length) {
    unwrap(
      await supabase
        .from("reminder_schedules")
        .insert(
          input.schedules.map((s) => ({
            reminder_id: reminderId!,
            kind: s.kind,
            start_date: s.start_date,
            end_date: s.kind === "range" ? s.end_date : null,
            send_time: s.send_time,
            weekdays: s.weekdays,
          })),
        )
        .select("id"),
    );
  }
  return { id: reminderId! };
}

export async function removeReminder({ data }: { data: { id: string } }) {
  const files = unwrap(
    await supabase.from("reminder_attachments").select("path").eq("reminder_id", data.id),
  );
  if (files?.length) {
    await supabase.storage.from("attachments").remove(files.map((f) => f.path));
  }
  unwrap(await supabase.from("reminders").delete().eq("id", data.id).select("id"));
  return { ok: true };
}

export async function setReminderEnabled({ data }: { data: { id: string; enabled: boolean } }) {
  unwrap(
    await supabase.from("reminders").update({ enabled: data.enabled }).eq("id", data.id).select("id"),
  );
  return { ok: true };
}

export async function fetchSmtpProfiles() {
  return (
    unwrap(
      await supabase
        .from("smtp_profiles")
        .select(SMTP_PUBLIC_COLUMNS)
        .order("created_at", { ascending: true }),
    ) ?? []
  );
}

export async function upsertSmtpProfile({ data: input }: { data: SmtpInput }) {
  const payload = {
    name: input.name,
    host: input.host,
    port: input.port,
    tls: input.tls,
    from_email: input.from_email,
    from_name: input.from_name ?? null,
    username: input.username,
    verify_cert: input.verify_cert,
    ...(input.password ? { password: input.password } : {}),
  };

  if (input.id) {
    unwrap(await supabase.from("smtp_profiles").update(payload).eq("id", input.id).select("id"));
    return { id: input.id };
  }
  const row = unwrap(
    await supabase
      .from("smtp_profiles")
      .insert({ ...payload, password: input.password ?? "" })
      .select("id")
      .single(),
  );
  return { id: row!.id };
}

export async function removeSmtpProfile({ data }: { data: { id: string } }) {
  unwrap(await supabase.from("smtp_profiles").delete().eq("id", data.id).select("id"));
  return { ok: true };
}

export async function requestUploadTicket({
  data,
}: {
  data: { reminderId: string; filename: string };
}) {
  const safe = data.filename.replace(/[^\w.\- ]+/g, "_");
  const path = `${data.reminderId}/${crypto.randomUUID()}-${safe}`;
  const res = await supabase.storage.from("attachments").createSignedUploadUrl(path);
  if (res.error) throw new Error(res.error.message);
  return { path, token: res.data.token };
}

export async function saveAttachment({
  data,
}: {
  data: {
    reminder_id: string;
    path: string;
    filename: string;
    size_bytes: number;
    mime_type: string;
  };
}) {
  return unwrap(await supabase.from("reminder_attachments").insert(data).select("*").single());
}

export async function deleteAttachment({ data }: { data: { id: string } }) {
  const row = unwrap(
    await supabase.from("reminder_attachments").select("path").eq("id", data.id).maybeSingle(),
  );
  if (row?.path) await supabase.storage.from("attachments").remove([row.path]);
  unwrap(await supabase.from("reminder_attachments").delete().eq("id", data.id).select("id"));
  return { ok: true };
}

/* ---- SMTP delivery (runs on the Lovable Cloud backend) ---- */

export async function sendReminderNow({ data }: { data: { id: string } }) {
  return callBackend<{ ok: boolean; error?: string }>("/api/public/mail/send", { id: data.id });
}

export async function testSmtpProfile({ data }: { data: { id: string } }) {
  return callBackend<{ status: string }>("/api/public/mail/test", { id: data.id });
}

export async function sendSmtpTestEmail({ data }: { data: { id: string; to: string } }) {
  return callBackend<{ status: string; error: string | null }>("/api/public/mail/test-send", {
    id: data.id,
    to: data.to,
  });
}
