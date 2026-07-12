// Sync ../../templates into ./templates so the published tarball is
// self-contained. Runs on prepack; ./templates is gitignored.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const source = path.join(pkgDir, "../../templates");
const target = path.join(pkgDir, "templates");

// postpack: drop the snapshot so the repo tree never carries a stale copy.
if (process.argv.includes("--clean")) {
  fs.rmSync(target, { recursive: true, force: true });
  process.exit(0);
}

// Local install/build artifacts that must never ship in the tarball.
const EXCLUDED = new Set([
  "node_modules",
  "dist",
  ".wrangler",
  ".vercel",
  ".vite",
  ".turbo",
]);

// Local credential files (wrangler `.dev.vars`, dotenv). A template's
// _gitignore does not affect cpSync, so a checkout with local secrets would
// otherwise publish them.
function isSecretFile(basename) {
  return basename.startsWith(".env") || basename.startsWith(".dev.vars");
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, {
  recursive: true,
  filter: (src) => {
    const base = path.basename(src);
    return !EXCLUDED.has(base) && !isSecretFile(base);
  },
});

const count = fs
  .readdirSync(target, { withFileTypes: true })
  .filter((e) => e.isDirectory()).length;
if (count === 0) {
  console.error("[sync-templates] no templates copied");
  process.exit(1);
}
console.log(`[sync-templates] synced ${count} templates`);
