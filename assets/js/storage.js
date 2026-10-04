// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * storage.js — Persistencia local segura.
 *
 * Todo acceso a localStorage/sessionStorage va envuelto en try/catch: en modo
 * privado o con el almacenamiento bloqueado el sitio sigue funcionando y el
 * estado vive en memoria mientras dure la pestaña.
 *
 * Las claves de estado de un documento incluyen el repositorio, el slug y la
 * versión. En GitHub Pages todos los repositorios de un mismo propietario
 * comparten origen (`owner.github.io`), así que el repositorio en la clave
 * evita que dos sitios se pisen; la versión hace que un documento nuevo
 * empiece limpio sin borrar el estado de la versión anterior.
 */

export const DEFAULT_PREFIX = "docpages";

/** Envuelve un backend tipo Storage; si falla o no existe, usa memoria. */
export function createStore(backend) {
  const memory = new Map();
  let usable = Boolean(backend);

  const attempt = (fn, fallback) => {
    if (!usable) return fallback();
    try {
      return fn();
    } catch {
      usable = false;
      return fallback();
    }
  };

  return {
    get persistent() {
      return usable;
    },
    get(key) {
      return attempt(
        () => backend.getItem(key),
        () => (memory.has(key) ? memory.get(key) : null),
      );
    },
    set(key, value) {
      const text = String(value);
      memory.set(key, text);
      attempt(
        () => backend.setItem(key, text),
        () => undefined,
      );
    },
    remove(key) {
      memory.delete(key);
      attempt(
        () => backend.removeItem(key),
        () => undefined,
      );
    },
    getJSON(key, fallback = null) {
      const raw = this.get(key);
      if (raw == null) return fallback;
      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    setJSON(key, value) {
      this.set(key, JSON.stringify(value));
    },
  };
}

/** Devuelve `win.localStorage`/`win.sessionStorage` o null si acceder lanza. */
export function browserStorage(win, kind = "localStorage") {
  try {
    const storage = win && win[kind];
    if (!storage) return null;
    const probe = "__docpages_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/** `owner/name` en minúsculas, o `local` si no se conoce el repositorio. */
export function repositoryScope(repository) {
  if (!repository || !repository.owner || !repository.name) return "local";
  return `${repository.owner}/${repository.name}`.toLowerCase();
}

/**
 * Clave de estado: `docpages:{repository}:{slug}:{version}:{steps|test}`.
 * @param {{prefix?:string, repository?:object|null, slug:string, version:string, type:'steps'|'test'}} parts
 */
export function documentStateKey({ prefix = DEFAULT_PREFIX, repository = null, slug, version, type }) {
  return [prefix, repositoryScope(repository), slug, version || "0.0.0", type].join(":");
}

/** Clave de la lista de documentos guardada (localStorage, 10 minutos). */
export function catalogCacheKey({ prefix = DEFAULT_PREFIX, repository = null } = {}) {
  return [prefix, repositoryScope(repository), "catalog"].join(":");
}

/** Clave del borrador de la pestaña «Validar» (archivos abiertos). */
export function validatorDraftKey({ prefix = DEFAULT_PREFIX } = {}) {
  return [prefix, "validator"].join(":");
}
