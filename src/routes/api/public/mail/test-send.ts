import { createFileRoute } from "@tanstack/react-router";
import { corsHeaders, requireUser } from "@/lib/mail-api.server";

export const Route = createFileRoute("/api/public/mail/test-send")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders() }),
      POST: async ({ request }) => {
        const user = await requireUser(request);
        if (!user) {
          return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders() });
        }
        const body = (await request.json().catch(() => ({}))) as { id?: string; to?: string };
        if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) {
          return Response.json({ error: "id tidak valid" }, { status: 400, headers: corsHeaders() });
        }
        if (!body.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.to)) {
          return Response.json(
            { error: "Alamat email tujuan tidak valid" },
            { status: 400, headers: corsHeaders() },
          );
        }
        const { sendSmtpTestEmail } = await import("@/lib/mailer.server");
        const result = await sendSmtpTestEmail(body.id, body.to);
        return Response.json(result, { headers: corsHeaders() });
      },
    },
  },
});
