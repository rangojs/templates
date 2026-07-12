// End-to-end packaging test: pack create-rango, install the tarball into a
// standalone temp project (npm, outside the workspace), scaffold every
// template FROM THE INSTALLED BIN, then npm-install and build each scaffold.
// This is the only test that exercises what consumers actually download —
// bin wiring, bundled templates, packaged layout selection.
//
// Also asserts the vercel scaffold emits the Node 24 function runtime in
// .vercel/output (the preset default is nodejs22.x; the template pins it).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const pkgDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-rango-pack-"));
const cleanup = () => fs.rmSync(workDir, { recursive: true, force: true });
process.once("exit", cleanup);
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, {
    stdio: "pipe",
    encoding: "utf8",
    shell: process.platform === "win32" && cmd.endsWith(".cmd"),
    ...opts,
  });

// 1. Pack (prepack syncs templates in; postpack cleans the snapshot up).
// Plant local credential files in a template first: the sync filter must keep
// them out of the tarball (a checkout's _gitignore does not protect cpSync).
const tarball = path.join(workDir, "create-rango.tgz");
const secretDir = path.join(pkgDir, "../../templates/cloudflare");
const secretNames = [
  `.dev.vars.create-rango-pack-${process.pid}`,
  `.env.create-rango-pack-${process.pid}`,
];
const plantedSecrets = secretNames.map((file) => path.join(secretDir, file));
try {
  for (const file of plantedSecrets) {
    assert.equal(
      fs.existsSync(file),
      false,
      `test fixture already exists: ${file}`,
    );
    fs.writeFileSync(file, "SECRET=1\n");
  }
  run(npmCommand, ["pack", "--pack-destination", workDir], { cwd: pkgDir });
} finally {
  for (const file of plantedSecrets) fs.rmSync(file, { force: true });
}
const packed = fs.readdirSync(workDir).find((f) => f.endsWith(".tgz"));
fs.renameSync(path.join(workDir, packed), tarball);
const tarList = run("tar", ["-tzf", tarball]);
assert.ok(
  !/\/\.(env|dev\.vars)/.test(tarList),
  "tarball contains local secret files",
);

// 2. Install into a standalone project.
const host = path.join(workDir, "host");
fs.mkdirSync(host);
fs.writeFileSync(
  path.join(host, "package.json"),
  JSON.stringify({ name: "host", private: true }),
);
run(npmCommand, ["install", tarball], { cwd: host });
const bin = path.join(
  host,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "create-rango.cmd" : "create-rango",
);
assert.ok(fs.existsSync(bin), "installed bin missing");

// 3. Scaffold every template from the installed bin, then install + build.
const cases = [
  { template: "basic", flags: [], router: "src/router.tsx" },
  { template: "basic", flags: ["--js"], router: "src/router.jsx" },
  { template: "cloudflare", flags: [], router: "src/router.tsx" },
  { template: "vercel", flags: [], router: "src/router.tsx" },
];

for (const { template, flags, router } of cases) {
  const label = template + (flags.includes("--js") ? "-js" : "");
  const appDir = path.join(workDir, `app-${label}`);
  run(
    npmCommand,
    ["exec", "--", "create-rango", appDir, "--template", template, ...flags],
    { cwd: host },
  );

  if (label === "basic") {
    fs.mkdirSync(path.join(appDir, "public/assets"), { recursive: true });
    fs.writeFileSync(path.join(appDir, "public/robots.txt"), "User-agent: *\n");
    fs.writeFileSync(path.join(appDir, "public/assets/logo.svg"), "<svg/>\n");
  }

  for (const file of [
    ".oxfmtrc.json",
    ".oxlintrc.json",
    "package.json",
    ".gitignore",
    router,
    "src/router.gen.ts",
    "src/router.named-routes.gen.ts",
    "README.md",
  ]) {
    assert.ok(
      fs.existsSync(path.join(appDir, file)),
      `${label}: missing ${file}`,
    );
  }
  assert.ok(
    !fs.existsSync(path.join(appDir, "node_modules")),
    `${label}: scaffolded node_modules`,
  );

  run(npmCommand, ["install", "--no-audit", "--no-fund"], { cwd: appDir });
  run(npmCommand, ["run", "check"], { cwd: appDir });
  run(npmCommand, ["run", "build"], { cwd: appDir });
  assert.ok(
    fs.existsSync(path.join(appDir, "dist/client")),
    `${label}: build produced no dist/client`,
  );
  console.log(`pack-smoke: ${label} scaffold+install+build ok`);
}

// 4. Vercel runtime pin: the emitted function must target Node 24.
const vcConfig = JSON.parse(
  fs.readFileSync(
    path.join(
      workDir,
      "app-vercel/.vercel/output/functions/index.func/.vc-config.json",
    ),
    "utf8",
  ),
);
assert.equal(vcConfig.runtime, "nodejs24.x", "vercel function runtime");
console.log("pack-smoke: vercel runtime nodejs24.x ok");

// 5. The basic scaffold's production server must actually serve.
const basicDir = path.join(workDir, "app-basic");
const { spawn } = await import("node:child_process");
const server = spawn(process.execPath, ["server.mjs"], {
  cwd: basicDir,
  env: { ...process.env, PORT: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});
const port = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    server.kill("SIGKILL");
    reject(new Error("server boot timeout"));
  }, 30000);
  server.stdout.on("data", (chunk) => {
    const m = String(chunk).match(/localhost:(\d+)/);
    if (m) {
      clearTimeout(timer);
      resolve(Number(m[1]));
    }
  });
  server.on("exit", (code) => reject(new Error(`server exited ${code}`)));
});
try {
  const res = await fetch(`http://localhost:${port}/hello/pack`, {
    headers: { accept: "text/html" },
  });
  assert.equal(res.status, 200, "production server route status");
  const html = await res.text();
  assert.match(html, /Hello/, "production server route body");

  const counter = await fetch(`http://localhost:${port}/counter`, {
    headers: { accept: "text/html" },
  });
  const counterHtml = await counter.text();
  assert.match(counterHtml, /<form[^>]+action=/, "counter has a form action");
  assert.match(
    counterHtml,
    /name="delta"/,
    "counter submits a validated delta",
  );

  const assetPath = html.match(/\/assets\/[A-Za-z0-9._-]+\.js/)?.[0];
  assert.ok(assetPath, "production page references a hashed asset");
  const asset = await fetch(`http://localhost:${port}${assetPath}`);
  assert.match(
    asset.headers.get("cache-control") ?? "",
    /immutable/,
    "hashed assets are immutable",
  );

  const publicFile = await fetch(`http://localhost:${port}/robots.txt`);
  assert.doesNotMatch(
    publicFile.headers.get("cache-control") ?? "",
    /immutable/,
    "public files remain revalidatable",
  );
  const publicAsset = await fetch(`http://localhost:${port}/assets/logo.svg`);
  assert.doesNotMatch(
    publicAsset.headers.get("cache-control") ?? "",
    /immutable/,
    "unhashed public assets remain revalidatable",
  );
  console.log("pack-smoke: basic production server ok");
} finally {
  if (server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise((resolve) => server.once("exit", resolve)),
      new Promise((resolve) => {
        const timer = setTimeout(() => {
          server.kill("SIGKILL");
          resolve();
        }, 10_000);
        timer.unref();
      }),
    ]);
  }
}

cleanup();
console.log("pack-smoke ok");
