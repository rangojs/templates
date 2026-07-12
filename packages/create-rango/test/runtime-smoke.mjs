import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const templates = ["basic", "basic-js", "cloudflare", "vercel"];
const URL_PATTERN = /http:\/\/(?:localhost|127\.0\.0\.1):(\d+)/;
const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

async function startServer(command, args, options) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    shell: process.platform === "win32" && command.endsWith(".cmd"),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`server boot timeout\n${output}`));
    }, 45_000);
    const onData = (chunk) => {
      output += String(chunk);
      const match = stripVTControlCharacters(output).match(URL_PATTERN);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`server exited ${code}\n${output}`));
    });
  });
  return { child, port };
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  let forceTimer;
  await new Promise((resolve) => {
    child.once("exit", resolve);
    forceTimer = setTimeout(() => {
      if (child.exitCode === null) {
        child.kill("SIGKILL");
      }
      resolve();
    }, 10_000);
  });
  clearTimeout(forceTimer);
}

async function assertApp(label, port) {
  const headers = { accept: "text/html" };
  const baseUrl = `http://127.0.0.1:${port}`;
  const response = await fetch(`${baseUrl}/hello/runtime`, {
    headers,
  });
  assert.equal(response.status, 200, `${label}: dynamic route status`);
  assert.match(
    await response.text(),
    /<title>Hello runtime/,
    `${label}: route body`,
  );

  const counterHtml = await (
    await fetch(`${baseUrl}/counter`, { headers })
  ).text();
  const actionName = counterHtml.match(
    /<input type="hidden" name="(\$ACTION_ID_[^"]+)"/,
  )?.[1];
  assert.ok(actionName, `${label}: progressive action reference`);

  const formData = new FormData();
  formData.set(actionName, "");
  formData.set("delta", "1");
  const actionResponse = await fetch(`${baseUrl}/counter`, {
    method: "POST",
    headers,
    body: formData,
  });
  assert.equal(actionResponse.status, 200, `${label}: no-JS action status`);
  assert.match(
    await actionResponse.text(),
    /<output[^>]*>1<\/output>/,
    `${label}: no-JS action revalidates count`,
  );
}

for (const template of templates) {
  const cwd = path.join(root, "templates", template);
  const server = await startServer(
    pnpmCommand,
    ["exec", "vite", "--host", "127.0.0.1", "--port", "0"],
    { cwd },
  );
  try {
    await assertApp(`${template} dev`, server.port);
    console.log(`runtime-smoke: ${template} dev ok`);
  } finally {
    await stopServer(server.child);
  }
}

for (const template of templates) {
  const cwd = path.join(root, "templates", template);
  const command = process.execPath;
  const args =
    template === "vercel"
      ? ["scripts/preview.mjs"]
      : template === "cloudflare"
        ? [
            path.join(cwd, "node_modules/vite/bin/vite.js"),
            "preview",
            "--host",
            "127.0.0.1",
            "--port",
            "0",
          ]
        : ["server.mjs"];
  const server = await startServer(command, args, {
    cwd,
    env: template === "cloudflare" ? {} : { PORT: "0" },
  });
  try {
    await assertApp(`${template} production`, server.port);
    console.log(`runtime-smoke: ${template} production ok`);
  } finally {
    await stopServer(server.child);
  }
}

console.log("runtime-smoke ok (4 templates, dev + production)");
