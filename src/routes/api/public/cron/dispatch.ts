import { createFileRoute } from "@tanstack/react-router";

async function run() {
  const { dispatchDue } = await import("@/lib/mailer.server");
  const result = await dispatchDue();
  return Response.json({ ok: true, ...result });
}

export const Route = createFileRoute("/api/public/cron/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!expected || key !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        return run();
      },
    },
  },
});
