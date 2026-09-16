import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 49141);
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

function send(res, status, body, type) {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(body);
}

function sendFile(res, filePath) {
  const type = mime[path.extname(filePath)] || "application/octet-stream";
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    send(res, 200, data, type);
  });
}

function resolvePath(pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel.includes("\0")) return null;
  rel = rel.replace(/^\/+/, "");
  if (rel.endsWith("/")) rel += "index.html";
  if (rel === "") rel = "index.html";
  const abs = path.normalize(path.join(PUBLIC_DIR, rel));
  const root = PUBLIC_DIR.endsWith(path.sep) ? PUBLIC_DIR : PUBLIC_DIR + path.sep;
  if (abs !== PUBLIC_DIR && !abs.startsWith(root)) return null;
  return abs;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);
  if (url.pathname === "/favicon.ico") {
    send(res, 204, "", "image/x-icon");
    return;
  }

  const filePath = resolvePath(url.pathname);
  if (!filePath) {
    send(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      sendFile(res, path.join(filePath, "index.html"));
      return;
    }
    if (err) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    sendFile(res, filePath);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Appointment book at http://${HOST}:${PORT}/`);
});
