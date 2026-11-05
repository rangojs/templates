import { createServer, get } from "node:http";
import { gunzipSync } from "node:zlib";
import { afterEach, expect, test } from "vitest";
import { withCompression } from "../compress.mjs";

const CHUNK_COUNT = 3;
const GAP_MS = 200;
const CHUNK = `<section>${"streamed ".repeat(200)}</section>`;

const servers = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve) => {
          server.closeAllConnections();
          server.close(() => resolve());
        }),
    ),
  );
});

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("expected a TCP address"));
        return;
      }
      resolve(address.port);
    });
  });
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// A page shaped like the router's: one write per Suspense chunk, spaced far
// enough apart that the client can tell a flushed chunk from a buffered one.
function streamingServer() {
  const server = createServer((req, res) => {
    withCompression(req, res, async () => {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      for (let index = 0; index < CHUNK_COUNT; index += 1) {
        if (index > 0) await delay(GAP_MS);
        res.write(CHUNK);
      }
      res.end();
    });
  });
  servers.push(server);
  return server;
}

// Reads the raw wire bytes and records when each piece arrives, so the test
// measures delivery rather than the handler's own clock.
function read(port, acceptEncoding) {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const request = get(
      {
        host: "127.0.0.1",
        port,
        path: "/",
        headers: { "accept-encoding": acceptEncoding },
      },
      (response) => {
        const arrivals = [];
        const parts = [];
        response.on("data", (chunk) => {
          arrivals.push(Date.now() - startedAt);
          parts.push(chunk);
        });
        response.once("error", reject);
        response.once("end", () =>
          resolve({
            encoding: response.headers["content-encoding"],
            body: Buffer.concat(parts),
            arrivals,
          }),
        );
      },
    );
    request.once("error", reject);
  });
}

test("compresses a streamed page and flushes each chunk as it is written", async () => {
  const server = streamingServer();
  const port = await listen(server);

  const { encoding, body, arrivals } = await read(port, "gzip, deflate, br");

  // Brotli is offered, but the response must be gzip: compression's brotli
  // stream ignores flush and would deliver the page in one piece.
  expect(encoding).toBe("gzip");
  expect(gunzipSync(body).toString()).toBe(CHUNK.repeat(CHUNK_COUNT));
  // Each write must reach the client on its own, while the stream is still
  // open: a buffered encoder delivers the page as a single burst at the end.
  expect(arrivals.length).toBeGreaterThanOrEqual(CHUNK_COUNT);
  expect(arrivals[arrivals.length - 1] - arrivals[0]).toBeGreaterThan(GAP_MS);
});

test("leaves the response uncompressed when the client does not accept gzip", async () => {
  const server = streamingServer();
  const port = await listen(server);

  const { encoding, body } = await read(port, "br");

  expect(encoding).toBeUndefined();
  expect(body.toString()).toBe(CHUNK.repeat(CHUNK_COUNT));
});
