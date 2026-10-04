// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * catalog.js — Qué documentos hay, sin manifiesto ni paso de compilación.
 *
 *  - En GitHub Pages: el árbol del repositorio con la API pública (una sola
 *    llamada), guardado 10 minutos en este navegador. Si la API falla (sin
 *    red, límite de 60 solicitudes por hora…) se usa la última lista guardada.
 *  - En local: el listado de carpetas que generan los servidores estáticos
 *    (VS Code Live Server, `python -m http.server`…). Así cada quien ve lo
 *    que hay en SU carpeta `documents/`.
 *
 * Cada Markdown se lee del propio sitio y se analiza con las mismas reglas
 * que la pestaña «Validar»; los que no siguen el formato quedan marcados con
 * sus errores y no se publican como tarjetas.
 */

import { GitHubError, listRepositoryDocuments } from "./github.js";
import { buildManifestEntry, invalidEntry, findDuplicateSlugs, sortDocuments } from "./documents.js";

export const CATALOG_TTL_MS = 10 * 60 * 1000;

const HREF_RE = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

/** Valores `href` de un listado HTML (sin depender del DOM). */
export function hrefsOf(html) {
  return [...String(html || "").matchAll(HREF_RE)].map((m) => (m[1] ?? m[2] ?? m[3] ?? "").replace(/&amp;/g, "&"));
}

const header = (response, name) => (response && response.headers && typeof response.headers.get === "function" ? response.headers.get(name) || "" : "");

/**
 * Recorre el listado de carpetas del servidor a partir de `documents/`.
 * Entiende los formatos habituales (Python, Live Server/serve-index, http-server,
 * nginx, Apache): enlaces relativos o absolutos, con o sin `/` final.
 * @returns {Promise<{available:boolean, paths:string[]}>} available=false si el servidor no lista carpetas.
 */
export async function listFromServer({ baseUrl, fetchImpl, isCandidate, maxRequests = 200, maxDepth = 8 }) {
  const base = new URL(".", baseUrl);
  const root = new URL("documents/", base);
  const queue = [{ url: root.href, depth: 0 }];
  const seen = new Set();
  const files = new Set();
  let requests = 0;

  while (queue.length && requests < maxRequests) {
    const { url, depth } = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    requests += 1;
    let response;
    try {
      response = await fetchImpl(url, { cache: "no-store" });
    } catch {
      if (url === root.href) return { available: false, paths: [] };
      continue;
    }
    if (!response.ok || !/html/i.test(header(response, "content-type"))) {
      if (url === root.href) return { available: false, paths: [] };
      continue;
    }
    const html = await response.text();
    for (const href of hrefsOf(html)) {
      if (!href || href.startsWith("#") || href.startsWith("?")) continue;
      let target;
      try {
        target = new URL(href, url);
      } catch {
        continue;
      }
      if (target.origin !== root.origin || !target.pathname.startsWith(root.pathname)) continue;
      target.search = "";
      target.hash = "";
      let last;
      try {
        last = decodeURIComponent(target.pathname.split("/").filter(Boolean).pop() || "");
      } catch {
        continue;
      }
      if (!target.pathname.endsWith("/") && /\.md$/i.test(last)) {
        const rel = decodeURIComponent(target.pathname.slice(base.pathname.length));
        if (!isCandidate || isCandidate(rel)) files.add(rel);
      } else if ((target.pathname.endsWith("/") || !/\.[A-Za-z0-9]{1,10}$/.test(last)) && depth < maxDepth) {
        const dir = target.pathname.endsWith("/") ? target.href : `${target.href}/`;
        if (!seen.has(dir)) queue.push({ url: dir, depth: depth + 1 });
      }
    }
  }
  return { available: true, paths: [...files].sort() };
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

/**
 * Descubre, lee y analiza los documentos.
 * @param {{source:'github'|'local', repository?:object|null, baseUrl:string, fetchImpl:Function,
 *          store:{getJSON:Function,setJSON:Function}, cacheKey:string, isCandidate:(path:string)=>boolean,
 *          analyze:(path:string, text:string)=>object, api?:string, raw?:string, timeoutMs?:number,
 *          maxDocuments?:number, refresh?:boolean, now?:()=>number}} opts
 * @returns {Promise<{source:string, documents:Array, texts:Map<string,string>, error:GitHubError|null,
 *          stale:boolean, listing:boolean, truncated:boolean, listedAt:number|null}>}
 */
export async function buildCatalog({
  source,
  repository = null,
  baseUrl,
  fetchImpl,
  store,
  cacheKey,
  isCandidate,
  analyze,
  api = "https://api.github.com",
  raw = "https://raw.githubusercontent.com",
  timeoutMs = 15000,
  maxDocuments = 100,
  refresh = false,
  now = () => Date.now(),
}) {
  const result = { source, documents: [], texts: new Map(), error: null, stale: false, listing: true, truncated: false, listedAt: null };
  let paths = [];

  if (source === "github") {
    const cached = store.getJSON(cacheKey);
    const usable = cached && Array.isArray(cached.paths) && typeof cached.at === "number";
    if (usable && !refresh && now() - cached.at < CATALOG_TTL_MS) {
      paths = cached.paths;
      result.truncated = Boolean(cached.truncated);
      result.listedAt = cached.at;
    } else {
      try {
        const listed = await listRepositoryDocuments({ repository, fetchImpl, isCandidate, api, timeoutMs, maxDocuments });
        paths = listed.paths;
        result.truncated = listed.truncated;
        result.listedAt = now();
        store.setJSON(cacheKey, { at: result.listedAt, paths, truncated: listed.truncated });
      } catch (error) {
        result.error = error instanceof GitHubError ? error : new GitHubError("invalid", String((error && error.message) || error));
        if (!usable) return result;
        paths = cached.paths;
        result.stale = true;
        result.truncated = Boolean(cached.truncated);
        result.listedAt = cached.at;
      }
    }
  } else {
    const listed = await listFromServer({ baseUrl, fetchImpl, isCandidate });
    if (!listed.available) {
      result.listing = false;
      return result;
    }
    paths = listed.paths.slice(0, maxDocuments);
  }

  const readText = async (path) => {
    const urls = [new URL(path, new URL(".", baseUrl)).href];
    // En Pages, un documento recién subido puede tardar en publicarse: se prueba también raw.
    if (source === "github" && repository) urls.push(`${raw}/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/HEAD/${encodePath(path)}`);
    let status = 0;
    for (const url of urls) {
      try {
        const response = await fetchImpl(url, { cache: "no-cache" });
        if (response.ok) return { text: await response.text() };
        status = response.status;
      } catch {
        status = status || 0;
      }
    }
    return { text: null, status };
  };

  const entries = await mapLimit(paths, 6, async (path) => {
    const { text, status } = await readText(path);
    if (text == null) return invalidEntry({ path, errors: [{ line: null, message: `No se pudo leer el archivo${status ? ` (HTTP ${status})` : ""}.` }] });
    result.texts.set(path, text);
    const analysis = analyze(path, text);
    return analysis.errors.length ? invalidEntry(analysis) : buildManifestEntry(analysis, { size: text.length });
  });

  // Un slug repetido rompería las direcciones: ambos documentos quedan marcados.
  const valid = entries.filter((entry) => !entry.invalid);
  for (const duplicate of findDuplicateSlugs(valid.map((d) => ({ path: d.path, meta: { slug: d.slug } })))) {
    for (const path of duplicate.paths) {
      const index = entries.findIndex((d) => d.path === path);
      entries[index] = invalidEntry({ ...entries[index], errors: [{ line: null, message: duplicate.message }] });
    }
  }
  result.documents = sortDocuments(entries);
  return result;
}
