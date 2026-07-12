import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CONTENT_TYPE = {
  ".css": "text/css",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".mjs": "text/javascript",
  ".svg": "image/svg+xml",
};

export async function createVercelOutputServer(outputDir) {
  const functionEntry = path.join(
    outputDir,
    "functions",
    "index.func",
    "index.mjs",
  );
  const staticDir = path.join(outputDir, "static");
  const handler = (await import(pathToFileURL(functionEntry).href)).default;

  return http.createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
      if (pathname !== "/") {
        const filePath = path.resolve(staticDir, pathname.replace(/^\/+/, ""));
        const relativePath = path.relative(staticDir, filePath);
        if (
          relativePath &&
          !relativePath.startsWith("..") &&
          !path.isAbsolute(relativePath)
        ) {
          try {
            const info = await stat(filePath);
            if (info.isFile()) {
              response.setHeader(
                "content-type",
                CONTENT_TYPE[path.extname(filePath)] ??
                  "application/octet-stream",
              );
              response.end(await readFile(filePath));
              return;
            }
          } catch {
            // Missing static files fall through to the function.
          }
        }
      }
      await handler(request, response);
    } catch (error) {
      if (!response.headersSent) {
        response.statusCode = error instanceof URIError ? 400 : 500;
        response.end();
      } else {
        response.destroy(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  });
}
