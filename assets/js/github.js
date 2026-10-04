// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * github.js — De qué repositorio es este sitio y cómo leerlo en vivo.
 *
 * Un fork o una copia deben mostrar SU repositorio sin tocar código. Orden de
 * resolución (el primero que aplique):
 *
 *   1. Override en config.js (`CONFIG.repository`).
 *   2. La URL de GitHub Pages: `https://{owner}.github.io/{repo}/` o, para un
 *      sitio de usuario/organización, `https://{owner}.github.io/` → repo
 *      `{owner}.github.io`. Si el manifiesto apunta al mismo repositorio se
 *      usan sus datos (mayúsculas reales, rama, URL de Pages).
 *   3. El manifiesto generado en el workflow (`GITHUB_REPOSITORY`), útil con
 *      un dominio propio.
 *   4. Nada: vista local, sin enlaces al repositorio.
 *
 * La URL tiene prioridad sobre el manifiesto porque un manifiesto versionado
 * puede venir del repositorio original cuando un fork publica desde una rama.
 */

import { sortDocuments } from "./documents.js";

const PAGES_HOST_RE = /^([a-z0-9](?:[a-z0-9-]{0,38}))\.github\.io$/i;
const OWNER_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const NAME_RE = /^[A-Za-z0-9._-]{1,100}$/;

export function isValidRepository(repo) {
  return Boolean(repo && OWNER_RE.test(repo.owner || "") && NAME_RE.test(repo.name || "") && !/^\.+$/.test(repo.name));
}

/**
 * Directorio base del sitio a partir de `location.pathname`.
 * "/repo/" → "/repo/", "/repo/index.html" → "/repo/", "/repo" → "/repo/".
 */
export function basePathFromPathname(pathname) {
  let path = String(pathname || "/");
  if (!path.startsWith("/")) path = "/" + path;
  if (!path.endsWith("/")) {
    const last = path.slice(path.lastIndexOf("/") + 1);
    path = last.includes(".") ? path.slice(0, path.lastIndexOf("/") + 1) : path + "/";
  }
  return path.replace(/\/{2,}/g, "/");
}

/** Deduce `{ owner, name }` de una URL de GitHub Pages, o null si no lo es. */
export function parsePagesLocation(location) {
  const match = PAGES_HOST_RE.exec(String((location && location.hostname) || ""));
  if (!match) return null;
  const owner = match[1].toLowerCase();
  const basePath = basePathFromPathname(location.pathname);
  const first = basePath.split("/").filter(Boolean)[0];
  if (!first) return { owner, name: `${owner}.github.io`, isUserSite: true, basePath: "/" };
  return { owner, name: decodeURIComponent(first), isUserSite: false, basePath: `/${first}/` };
}

export function defaultPagesUrl(owner, name) {
  const host = `${String(owner).toLowerCase()}.github.io`;
  return String(name).toLowerCase() === host ? `https://${host}/` : `https://${host}/${name}/`;
}

/** Todo lo derivable de `owner/name`, listo para enlaces y tokens. */
export function repositoryContext({ owner, name, branch = "", sha = "", pagesUrl = "", source = "unknown" }) {
  const fullName = `${owner}/${name}`;
  const url = `https://github.com/${fullName}`;
  return {
    owner,
    name,
    fullName,
    url,
    cloneUrl: `${url}.git`,
    pagesUrl: pagesUrl || defaultPagesUrl(owner, name),
    branch: branch || "",
    sha: sha || "",
    source,
  };
}

function sameRepository(a, b) {
  return a.owner.toLowerCase() === b.owner.toLowerCase() && a.name.toLowerCase() === b.name.toLowerCase();
}

/**
 * Resuelve el repositorio con el orden documentado arriba.
 * @param {{location?:{hostname:string,pathname:string}, override?:object, manifestRepository?:object|null}} opts
 */
export function resolveRepository({ location = null, override = null, manifestRepository = null } = {}) {
  if (isValidRepository(override)) return repositoryContext({ ...override, source: "config" });

  const manifest = isValidRepository(manifestRepository) ? manifestRepository : null;
  const fromLocation = parsePagesLocation(location);
  if (fromLocation && isValidRepository(fromLocation)) {
    if (manifest && sameRepository(manifest, fromLocation)) return repositoryContext({ ...manifest, source: "manifest" });
    return repositoryContext({ owner: fromLocation.owner, name: fromLocation.name, source: "location" });
  }
  if (manifest) return repositoryContext({ ...manifest, source: "manifest" });
  return null;
}

/** Valores de los tokens de repositorio (`{{repo_url}}`…). Vacíos si no se conoce. */
export function repositoryTokens(repo) {
  return {
    repo_url: repo ? repo.url : "",
    repo: repo ? repo.fullName : "",
    owner: repo ? repo.owner : "",
    repo_name: repo ? repo.name : "",
    pages_url: repo ? repo.pagesUrl : "",
    clone_url: repo ? repo.cloneUrl : "",
    branch: repo ? repo.branch : "",
  };
}

// ─────────────────────────── API pública de GitHub ───────────────────────────

export class GitHubError extends Error {
  /** @param {'offline'|'timeout'|'not-found'|'private'|'rate-limited'|'http'|'invalid'|'no-repo'} code */
  constructor(code, message = code, extra = {}) {
    super(message);
    this.name = "GitHubError";
    this.code = code;
    Object.assign(this, extra);
  }
}

async function request(url, { fetchImpl, timeoutMs = 15000, accept = "application/vnd.github+json" }) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
  let response;
  try {
    response = await fetchImpl(url, { headers: { Accept: accept }, signal: controller ? controller.signal : undefined, cache: "no-store" });
  } catch (error) {
    if (error && error.name === "AbortError") throw new GitHubError("timeout", `Tiempo agotado: ${url}`);
    throw new GitHubError("offline", (error && error.message) || "Network error");
  } finally {
    if (timer) clearTimeout(timer);
  }
  if (response.ok) return response;

  const header = (name) => (response.headers && typeof response.headers.get === "function" ? response.headers.get(name) : null);
  if (response.status === 404) throw new GitHubError("not-found", `404: ${url}`, { status: 404 });
  if (response.status === 429 || (response.status === 403 && header("x-ratelimit-remaining") === "0")) {
    const reset = Number(header("x-ratelimit-reset"));
    throw new GitHubError("rate-limited", "Rate limit", { status: response.status, resetAt: Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null });
  }
  throw new GitHubError("http", `HTTP ${response.status}: ${url}`, { status: response.status });
}

async function requestJson(url, opts) {
  const response = await request(url, opts);
  try {
    return await response.json();
  } catch {
    throw new GitHubError("invalid", `Respuesta no JSON: ${url}`);
  }
}

const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

/**
 * Lee el repositorio público: metadatos, árbol de archivos y cada Markdown.
 * `analyze({ path, text, rawUrl })` convierte un documento en entrada de
 * manifiesto (o lanza si es inválido); así este módulo no conoce el formato.
 */
export async function fetchLiveDocuments({
  repository,
  fetchImpl,
  isDocumentPath,
  analyze,
  api = "https://api.github.com",
  raw = "https://raw.githubusercontent.com",
  maxDocuments = 100,
  timeoutMs = 15000,
}) {
  if (!isValidRepository(repository)) throw new GitHubError("no-repo");
  const { owner, name } = repository;
  const base = `${api}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;

  const info = await requestJson(base, { fetchImpl, timeoutMs });
  if (!info || typeof info !== "object") throw new GitHubError("invalid");
  if (info.private) throw new GitHubError("private");
  const branch = repository.branch || info.default_branch || "main";

  const tree = await requestJson(`${base}/git/trees/${encodeURIComponent(branch)}?recursive=1`, { fetchImpl, timeoutMs });
  if (!tree || !Array.isArray(tree.tree)) throw new GitHubError("invalid");

  const paths = tree.tree
    .filter((entry) => entry && entry.type === "blob" && typeof entry.path === "string" && isDocumentPath(entry.path))
    .map((entry) => entry.path)
    .sort()
    .slice(0, maxDocuments);

  const documents = [];
  const skipped = [];
  await Promise.all(
    paths.map(async (path) => {
      const rawUrl = `${raw}/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/refs/heads/${encodePath(branch)}/${encodePath(path)}`;
      try {
        const response = await request(rawUrl, { fetchImpl, timeoutMs, accept: "text/plain" });
        const text = await response.text();
        documents.push(await analyze({ path, text, rawUrl }));
      } catch (error) {
        skipped.push({ path, message: (error && error.message) || String(error) });
      }
    }),
  );

  return {
    repository: { owner: info.owner && info.owner.login ? info.owner.login : owner, name: info.name || name, branch },
    truncated: Boolean(tree.truncated),
    documents: sortDocuments(documents),
    skipped: skipped.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

/**
 * «Actualizar desde el repositorio público». Nunca lanza: si la API falla
 * devuelve el manifiesto del despliegue con el error para mostrarlo.
 * @returns {Promise<{ok:boolean, manifest:object, error?:GitHubError, skipped?:Array, truncated?:boolean}>}
 */
export async function refreshFromGitHub({ deployed, repository, now = () => new Date(), ...options }) {
  try {
    const live = await fetchLiveDocuments({ repository, ...options });
    const manifest = {
      ...deployed,
      source: "github",
      generatedAt: now().toISOString(),
      repository: { ...(deployed && deployed.repository), ...live.repository, sha: "", url: `https://github.com/${live.repository.owner}/${live.repository.name}` },
      documents: live.documents,
    };
    return { ok: true, manifest, skipped: live.skipped, truncated: live.truncated };
  } catch (error) {
    const wrapped = error instanceof GitHubError ? error : new GitHubError("invalid", (error && error.message) || String(error));
    return { ok: false, manifest: deployed, error: wrapped };
  }
}
