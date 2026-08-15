import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, requireUser } from "@/lib/mail-api.server";

export const Route = createFileRoute("/api/public/mail/send")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) {
          return Response.json(
            { error: "Unauthorized" },
            { status: 401, headers: corsHeaders() },
          );
        }
        const body = (await request.json().catch(() => ({}))) as { id?: string };
        if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) {
          return Response.json({ error: "id tidak valid" }, { status: 400, headers: corsHeaders() });
        }
        const { sendReminder } = await import("@/lib/mailer.server");
        const result = await sendReminder(body.id, { source: "manual" });
        return Response.json(result, { headers: corsHeaders() });
      },
    },
  },
});
