// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * tests/helpers.mjs — Utilidades comunes de las pruebas (node:test + jsdom).
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import markdownit from "markdown-it";
import * as yaml from "js-yaml";
import createDOMPurify from "dompurify";
import { ROOT, loadSchemas, walk } from "../scripts/lib/docs.mjs";
import { createMarkdownRenderer } from "../assets/js/markdown.js";
import { analyzeDocument } from "../assets/js/documents.js";

export { ROOT, yaml, markdownit };

export const SCHEMAS = await loadSchemas(ROOT);
export const plainRenderer = createMarkdownRenderer({ markdownit });

/** Analiza un documento en memoria con las mismas reglas que el CI. */
export function analyze(pathName, source, { languages = ["es", "en"] } = {}) {
  return analyzeDocument({ path: pathName, source, yaml, schemas: SCHEMAS, renderer: plainRenderer, languages });
}

/** Storage en memoria compatible con la API de localStorage. */
export function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
    dump: () => Object.fromEntries(map),
  };
}

/** Storage que siempre lanza (modo privado / bloqueado). */
export function throwingStorage() {
  const fail = () => {
    throw new Error("SecurityError: storage disabled");
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

const CONTENT_TYPES = { ".json": "application/json", ".md": "text/markdown", ".svg": "image/svg+xml", ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css" };
const TREE_RE = /^https:\/\/api\.github\.com\/repos\/([^/]+)\/([^/]+)\/git\/trees\/HEAD/;

/** Listado HTML de una carpeta, como lo generan los servidores locales. */
function listingHtml(entries, { style, dirUrlPath }) {
  const links = entries.map(({ name, dir }) =>
    style === "serve-index"
      ? `<li><a href="${dirUrlPath}${encodeURIComponent(name)}" class="icon ${dir ? "icon-directory" : "icon-md"}" title="${name}"><span class="name">${name}</span></a></li>`
      : `<li><a href="${encodeURIComponent(name)}${dir ? "/" : ""}">${name}${dir ? "/" : ""}</a></li>`,
  );
  const parent = style === "serve-index" ? `<li><a href="${dirUrlPath.replace(/[^/]+\/$/, "")}" class="icon icon-directory" title="..">..</a></li>` : "";
  return `<!DOCTYPE HTML><html><head><title>Directory listing</title></head><body><h1>Directory listing</h1><ul>${parent}${links.join("")}</ul></body></html>`;
}

/**
 * fetch que sirve archivos de `root` como si fueran el sitio publicado en `base`:
 *  - `api`: emula el árbol de la API de GitHub (`git/trees/HEAD`) con los archivos de `root`;
 *  - `listing`: "python" | "serve-index" | false, listado de carpetas de un servidor local;
 *  - `gitConfig`: texto de `.git/config` (por defecto no se sirve);
 *  - `routes`: otras URLs simuladas (tienen prioridad).
 */
export function siteFetch({ base = "https://owner.github.io/docpages/", root = ROOT, routes = {}, api = true, listing = "python", gitConfig = null } = {}) {
  const calls = [];
  const baseUrl = new URL(base);
  const impl = async (url) => {
    const target = new URL(String(url), base);
    calls.push(target.href);
    for (const [pattern, handler] of Object.entries(routes)) {
      if (target.href.startsWith(pattern)) return handler(target);
    }
    const tree = TREE_RE.exec(target.href);
    if (tree && api) {
      const files = (await walk(path.join(root, "documents"))).map((abs) => path.relative(root, abs).split(path.sep).join("/"));
      return jsonResponse({ sha: "abc", truncated: false, tree: [{ path: "documents", type: "tree" }, ...files.map((p) => ({ path: p, type: "blob" }))] });
    }
    if (target.origin !== baseUrl.origin || !target.pathname.startsWith(baseUrl.pathname)) throw new TypeError("Failed to fetch");
    const rel = decodeURIComponent(target.pathname.slice(baseUrl.pathname.length));
    if (rel === ".git/config") return gitConfig == null ? new Response("Not found", { status: 404 }) : new Response(gitConfig, { status: 200, headers: { "content-type": "text/plain" } });
    if (rel === "" || rel.endsWith("/")) {
      if (!rel) return new Response(await readFile(path.join(root, "index.html")), { status: 200, headers: { "content-type": "text/html" } });
      if (!listing) return new Response("Not found", { status: 404 });
      try {
        const entries = (await readdir(path.join(root, rel), { withFileTypes: true })).map((e) => ({ name: e.name, dir: e.isDirectory() }));
        return new Response(listingHtml(entries, { style: listing, dirUrlPath: target.pathname }), { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
      } catch {
        return new Response("Not found", { status: 404 });
      }
    }
    try {
      const body = await readFile(path.join(root, rel));
      return new Response(body, { status: 200, headers: { "content-type": CONTENT_TYPES[path.extname(rel)] || "application/octet-stream" } });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  };
  impl.calls = calls;
  return impl;
}

export const jsonResponse = (data, init = {}) => new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" }, ...init });

/**
 * Levanta index.html en jsdom y arranca la app.
 * @param {{url?:string, languages?:string[], mode?:string, fetchImpl?:Function, storage?:object, session?:object, before?:(win:Window)=>void}} options
 */
export async function bootApp({ url = "https://owner.github.io/docpages/", languages = ["es-ES", "es"], mode = "all", fetchImpl = null, storage = null, session = null, before = null } = {}) {
  const html = await readFile(path.join(ROOT, "index.html"), "utf8");
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => {
    if (!/Not implemented/.test(error.message)) console.error(error);
  });
  const dom = new JSDOM(html, { url, runScripts: "outside-only", pretendToBeVisual: true, virtualConsole });
  const win = dom.window;
  Object.defineProperty(win.navigator, "languages", { value: languages, configurable: true });
  Object.defineProperty(win.navigator, "language", { value: languages[0], configurable: true });
  if (storage) Object.defineProperty(win, "localStorage", { value: storage, configurable: true });
  if (session) Object.defineProperty(win, "sessionStorage", { value: session, configurable: true });
  if (before) before(win);
  const { startApp } = await import("../assets/js/app.js");
  const app = startApp({ win, libs: { markdownit, yaml, DOMPurify: createDOMPurify(win) }, mode, fetchImpl: fetchImpl || siteFetch({ base: new URL(".", url).href }) });
  await app.ready;
  return { dom, win, doc: win.document, app };
}

/** Espera a que se vacíen las tareas pendientes (anuncios con setTimeout, etc.). */
export const tick = (ms = 40) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ejecuta axe-core sobre el documento y devuelve las infracciones. */
export async function runAxe(win) {
  if (!win.axe) {
    const source = await readFile(path.join(ROOT, "node_modules", "axe-core", "axe.min.js"), "utf8");
    win.eval(source);
  }
  const result = await win.axe.run(win.document, {
    resultTypes: ["violations"],
    rules: {
      // jsdom no calcula estilos ni geometría: estas reglas no son fiables aquí.
      "color-contrast": { enabled: false },
      "scrollable-region-focusable": { enabled: false },
    },
  });
  // Array.from: los arrays de jsdom pertenecen a otro realm y no son deepEqual a [].
  return Array.from(result.violations, (v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: Array.from(v.nodes, (n) => Array.from(n.target).join(" ")).slice(0, 5) }));
}
