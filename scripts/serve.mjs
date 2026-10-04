// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * scripts/serve.mjs — Servidor estático mínimo para probar en local.
 *
 *   node scripts/serve.mjs                          sirve la raíz en http://localhost:8080/
 *   node scripts/serve.mjs --dir _site --base /mi-repo/
 *                                                   simula un sitio de proyecto de GitHub Pages
 *   node scripts/serve.mjs --port 3000
 *
 * Como GitHub Pages: sirve index.html en los directorios y 404.html (con
 * estado 404) para lo que no existe. Bloquea rutas fuera de la carpeta.
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { ROOT, parseArgs, isMain } from "./lib/docs.mjs";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

export function createStaticServer({ dir = ROOT, base = "/" } = {}) {
  const root = path.resolve(dir);
  const prefix = ("/" + String(base).replace(/^\/+|\/+$/g, "") + "/").replace(/^\/\/$/, "/");

  const send = async (res, status, file) => {
    const body = await readFile(file);
    res.writeHead(status, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff" });
    res.end(body);
  };

  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let pathname = decodeURIComponent(url.pathname);
      if (prefix !== "/" && pathname === prefix.slice(0, -1)) {
        res.writeHead(301, { Location: prefix });
        return res.end();
      }
      if (!pathname.startsWith(prefix)) {
        res.writeHead(302, { Location: prefix });
        return res.end();
      }
      pathname = pathname.slice(prefix.length);
      let file = path.resolve(root, "." + path.sep + pathname);
      if (file !== root && !file.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }
      const info = await stat(file).catch(() => null);
      if (info && info.isDirectory()) file = path.join(file, "index.html");
      if (await stat(file).then((s) => s.isFile(), () => false)) return await send(res, 200, file);
      const notFound = path.join(root, "404.html");
      if (await stat(notFound).then(() => true, () => false)) return await send(res, 404, notFound);
      res.writeHead(404);
      res.end("Not found");
    } catch (error) {
      res.writeHead(500);
      res.end(String(error && error.message));
    }
  });
}

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const port = Number(args.port) || 8080;
  const base = typeof args.base === "string" ? args.base : "/";
  const dir = path.resolve(ROOT, typeof args.dir === "string" ? args.dir : ".");
  createStaticServer({ dir, base }).listen(port, () => {
    console.log(`Sirviendo ${path.relative(ROOT, dir) || "."}/ en http://localhost:${port}${("/" + base.replace(/^\/+|\/+$/g, "") + "/").replace(/^\/\/$/, "/")}`);
    console.log("Ctrl+C para detener.");
  });
}
