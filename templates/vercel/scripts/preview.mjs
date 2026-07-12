import path from "node:path";
import { fileURLToPath } from "node:url";
import { createVercelOutputServer } from "./serve-vercel-output.mjs";

const appRoot = path.resolve(fileURLToPath(import.meta.url), "../..");
const server = await createVercelOutputServer(
  path.join(appRoot, ".vercel", "output"),
);
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

server.listen(port, host, () => {
  console.log(`Vercel preview: http://${host}:${server.address().port}`);
});

function shutdown() {
  const forceClose = setTimeout(() => server.closeAllConnections(), 10_000);
  forceClose.unref();
  server.close(() => clearTimeout(forceClose));
}

process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);
