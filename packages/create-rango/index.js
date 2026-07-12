#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as p from "@clack/prompts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Layout is selected explicitly, not by probing: installed under any package
// manager the CLI lives inside a node_modules tree and MUST use the templates
// bundled by prepack; running from the repo it MUST use the source templates
// two levels up (a leftover ./templates snapshot from a local pack would
// otherwise silently shadow them).
const IS_INSTALLED = __dirname.split(path.sep).includes("node_modules");
const TEMPLATES_ROOT = IS_INSTALLED
  ? path.join(__dirname, "templates")
  : path.join(__dirname, "../../templates");

const TEMPLATES = [
  {
    name: "basic",
    label: "Basic",
    hint: "Vite + RSC, deploy to any Node host",
    jsFlavor: true,
  },
  {
    name: "cloudflare",
    label: "Cloudflare Workers",
    hint: "Cloudflare Vite plugin + wrangler",
  },
  {
    name: "vercel",
    label: "Vercel",
    hint: "Build Output API, deploy with `vercel deploy --prebuilt`",
  },
];

const HELP = `create-rango — scaffold a Rango (@rangojs/router) app

Usage:
  create-rango [directory] [options]

Options:
  -t, --template <name>  ${TEMPLATES.map((t) => t.name).join(" | ")}
  --js                   JavaScript flavor (basic template only)
  --ts                   TypeScript flavor (default)
  --overwrite            scaffold into a non-empty directory
  -h, --help             show this help
  -v, --version          show the create-rango version

Examples:
  npm create rango@latest my-app
  pnpm create rango my-app --template cloudflare
  pnpm create rango my-app -t basic --js
`;

function parseArgs(argv) {
  const args = { dir: undefined, template: undefined, lang: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") args.help = true;
    else if (arg === "-v" || arg === "--version") args.version = true;
    else if (arg === "-t" || arg === "--template") {
      args.template = argv[++i];
      if (!args.template) fail(`${arg} requires a value`);
    } else if (arg.startsWith("--template=")) {
      args.template = arg.slice("--template=".length);
    } else if (arg === "--js") args.lang = "js";
    else if (arg === "--ts") args.lang = "ts";
    else if (arg === "--overwrite") args.overwrite = true;
    else if (arg.startsWith("-")) fail(`Unknown option: ${arg}`);
    else if (args.dir === undefined) args.dir = arg;
    else fail(`Unexpected argument: ${arg}`);
  }
  return args;
}

function fail(message) {
  console.error(`create-rango: ${message}\n\nRun create-rango --help.`);
  process.exit(1);
}

function bail(value, message = "Cancelled.") {
  if (p.isCancel(value)) {
    p.cancel(message);
    process.exit(1);
  }
  return value;
}

// Names npm rejects outright (validate-npm-package-name blacklist).
const RESERVED_PACKAGE_NAMES = new Set(["node_modules", "favicon.ico"]);

function toValidPackageName(name) {
  const valid = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^[-._]+/, "")
    .replace(/[^a-z0-9-~._]+/g, "-")
    .slice(0, 214);
  if (!valid || RESERVED_PACKAGE_NAMES.has(valid)) return "rango-app";
  return valid;
}

// Cloudflare Worker names allow only [a-z0-9-] and cap at 54 chars for
// workers.dev, stricter than npm package names (which keep _ . ~).
function toValidWorkerName(name) {
  const valid = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54)
    .replace(/-+$/, "");
  return valid || "rango-app";
}

// Render a path for the copy-pasteable `cd` step: anchor relative paths with
// ./ (so a leading "-" cannot parse as an option and "~" cannot expand), then
// POSIX-quote anything outside the safe charset.
function shellPath(value) {
  const anchored =
    path.isAbsolute(value) || value.startsWith(".") ? value : `./${value}`;
  if (/^[A-Za-z0-9._/-]+$/.test(anchored)) return anchored;
  return `'${anchored.replaceAll("'", `'\\''`)}'`;
}

function isEmptyDir(dir) {
  const entries = fs.readdirSync(dir);
  return (
    entries.length === 0 || (entries.length === 1 && entries[0] === ".git")
  );
}

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent ?? "";
  for (const pm of ["pnpm", "yarn", "bun"]) {
    if (userAgent.startsWith(`${pm}/`)) return pm;
  }
  return "npm";
}

// Local install/build artifacts that may exist in a template checkout (repo
// dev, or a user re-running into the same dir) and must never be scaffolded.
const SKIP_COPY = new Set([
  "node_modules",
  "dist",
  ".wrangler",
  ".vercel",
  ".vite",
  ".turbo",
]);

// Local credential files (wrangler `.dev.vars`, dotenv) must never be copied
// into a scaffold either; mirrors scripts/sync-templates.mjs.
function shouldSkipCopy(basename) {
  return (
    SKIP_COPY.has(basename) ||
    basename.startsWith(".env") ||
    basename.startsWith(".dev.vars")
  );
}

function copyTemplate(templateDir, targetDir) {
  fs.cpSync(templateDir, targetDir, {
    recursive: true,
    filter: (src) => !shouldSkipCopy(path.basename(src)),
  });
  const gitignore = path.join(targetDir, "_gitignore");
  if (fs.existsSync(gitignore)) {
    fs.renameSync(gitignore, path.join(targetDir, ".gitignore"));
  }
}

function patchJsonName(file, name) {
  if (!fs.existsSync(file)) return;
  const source = fs.readFileSync(file, "utf8");
  JSON.parse(source);
  const nameProperty = /("name"\s*:\s*)"(?:\\.|[^"\\])*"/;
  if (!nameProperty.test(source)) {
    throw new Error(`Cannot update name in ${file}`);
  }
  const next = source.replace(
    nameProperty,
    (_match, prefix) => `${prefix}${JSON.stringify(name)}`,
  );
  fs.writeFileSync(file, next);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(HELP);
    return;
  }
  if (args.version) {
    const own = JSON.parse(
      fs.readFileSync(path.join(__dirname, "package.json"), "utf8"),
    );
    console.log(own.version);
    return;
  }

  p.intro("create-rango");

  // engines says >=24; npm only warns on engine mismatch, so repeat it loudly
  // for anyone who got here on an older Node (generated apps hard-require 24).
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 24) {
    p.log.warn(
      `Node ${process.versions.node} detected — create-rango and the apps it generates require Node 24+. Continuing, but installing/running the generated app will fail on this Node.`,
    );
  }

  let dir = args.dir;
  if (dir === undefined) {
    dir = bail(
      await p.text({
        message: "Where should the app be created?",
        placeholder: "./rango-app",
        defaultValue: "rango-app",
      }),
    );
  }
  const targetDir = path.resolve(process.cwd(), dir);
  const packageName = toValidPackageName(path.basename(targetDir));

  // Accept both `--template cloudflare --js` and `--template cloudflare-js`.
  let template = args.template;
  let lang = args.lang;
  if (template?.endsWith("-js")) {
    template = template.slice(0, -3);
    lang ??= "js";
  }
  if (template && !TEMPLATES.some((t) => t.name === template)) {
    fail(
      `Unknown template "${template}". Available: ${TEMPLATES.map((t) => t.name).join(", ")}`,
    );
  }
  if (!template) {
    template = bail(
      await p.select({
        message: "Which template?",
        options: TEMPLATES.map((t) => ({
          value: t.name,
          label: t.label,
          hint: t.hint,
        })),
      }),
    );
    if (TEMPLATES.find((t) => t.name === template)?.jsFlavor) {
      lang ??= bail(
        await p.select({
          message: "TypeScript or JavaScript?",
          options: [
            { value: "ts", label: "TypeScript" },
            { value: "js", label: "JavaScript" },
          ],
        }),
      );
    }
  }
  lang ??= "ts";
  if (lang === "js" && !TEMPLATES.find((t) => t.name === template)?.jsFlavor) {
    const jsTemplates = TEMPLATES.filter((t) => t.jsFlavor).map((t) => t.name);
    fail(
      `the JavaScript flavor is only available for: ${jsTemplates.join(", ")}`,
    );
  }

  const templateName = lang === "js" ? `${template}-js` : template;
  const templateDir = path.join(TEMPLATES_ROOT, templateName);
  if (!fs.existsSync(templateDir)) {
    fail(`Template directory missing: ${templateDir}`);
  }

  if (fs.existsSync(targetDir) && !isEmptyDir(targetDir)) {
    if (args.overwrite) {
      // Keep the directory itself (it may be the cwd); template files
      // overwrite existing ones of the same name.
    } else if (process.stdout.isTTY) {
      const overwrite = bail(
        await p.confirm({
          message: `${path.relative(process.cwd(), targetDir) || "."} is not empty. Continue and overwrite matching files?`,
          initialValue: false,
        }),
      );
      if (!overwrite) {
        p.cancel("Cancelled.");
        process.exit(1);
      }
    } else {
      fail(`${targetDir} is not empty (pass --overwrite to continue)`);
    }
  }

  copyTemplate(templateDir, targetDir);
  patchJsonName(path.join(targetDir, "package.json"), packageName);
  patchJsonName(
    path.join(targetDir, "wrangler.json"),
    toValidWorkerName(path.basename(targetDir)),
  );

  const pm = detectPackageManager();
  const cd = path.relative(process.cwd(), targetDir);
  const steps = [
    ...(cd ? [`cd ${shellPath(cd)}`] : []),
    `${pm} install`,
    pm === "npm" ? "npm run dev" : `${pm} dev`,
  ];
  p.note(steps.join("\n"), "Next steps");
  p.outro(`Scaffolded ${templateName} template in ${cd || "."}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
