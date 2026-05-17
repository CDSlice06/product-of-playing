import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { createServer } from "node:http";

const rootDir = resolve(process.argv[2] ?? ".");
const port = Number(process.argv[3] ?? 5174);
const host = process.argv[4] ?? "0.0.0.0";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".map": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function resolveFilePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const safePath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const targetPath = resolve(join(rootDir, safePath === "/" ? "index.html" : safePath));

  if (!targetPath.startsWith(rootDir)) {
    return null;
  }

  if (existsSync(targetPath) && statSync(targetPath).isFile()) {
    return targetPath;
  }

  const htmlFallback = resolve(join(rootDir, "index.html"));
  return existsSync(htmlFallback) ? htmlFallback : null;
}

const server = createServer((req, res) => {
  const filePath = resolveFilePath(req.url ?? "/");

  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] ?? "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Static server ready: http://${host}:${port}/`);
  console.log(`Serving snapshot from: ${rootDir}`);
});
