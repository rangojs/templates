// Production server: serves the vite build from dist/.
// Build first (`npm run build`), then `npm run start`.
import { createServer } from "node:http";
import sirv from "sirv";
import { toNodeHandler } from "srvx/node";
import handler from "./dist/rsc/index.js";

const port = Number(process.env.PORT ?? 3000);

const serveStatic = sirv("dist/client");
const serveHashedAssets = sirv("dist/client", {
  immutable: true,
  maxAge: 31536000,
});

// srvx bridges the router's Web fetch handler onto Node's (req, res), piping
// streamed responses through.
const serveApp = toNodeHandler((request) =>
  handler(request, { env: process.env }),
);

function isFingerprintedAsset(url) {
  const pathname = new URL(url, "http://localhost").pathname;
  return /^\/assets\/.+-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(pathname);
}

const server = createServer((req, res) => {
  // Only Vite fingerprinted files are immutable. A user may also place an
  // unhashed public file under public/assets/, which must remain revalidatable.
  const serveAssets = isFingerprintedAsset(req.url ?? "/")
    ? serveHashedAssets
    : serveStatic;
  serveAssets(req, res, () => serveApp(req, res));
});
server.listen(port, () => {
  console.log(`Listening on http://localhost:${server.address().port}`);
});

function shutdown() {
  const forceClose = setTimeout(() => server.closeAllConnections(), 10_000);
  forceClose.unref();
  server.close(() => clearTimeout(forceClose));
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
