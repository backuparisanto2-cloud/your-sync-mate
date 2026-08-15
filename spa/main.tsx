/**
 * Entry point for the static (SPA) export build.
 *
 * The same routes/components are mounted purely on the client, so the output
 * can be hosted on any plain web hosting while the database, auth, and storage
 * stay on Lovable Cloud.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";

import "../src/styles.css";
import { getRouter } from "../src/router";

const router = getRouter();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
