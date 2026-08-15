import { supabase } from "@/integrations/supabase/client";

/**
 * SMTP delivery needs raw TCP sockets, so it stays on the Lovable Cloud backend
 * even when the UI is hosted as static files on ordinary web hosting.
 *
 * Set VITE_BACKEND_URL at build time to point at your own backend URL; when it
 * is absent the app uses the published Lovable URL (same origin while running
 * inside Lovable).
 */
const FALLBACK_BACKEND = "https://project--b89ddb8e-5190-460d-b64a-d3fdb7ee59cc.lovable.app";

export function backendUrl(): string {
  const configured = import.meta.env["VITE_BACKEND_URL"] as string | undefined;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.hostname.endsWith("lovable.app")) {
    return window.location.origin;
  }
  return FALLBACK_BACKEND;
}

export async function callBackend<T>(path: string, body: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sesi login berakhir, silakan masuk kembali.");

  const res = await fetch(`${backendUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Backend error ${res.status}`);
  return json;
}
