// Scaffold every template into a temp dir and assert the output shape:
// files copied, _gitignore renamed, package.json / wrangler.json renamed.
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const pkgDir = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(pkgDir, "../index.js");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "create-rango-smoke-"));

// Keep the shape assertions below off the network; the latest-resolution
// cases at the bottom exercise the registry path against local endpoints.
process.env.CREATE_RANGO_SKIP_LATEST = "1";

const cases = [
  ["basic", []],
  ["basic-js", ["--js"]],
  ["cloudflare", []],
  ["vercel", []],
];

for (const [templateName, extraFlags] of cases) {
  const base = templateName.replace(/-js$/, "");
  const appDir = path.join(workDir, `app-${templateName}`);
  execFileSync(
    process.execPath,
    [cli, appDir, "--template", base, ...extraFlags],
    { stdio: "pipe" },
  );

  const isJs = templateName.endsWith("-js");
  const routerFile = isJs ? "src/router.jsx" : "src/router.tsx";
  const testExtension = isJs ? "js" : "ts";
  for (const file of [
    ".oxfmtrc.json",
    ".oxlintrc.json",
    "package.json",
    ".gitignore",
    routerFile,
    "src/styles.css",
    "src/router.gen.ts",
    "src/router.named-routes.gen.ts",
    `test/router.test.${testExtension}`,
    `vitest.config.${testExtension}`,
    "README.md",
  ]) {
    assert.ok(
      fs.existsSync(path.join(appDir, file)),
      `${templateName}: missing ${file}`,
    );
  }
  if (base === "basic") {
    assert.ok(
      fs.existsSync(path.join(appDir, "server.mjs")),
      `${templateName}: missing production server`,
    );
  }
  if (base === "vercel") {
    assert.ok(
      fs.existsSync(path.join(appDir, "scripts/preview.mjs")),
      `${templateName}: missing Vercel preview server`,
    );
  }
  assert.ok(
    !fs.existsSync(path.join(appDir, "_gitignore")),
    `${templateName}: _gitignore not renamed`,
  );
  for (const artifact of ["node_modules", "dist", ".wrangler", ".vercel"]) {
    assert.ok(
      !fs.existsSync(path.join(appDir, artifact)),
      `${templateName}: install/build artifact ${artifact} was scaffolded`,
    );
  }

  const pkg = JSON.parse(
    fs.readFileSync(path.join(appDir, "package.json"), "utf8"),
  );
  assert.equal(
    pkg.name,
    `app-${templateName}`,
    `${templateName}: name rewrite`,
  );
  assert.equal(
    pkg.dependencies["@rangojs/router"].startsWith("workspace:"),
    false,
    `${templateName}: workspace protocol leaked`,
  );

  if (base === "cloudflare") {
    const wrangler = JSON.parse(
      fs.readFileSync(path.join(appDir, "wrangler.json"), "utf8"),
    );
    assert.equal(
      wrangler.name,
      `app-${templateName}`,
      `${templateName}: wrangler name rewrite`,
    );
  }
  if (!isJs) {
    assert.ok(
      fs.existsSync(path.join(appDir, "tsconfig.json")),
      `${templateName}: missing tsconfig.json`,
    );
  } else {
    assert.ok(
      !fs.existsSync(path.join(appDir, "tsconfig.json")),
      `${templateName}: unexpected tsconfig.json`,
    );
  }
}

// Worker names are sanitized separately from npm package names: Cloudflare
// allows only [a-z0-9-].
const oddDir = path.join(workDir, "My_App.v2~x");
execFileSync(process.execPath, [cli, oddDir, "--template", "cloudflare"], {
  stdio: "pipe",
});
const oddPkg = JSON.parse(
  fs.readFileSync(path.join(oddDir, "package.json"), "utf8"),
);
assert.equal(oddPkg.name, "my_app.v2~x", "npm name keeps _ . ~");
const oddWrangler = JSON.parse(
  fs.readFileSync(path.join(oddDir, "wrangler.json"), "utf8"),
);
assert.equal(oddWrangler.name, "my-app-v2-x", "worker name is [a-z0-9-] only");

// Awkward-but-valid directory names: leading dash must not leak into the
// package name or produce an option-like `cd`; reserved/overlong names fall
// back to a safe default.
const dashDir = path.join(workDir, "-app");
const dashOut = execFileSync(
  process.execPath,
  [cli, "./-app", "--template", "basic"],
  { stdio: "pipe", encoding: "utf8", cwd: workDir },
);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(dashDir, "package.json"), "utf8")).name,
  "app",
  "leading dash stripped from package name",
);
assert.match(
  dashOut,
  /cd \.\/-app/,
  "cd step anchors leading-dash dir with ./",
);

const tildeOut = execFileSync(
  process.execPath,
  [cli, "./~", "--template", "basic"],
  { stdio: "pipe", encoding: "utf8", cwd: workDir },
);
assert.match(tildeOut, /cd '\.\/~'/, "cd step prevents tilde expansion");

const reservedDir = path.join(workDir, "node_modules");
execFileSync(process.execPath, [cli, reservedDir, "--template", "basic"], {
  stdio: "pipe",
});
assert.equal(
  JSON.parse(fs.readFileSync(path.join(reservedDir, "package.json"), "utf8"))
    .name,
  "rango-app",
  "reserved npm name falls back",
);

const longDir = path.join(workDir, "x".repeat(240));
execFileSync(process.execPath, [cli, longDir, "--template", "basic"], {
  stdio: "pipe",
});
const longName = JSON.parse(
  fs.readFileSync(path.join(longDir, "package.json"), "utf8"),
).name;
assert.ok(longName.length <= 214, "package name capped at 214 chars");

// Local secret files in a template checkout must never be scaffolded.
const secretSrc = path.join(pkgDir, "../../../templates/cloudflare");
const secretNames = [
  `.dev.vars.create-rango-smoke-${process.pid}`,
  `.env.create-rango-smoke-${process.pid}`,
];
const planted = secretNames.map((file) => path.join(secretSrc, file));
try {
  for (const file of planted) {
    assert.equal(
      fs.existsSync(file),
      false,
      `test fixture already exists: ${file}`,
    );
    fs.writeFileSync(file, "SECRET=1\n");
  }
  const secretApp = path.join(workDir, "secret-check");
  execFileSync(process.execPath, [cli, secretApp, "--template", "cloudflare"], {
    stdio: "pipe",
  });
  for (const file of secretNames) {
    assert.ok(
      !fs.existsSync(path.join(secretApp, file)),
      `secret file ${file} was scaffolded`,
    );
  }
} finally {
  for (const file of planted) fs.rmSync(file, { force: true });
}

// The CLI advertises next steps for each supported package manager.
for (const [manager, userAgent, devCommand] of [
  ["npm", "npm/11.0.0", "npm run dev"],
  ["pnpm", "pnpm/11.0.0", "pnpm dev"],
]) {
  const managerDir = path.join(workDir, `manager-${manager}`);
  const output = execFileSync(
    process.execPath,
    [cli, managerDir, "--template", "basic"],
    {
      stdio: "pipe",
      encoding: "utf8",
      env: { ...process.env, npm_config_user_agent: userAgent },
    },
  );
  assert.match(output, new RegExp(`${manager} install`));
  assert.match(output, new RegExp(devCommand));
}

const managerOverrideDir = path.join(workDir, "manager-override");
const managerOverrideOutput = execFileSync(
  process.execPath,
  [cli, managerOverrideDir, "--template", "basic", "--package-manager", "pnpm"],
  {
    stdio: "pipe",
    encoding: "utf8",
    env: { ...process.env, npm_config_user_agent: "npm/11.0.0" },
  },
);
assert.match(managerOverrideOutput, /pnpm install/);
assert.match(managerOverrideOutput, /pnpm dev/);

assert.throws(() =>
  execFileSync(
    process.execPath,
    [
      cli,
      path.join(workDir, "bad-manager"),
      "--template",
      "basic",
      "--package-manager",
      "yarn",
    ],
    { stdio: "pipe" },
  ),
);

// JS flavor is basic-only; other templates must fail.
assert.throws(() =>
  execFileSync(
    process.execPath,
    [cli, path.join(workDir, "bad-js"), "--template", "cloudflare", "--js"],
    { stdio: "pipe" },
  ),
);

// Unknown template must fail.
assert.throws(() =>
  execFileSync(
    process.execPath,
    [cli, path.join(workDir, "bad"), "--template", "nope"],
    { stdio: "pipe" },
  ),
);

// Non-empty target without --overwrite must fail when not a TTY.
const busy = path.join(workDir, "busy");
fs.mkdirSync(busy);
fs.writeFileSync(path.join(busy, "keep.txt"), "x");
assert.throws(() =>
  execFileSync(process.execPath, [cli, busy, "--template", "basic"], {
    stdio: "pipe",
  }),
);
execFileSync(
  process.execPath,
  [cli, busy, "--template", "basic", "--overwrite"],
  { stdio: "pipe" },
);
assert.ok(fs.existsSync(path.join(busy, "keep.txt")), "overwrite kept file");
assert.ok(fs.existsSync(path.join(busy, "package.json")), "overwrite copied");

// Latest-version resolution: the scaffolder rewrites the bundled router pin
// to the registry's `latest` dist-tag and honors npm_config_registry.
const registry = http.createServer((req, res) => {
  if (req.url === `/${encodeURIComponent("@rangojs/router")}/latest`) {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ version: "9.9.9" }));
  } else {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise((resolve) => registry.listen(0, "127.0.0.1", resolve));
const registryEnv = (url) => ({
  ...process.env,
  CREATE_RANGO_SKIP_LATEST: "",
  npm_config_registry: url,
});

// Async spawn, not execFileSync: the sync variant blocks this event loop,
// so the mock server above could never answer the scaffolder's request.
const latestDir = path.join(workDir, "latest-resolution");
await execFileAsync(process.execPath, [cli, latestDir, "--template", "basic"], {
  env: registryEnv(`http://127.0.0.1:${registry.address().port}/`),
});
registry.close();
assert.equal(
  JSON.parse(fs.readFileSync(path.join(latestDir, "package.json"), "utf8"))
    .dependencies["@rangojs/router"],
  "^9.9.9",
  "router pin rewritten to registry latest",
);

// Registry unreachable: the scaffold still succeeds on the bundled pin.
const templatePin = JSON.parse(
  fs.readFileSync(
    path.join(pkgDir, "../../../templates/basic/package.json"),
    "utf8",
  ),
).dependencies["@rangojs/router"];
const offlineDir = path.join(workDir, "offline-fallback");
await execFileAsync(
  process.execPath,
  [cli, offlineDir, "--template", "basic"],
  {
    env: registryEnv("http://127.0.0.1:1/"),
  },
);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(offlineDir, "package.json"), "utf8"))
    .dependencies["@rangojs/router"],
  templatePin,
  "offline scaffold keeps the bundled pin",
);

fs.rmSync(workDir, { recursive: true, force: true });
console.log(`smoke ok (${cases.length} templates)`);
