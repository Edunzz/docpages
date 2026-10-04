// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * github.js — De qué repositorio es este sitio y qué documentos tiene.
 *
 * Un fork o una copia deben mostrar SU repositorio sin tocar código. Orden de
 * resolución (el primero que aplique):
 *
 *   1. Override en config.js (`CONFIG.repository`), útil con un dominio propio.
 *   2. La URL de GitHub Pages: `https://{owner}.github.io/{repo}/` o, para un
 *      sitio de usuario/organización, `https://{owner}.github.io/` → repo
 *      `{owner}.github.io`.
 *   3. En local, el remoto `origin` de `.git/config` si el servidor lo sirve
 *      (así los enlaces apuntan al repositorio de quien clonó).
 *   4. Nada: vista local sin enlaces al repositorio.
 *
 * En GitHub Pages la lista de documentos sale de la API pública (un único
 * árbol del repositorio, sin token). No hay paso de compilación.
 */

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
export function repositoryContext({ owner, name, branch = "", pagesUrl = "", source = "unknown" }) {
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
    source,
  };
}

/**
 * `owner/name` del remoto de GitHub en el texto de `.git/config`
 * (prefiere `origin`). Acepta https, ssh (`git@github.com:o/r.git`) y `ssh://`.
 */
export function parseGitConfig(text) {
  const remotes = [];
  let current = null;
  for (const line of String(text || "").split(/\r?\n/)) {
    const section = /^\s*\[\s*remote\s+"([^"]+)"\s*\]\s*$/.exec(line);
    if (section) {
      current = section[1];
      continue;
    }
    if (/^\s*\[/.test(line)) {
      current = null;
      continue;
    }
    const url = current && /^\s*url\s*=\s*(\S+)\s*$/.exec(line);
    if (!url) continue;
    const match = /github\.com[/:]([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/i.exec(url[1]);
    if (match) remotes.push({ remote: current, owner: match[1], name: match[2] });
  }
  const chosen = remotes.find((r) => r.remote === "origin") || remotes[0];
  return chosen && isValidRepository(chosen) ? { owner: chosen.owner, name: chosen.name } : null;
}

/**
 * Resuelve el repositorio con el orden documentado arriba.
 * @param {{location?:{hostname:string,pathname:string}, override?:object, gitRepository?:object|null}} opts
 */
export function resolveRepository({ location = null, override = null, gitRepository = null } = {}) {
  if (isValidRepository(override)) return repositoryContext({ ...override, source: "config" });
  const fromLocation = parsePagesLocation(location);
  if (fromLocation && isValidRepository(fromLocation)) return repositoryContext({ owner: fromLocation.owner, name: fromLocation.name, source: "location" });
  if (isValidRepository(gitRepository)) return repositoryContext({ ...gitRepository, source: "git" });
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
    branch: repo ? repo.branch || "main" : "",
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

/**
 * Rutas de los documentos del repositorio público en su rama por defecto,
 * con una sola llamada a la API: `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1`.
 * @param {{repository:object, fetchImpl:Function, isCandidate:(path:string)=>boolean, api?:string, timeoutMs?:number, maxDocuments?:number}} opts
 * @returns {Promise<{paths:string[], truncated:boolean}>}
 */
export async function listRepositoryDocuments({ repository, fetchImpl, isCandidate, api = "https://api.github.com", timeoutMs = 15000, maxDocuments = 100 }) {
  if (!isValidRepository(repository)) throw new GitHubError("no-repo");
  const url = `${api}/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}/git/trees/HEAD?recursive=1`;
  const response = await request(url, { fetchImpl, timeoutMs });
  let tree;
  try {
    tree = await response.json();
  } catch {
    throw new GitHubError("invalid", `Respuesta no JSON: ${url}`);
  }
  if (!tree || !Array.isArray(tree.tree)) throw new GitHubError("invalid");
  const paths = tree.tree
    .filter((entry) => entry && entry.type === "blob" && typeof entry.path === "string" && isCandidate(entry.path))
    .map((entry) => entry.path)
    .sort()
    .slice(0, maxDocuments);
  return { paths, truncated: Boolean(tree.truncated) };
}
