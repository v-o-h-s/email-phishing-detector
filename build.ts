#!/usr/bin/env bun
/**
 * build.ts — Bundles all extension entry points into dist/
 *
 * Chrome extensions cannot use ES module imports at runtime, so every
 * JS entry point is bundled into a self-contained IIFE file.
 * CSS is processed separately via PostCSS + @tailwindcss/postcss.
 *
 * Output structure (dist/):
 *   dist/
 *   ├── manifest.json
 *   ├── popup.html
 *   ├── popup.js          ← React popup (IIFE)
 *   ├── popup.css         ← Tailwind CSS (via PostCSS)
 *   ├── content.js        ← Content script (IIFE)
 *   ├── background.js     ← Service worker (IIFE)
 *   ├── site.js           ← Website app (IIFE)
 *   ├── site.css          ← Website styles (Tailwind)
 *   ├── site.html         ← Website shell
 *   └── icons/            ← Copied from public/icons/
 */

import { copyFileSync, cpSync, mkdirSync, existsSync, statSync, rmSync } from "fs";
import { join } from "path";

const ROOT   = import.meta.dir;
const SRC    = join(ROOT, "src");
const PUBLIC = join(ROOT, "public");
const OUT    = join(ROOT, "dist");

const isProd = process.env.NODE_ENV === "production";

function ensureDirectory(path: string): void {
  if (existsSync(path)) {
    const stat = statSync(path);
    if (stat.isDirectory()) return;
    // If a file exists at dist path, replace it with a directory.
    rmSync(path, { force: true });
  }
  try {
    mkdirSync(path, { recursive: true });
  } catch (error) {
    // Defensive fallback for occasional Windows/OneDrive EEXIST races.
    if (existsSync(path) && statSync(path).isDirectory()) return;
    throw error;
  }
}

// ── 1. Create dist dir ───────────────────────────────────────────────────────
ensureDirectory(OUT);

console.log("Building extension…");

// ── 2. Bundle JS entry points (IIFE, no CSS) ────────────────────────────────
const jsEntryPoints: Array<{ entrypoint: string; outFile: string }> = [
  { entrypoint: join(SRC, "popup",      "index.tsx"),  outFile: "popup.js"      },
  { entrypoint: join(SRC, "content",    "index.ts"),   outFile: "content.js"    },
  { entrypoint: join(SRC, "background", "index.ts"),   outFile: "background.js" },
  { entrypoint: join(SRC, "site",       "index.tsx"),  outFile: "site.js"       },
];

const jsResults = await Promise.all(
  jsEntryPoints.map(({ entrypoint, outFile }) =>
    Bun.build({
      entrypoints: [entrypoint],
      outdir: OUT,
      naming: outFile,
      target: "browser",
      format: "iife",
      minify: isProd,
      sourcemap: isProd ? "none" : "inline",
      // Tell Bun to treat CSS imports as external — PostCSS handles them
      plugins: [
        {
          name: "ignore-css",
          setup(build) {
            build.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "js" }));
          },
        },
      ],
    })
  )
);

let hasErrors = false;
for (const result of jsResults) {
  if (!result.success) {
    hasErrors = true;
    for (const log of result.logs) console.error(log.message);
  }
}

// ── 3. Bundle CSS via PostCSS (Tailwind v4) ──────────────────────────────────
console.log("Processing CSS…");

const cssResult = Bun.spawnSync(
  [
    "bunx", "postcss",
    join(SRC, "popup", "index.css"),
    "--output", join(OUT, "popup.css"),
    ...(isProd ? ["--no-map"] : []),
  ],
  { stdout: "inherit", stderr: "inherit" }
);

if (cssResult.exitCode !== 0) {
  console.error("CSS build failed.");
  hasErrors = true;
}

const siteCssResult = Bun.spawnSync(
  [
    "bunx", "postcss",
    join(SRC, "site", "index.css"),
    "--output", join(OUT, "site.css"),
    ...(isProd ? ["--no-map"] : []),
  ],
  { stdout: "inherit", stderr: "inherit" }
);

if (siteCssResult.exitCode !== 0) {
  console.error("Site CSS build failed.");
  hasErrors = true;
}

if (hasErrors) {
  console.error("Build failed.");
  process.exit(1);
}

// ── 4. Copy static assets ────────────────────────────────────────────────────
copyFileSync(join(PUBLIC, "manifest.json"), join(OUT, "manifest.json"));
copyFileSync(join(PUBLIC, "popup.html"),    join(OUT, "popup.html"));
const siteHtmlPath = join(PUBLIC, "site.html");
if (existsSync(siteHtmlPath)) {
  copyFileSync(siteHtmlPath, join(OUT, "site.html"));
} else {
  console.warn("[build] public/site.html not found, skipping site.html copy.");
}

const iconsDir = join(PUBLIC, "icons");
if (existsSync(iconsDir)) {
  const outIconsDir = join(OUT, "icons");
  if (existsSync(outIconsDir)) {
    rmSync(outIconsDir, { recursive: true, force: true });
  }
  cpSync(iconsDir, outIconsDir, { recursive: true });
}

console.log("Done! Extension ready in: dist/");
