/**
 * Entry point for the static (SPA) export build.
 *
 * The same routes/components are mounted purely on the client, so the output
 * can be hosted on any plain web hosting while the database, auth, and storage
 * stay on Lovable Cloud.
 *
 * The bundle is location-agnostic: assets use relative paths and the router
 * basepath is derived at runtime, so the package works when uploaded to the
 * domain root, a subfolder (public_html/app), or a subdomain.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "../src/styles.css";
import { getRouter } from "../src/router";

/** Folder the app was uploaded to, e.g. "/" or "/app". */
function detectBasepath(): string {
  // import.meta.url points at the built bundle (…/app/assets/index-xxxx.js)
  try {
    const url = new URL(import.meta.url);
    const dir = url.pathname.replace(/\/assets\/[^/]*$/, "").replace(/\/$/, "");
    if (dir && url.origin === window.location.origin) return dir || "/";
  } catch {
    /* fall through */
  }
  const base = document.querySelector("base")?.getAttribute("href");
  if (base && base !== "./") return base.replace(/\/$/, "") || "/";
  return "/";
}

const basepath = detectBasepath();
const router = getRouter(basepath === "/" ? undefined : { basepath });

const rootEl = document.getElementById("root");
if (rootEl) {
  // The bundle executed: hide the "gagal memuat" fallback in index.html.
  document.documentElement.setAttribute("data-app-loaded", "true");
  createRoot(rootEl).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
