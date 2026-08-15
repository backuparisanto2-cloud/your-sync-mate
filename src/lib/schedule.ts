export type ScheduleRow = {
  id?: string;
  kind: string;
  start_date: string | null;
  end_date: string | null;
  send_time: string;
  weekdays: number[];
};

/** Convert a wall-clock date/time in a named timezone to a UTC Date. */
export function zonedToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const asUtc = Date.UTC(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date(asUtc)).map((p) => [p.type, p.value]));
  const local = Date.UTC(
    Number(parts["year"]),
    Number(parts["month"]) - 1,
    Number(parts["day"]),
    Number(parts["hour"]) % 24,
    Number(parts["minute"]),
    Number(parts["second"]),
  );
  return new Date(asUtc - (local - asUtc));
}

function eachDate(start: string, end: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  let guard = 0;
  while (cur <= last && guard++ < 1500) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function occurrencesFor(schedules: ScheduleRow[], timeZone: string): Date[] {
  const out: Date[] = [];
  for (const s of schedules) {
    const time = (s.send_time ?? "09:00").slice(0, 5);
    if (!s.start_date) continue;
    if (s.kind === "range" && s.end_date) {
      for (const day of eachDate(s.start_date, s.end_date)) {
        const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
        if (!s.weekdays?.length || s.weekdays.includes(dow)) {
          out.push(zonedToUtc(day, time, timeZone));
        }
      }
    } else {
      out.push(zonedToUtc(s.start_date, time, timeZone));
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}
