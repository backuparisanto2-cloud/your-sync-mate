import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const srcDir = fileURLToPath(new URL("../src", import.meta.url));

/**
 * Ganti modul server-only (SMTP, mailer, helper API) dengan stub yang melempar
 * error jika dipanggil, supaya kode backend tidak ikut terbundel ke paket statis
 * tanpa merusak impor bernama yang ada di rute API.
 */
const stubServerModules = {
  name: "stub-server-modules",
  enforce: "pre" as const,
  resolveId(source: string, importer?: string) {
    if (!/\.server(\.tsx?)?$/.test(source)) return null;
    const withoutAlias = source.startsWith("@/")
      ? resolvePath(srcDir, source.slice(2))
      : resolvePath(importer ? resolvePath(importer, "..") : srcDir, source);
    return `\0server-stub:${withoutAlias}`;
  },
  load(id: string) {
    if (!id.startsWith("\0server-stub:")) return null;
    const base = id.slice("\0server-stub:".length);
    let source = "";
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`]) {
      try {
        source = readFileSync(candidate, "utf8");
        break;
      } catch {
        /* coba kandidat berikutnya */
      }
    }
    const names = new Set<string>();
    for (const match of source.matchAll(
      /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z0-9_$]+)/g,
    )) {
      names.add(match[1]!);
    }
    const throwing = `() => { throw new Error("Modul server tidak tersedia pada build statis"); }`;
    return [
      "export default {};",
      ...[...names].map((name) => `export const ${name} = ${throwing};`),
    ].join("\n");
  },
};


/** Plain SPA build used by `npm run export:static` — no SSR, no worker. */
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: false,
  envDir: projectRoot,
  plugins: [stubServerModules, tailwindcss(), react()],

  resolve: {
    alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-query"],
  },
  build: {
    outDir: fileURLToPath(new URL("../.static-export/site", import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
});
