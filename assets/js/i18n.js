// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * i18n.js — Textos de la interfaz en español e inglés.
 *
 * - La preferencia se guarda en localStorage (`docpages:lang`).
 * - Sin preferencia guardada se usa el idioma del navegador; si no es uno de
 *   los soportados, español.
 * - Los valores localizables del Markdown (`title`, `description`, `label`…)
 *   pueden ser un texto simple o un objeto `{ es, en }`; `localize()` elige.
 *
 * Funciones puras: el almacenamiento y el navegador se inyectan.
 */

export const LANGUAGES = Object.freeze(["es", "en"]);
export const FALLBACK_LANGUAGE = "es";
export const LANGUAGE_STORAGE_KEY = "docpages:lang";

const MESSAGES = {
  es: {
    "app.loading": "Cargando…",
    "a11y.skip": "Saltar al contenido",
    "a11y.announcer": "Avisos",
    "nav.home": "Inicio",
    "nav.breadcrumb": "Ruta de navegación",
    "lang.label": "Idioma",
    "lang.es": "Español",
    "lang.en": "English",
    "theme.toLight": "Cambiar a modo claro",
    "theme.toDark": "Cambiar a modo oscuro",

    "repo.view": "Ver repositorio",
    "repo.refresh": "Actualizar desde el repositorio público",
    "repo.refreshing": "Actualizando…",
    "repo.unknown": "Repositorio no detectado (vista local)",
    "repo.sourceDeployed": "Contenido del despliegue",
    "repo.sourceLive": "En vivo desde GitHub",
    "repo.useDeployed": "Volver al contenido desplegado",
    "repo.generated": "Generado el {date}",
    "repo.branch": "rama {branch}",
    "repo.commit": "commit {sha}",
    "repo.refreshed": { one: "Se cargó {count} documento desde {repo}.", other: "Se cargaron {count} documentos desde {repo}." },
    "repo.skipped": { one: "Se omitió {count} documento con errores.", other: "Se omitieron {count} documentos con errores." },
    "repo.truncated": "GitHub devolvió un árbol truncado: puede faltar algún documento.",

    "error.offline": "No hay conexión con GitHub. Se mantiene el contenido del despliegue.",
    "error.not-found": "El repositorio no existe o es privado. Se mantiene el contenido del despliegue.",
    "error.private": "El repositorio es privado: la API pública no puede leerlo. Se mantiene el contenido del despliegue.",
    "error.rate-limited": "Se alcanzó el límite de solicitudes de la API pública de GitHub{reset}. Se mantiene el contenido del despliegue.",
    "error.rate-limited-reset": " (se restablece a las {time})",
    "error.timeout": "GitHub tardó demasiado en responder. Se mantiene el contenido del despliegue.",
    "error.http": "GitHub respondió con un error ({status}). Se mantiene el contenido del despliegue.",
    "error.invalid": "La respuesta de GitHub no tiene el formato esperado. Se mantiene el contenido del despliegue.",
    "error.no-repo": "No se pudo detectar el repositorio público de este sitio.",
    "error.manifest": "No se pudo cargar el índice de documentos (documents.manifest.json).",
    "error.manifestHint": "Ejecuta «npm run manifest» y sirve el sitio con un servidor HTTP; abrir index.html con file:// no funciona.",
    "error.retry": "Reintentar",

    "home.searchLabel": "Buscar documentos",
    "home.searchPlaceholder": "Título, descripción, etiqueta o contenido",
    "home.searchClear": "Limpiar búsqueda",
    "home.results": { one: "{count} resultado", other: "{count} resultados" },
    "home.noResults": "Ningún documento coincide con «{query}».",
    "home.empty": "Todavía no hay documentos en {folder}.",
    "home.filter": "Tipo de documento",
    "home.filterAll": "Todos",
    "home.documents": { one: "{count} documento", other: "{count} documentos" },

    "section.steps": "Procedimientos",
    "section.tests": "Pruebas",
    "section.stepsHint": "Guías paso a paso; el avance se guarda en este navegador.",
    "section.testsHint": "Ejecuciones de prueba con resultados, estados y evidencia.",

    "card.updated": "Actualizado {date}",
    "card.notStarted": "Sin iniciar",
    "card.progress": "{percent} completado",
    "card.steps": { one: "{count} paso", other: "{count} pasos" },
    "card.cases": "{passed} de {total} casos aprobados",

    "doc.type.steps": "Procedimiento",
    "doc.type.test": "Prueba",
    "doc.author": "Autor",
    "doc.updated": "Actualizado",
    "doc.version": "Versión",
    "doc.executedAt": "Ejecutada",
    "doc.environment": "Ambiente",
    "doc.links": "Enlaces",
    "doc.tags": "Etiquetas",
    "doc.details": "Datos del documento",
    "doc.reset": "Reiniciar",
    "doc.resetConfirm": "Confirmar reinicio",
    "doc.resetHint": "Pulsa de nuevo para borrar el estado guardado en este navegador.",
    "doc.resetDone": "Se reinició el estado local del documento.",
    "doc.loadError": "No se pudo cargar el documento.",
    "doc.invalid": "El documento tiene errores de validación",
    "doc.notFound": "Documento no encontrado",
    "doc.notFoundBody": "La dirección no corresponde a ningún documento publicado.",
    "doc.disabled": "Este tipo de documento está deshabilitado en este sitio.",
    "doc.backHome": "Volver al inicio",
    "doc.newTab": "(se abre en una pestaña nueva)",
    "doc.repoUnknownLink": "Enlace no disponible: el repositorio no se detectó.",

    "steps.progress": "Progreso del procedimiento",
    "steps.progressDetail": "{done} de {total} tareas",
    "steps.nav": "Pasos del procedimiento",
    "steps.stepN": "Paso {n}",
    "steps.prev": "Anterior",
    "steps.next": "Siguiente",
    "steps.markDone": "Marcar como completado",
    "steps.markPending": "Marcar como pendiente",
    "steps.markSubDone": "Completar subpaso",
    "steps.markSubPending": "Reabrir subpaso",
    "steps.state.done": "Completado",
    "steps.state.progress": "En progreso",
    "steps.state.pending": "Pendiente",
    "steps.count": "{done}/{total}",
    "steps.completeTitle": "¡Procedimiento completado!",
    "steps.completeBody": "Completaste todas las tareas. El avance queda guardado en este navegador.",
    "steps.announceDone": "«{title}» completado. Progreso: {percent}.",
    "steps.announcePending": "«{title}» marcado como pendiente. Progreso: {percent}.",
    "steps.announceProgress": "Progreso: {percent}.",
    "steps.empty": "Este procedimiento no tiene pasos.",
    "steps.toggle": "Mostrar u ocultar el paso",

    "status.not-run": "Sin ejecutar",
    "status.running": "En ejecución",
    "status.passed": "Aprobado",
    "status.failed": "Fallido",
    "status.blocked": "Bloqueado",
    "status.partial": "Parcial",

    "summary.title": "Resumen de resultados",
    "summary.passed": "Aprobados",
    "summary.failed": "Fallidos",
    "summary.blocked": "Bloqueados",
    "summary.partial": "Parciales",
    "summary.running": "En ejecución",
    "summary.not-run": "Sin ejecutar",
    "summary.total": "Total",
    "summary.distribution": "Distribución de estados",
    "summary.mismatch": "El resumen declarado en el documento no coincide con los casos; se muestran los valores calculados.",

    "tests.verdict": "Resultado global",
    "tests.cases": "Casos de prueba",
    "tests.filter": "Filtrar casos por estado",
    "tests.filterAll": "Todos",
    "tests.noCases": "Ningún caso coincide con el filtro.",
    "tests.expected": "Esperado",
    "tests.actual": "Obtenido",
    "tests.evidence": "Evidencia",
    "tests.localRun": "Re-ejecución local",
    "tests.localRunHint": "Registra tu propio resultado; solo se guarda en este navegador.",
    "tests.localNone": "Sin registrar",
    "tests.localSummary": "{recorded} de {total} casos registrados localmente",
    "tests.openImage": "Ampliar imagen: {label}",
    "tests.caseId": "Identificador",

    "code.copy": "Copiar",
    "code.copied": "Copiado",
    "code.copyFailed": "No se pudo copiar",
    "code.copyLabel": "Copiar el código {lang}",

    "callout.note": "Nota",
    "callout.tip": "Consejo",
    "callout.important": "Importante",
    "callout.warning": "Advertencia",
    "callout.caution": "Precaución",

    "content.table": "Tabla",

    "lightbox.close": "Cerrar",
    "lightbox.label": "Imagen ampliada",

    "footer.credit": "Desarrollado por",
    "footer.source": "Publicado desde",
    "footer.local": "Vista local",

    "time.unknown": "sin fecha",
  },

  en: {
    "app.loading": "Loading…",
    "a11y.skip": "Skip to content",
    "a11y.announcer": "Notifications",
    "nav.home": "Home",
    "nav.breadcrumb": "Breadcrumb",
    "lang.label": "Language",
    "lang.es": "Español",
    "lang.en": "English",
    "theme.toLight": "Switch to light mode",
    "theme.toDark": "Switch to dark mode",

    "repo.view": "View repository",
    "repo.refresh": "Refresh from the public repository",
    "repo.refreshing": "Refreshing…",
    "repo.unknown": "Repository not detected (local preview)",
    "repo.sourceDeployed": "Deployed content",
    "repo.sourceLive": "Live from GitHub",
    "repo.useDeployed": "Back to deployed content",
    "repo.generated": "Generated on {date}",
    "repo.branch": "branch {branch}",
    "repo.commit": "commit {sha}",
    "repo.refreshed": { one: "Loaded {count} document from {repo}.", other: "Loaded {count} documents from {repo}." },
    "repo.skipped": { one: "Skipped {count} document with errors.", other: "Skipped {count} documents with errors." },
    "repo.truncated": "GitHub returned a truncated tree: some documents may be missing.",

    "error.offline": "GitHub is unreachable. The deployed content is kept.",
    "error.not-found": "The repository does not exist or is private. The deployed content is kept.",
    "error.private": "The repository is private, so the public API cannot read it. The deployed content is kept.",
    "error.rate-limited": "The public GitHub API rate limit was reached{reset}. The deployed content is kept.",
    "error.rate-limited-reset": " (resets at {time})",
    "error.timeout": "GitHub took too long to respond. The deployed content is kept.",
    "error.http": "GitHub responded with an error ({status}). The deployed content is kept.",
    "error.invalid": "GitHub returned an unexpected response. The deployed content is kept.",
    "error.no-repo": "The public repository of this site could not be detected.",
    "error.manifest": "The document index (documents.manifest.json) could not be loaded.",
    "error.manifestHint": "Run “npm run manifest” and serve the site over HTTP; opening index.html with file:// does not work.",
    "error.retry": "Retry",

    "home.searchLabel": "Search documents",
    "home.searchPlaceholder": "Title, description, tag or content",
    "home.searchClear": "Clear search",
    "home.results": { one: "{count} result", other: "{count} results" },
    "home.noResults": "No document matches “{query}”.",
    "home.empty": "There are no documents in {folder} yet.",
    "home.filter": "Document type",
    "home.filterAll": "All",
    "home.documents": { one: "{count} document", other: "{count} documents" },

    "section.steps": "Procedures",
    "section.tests": "Tests",
    "section.stepsHint": "Step-by-step guides; progress is saved in this browser.",
    "section.testsHint": "Test runs with results, statuses and evidence.",

    "card.updated": "Updated {date}",
    "card.notStarted": "Not started",
    "card.progress": "{percent} complete",
    "card.steps": { one: "{count} step", other: "{count} steps" },
    "card.cases": "{passed} of {total} cases passed",

    "doc.type.steps": "Procedure",
    "doc.type.test": "Test",
    "doc.author": "Author",
    "doc.updated": "Updated",
    "doc.version": "Version",
    "doc.executedAt": "Executed",
    "doc.environment": "Environment",
    "doc.links": "Links",
    "doc.tags": "Tags",
    "doc.details": "Document details",
    "doc.reset": "Reset",
    "doc.resetConfirm": "Confirm reset",
    "doc.resetHint": "Press again to clear the state saved in this browser.",
    "doc.resetDone": "The local state of the document was reset.",
    "doc.loadError": "The document could not be loaded.",
    "doc.invalid": "The document has validation errors",
    "doc.notFound": "Document not found",
    "doc.notFoundBody": "The address does not match any published document.",
    "doc.disabled": "This document type is disabled on this site.",
    "doc.backHome": "Back to home",
    "doc.newTab": "(opens in a new tab)",
    "doc.repoUnknownLink": "Link unavailable: the repository was not detected.",

    "steps.progress": "Procedure progress",
    "steps.progressDetail": "{done} of {total} tasks",
    "steps.nav": "Procedure steps",
    "steps.stepN": "Step {n}",
    "steps.prev": "Previous",
    "steps.next": "Next",
    "steps.markDone": "Mark as complete",
    "steps.markPending": "Mark as pending",
    "steps.markSubDone": "Complete substep",
    "steps.markSubPending": "Reopen substep",
    "steps.state.done": "Complete",
    "steps.state.progress": "In progress",
    "steps.state.pending": "Pending",
    "steps.count": "{done}/{total}",
    "steps.completeTitle": "Procedure complete!",
    "steps.completeBody": "You completed every task. Progress stays saved in this browser.",
    "steps.announceDone": "“{title}” complete. Progress: {percent}.",
    "steps.announcePending": "“{title}” marked as pending. Progress: {percent}.",
    "steps.announceProgress": "Progress: {percent}.",
    "steps.empty": "This procedure has no steps.",
    "steps.toggle": "Show or hide the step",

    "status.not-run": "Not run",
    "status.running": "Running",
    "status.passed": "Passed",
    "status.failed": "Failed",
    "status.blocked": "Blocked",
    "status.partial": "Partial",

    "summary.title": "Results summary",
    "summary.passed": "Passed",
    "summary.failed": "Failed",
    "summary.blocked": "Blocked",
    "summary.partial": "Partial",
    "summary.running": "Running",
    "summary.not-run": "Not run",
    "summary.total": "Total",
    "summary.distribution": "Status distribution",
    "summary.mismatch": "The summary declared in the document does not match its cases; calculated values are shown.",

    "tests.verdict": "Overall result",
    "tests.cases": "Test cases",
    "tests.filter": "Filter cases by status",
    "tests.filterAll": "All",
    "tests.noCases": "No case matches the filter.",
    "tests.expected": "Expected",
    "tests.actual": "Actual",
    "tests.evidence": "Evidence",
    "tests.localRun": "Local re-run",
    "tests.localRunHint": "Record your own result; it is stored only in this browser.",
    "tests.localNone": "Not recorded",
    "tests.localSummary": "{recorded} of {total} cases recorded locally",
    "tests.openImage": "Enlarge image: {label}",
    "tests.caseId": "Identifier",

    "code.copy": "Copy",
    "code.copied": "Copied",
    "code.copyFailed": "Copy failed",
    "code.copyLabel": "Copy the {lang} code",

    "callout.note": "Note",
    "callout.tip": "Tip",
    "callout.important": "Important",
    "callout.warning": "Warning",
    "callout.caution": "Caution",

    "content.table": "Table",

    "lightbox.close": "Close",
    "lightbox.label": "Enlarged image",

    "footer.credit": "Developed by",
    "footer.source": "Published from",
    "footer.local": "Local preview",

    "time.unknown": "no date",
  },
};

/** Normaliza "en-US" → "en"; devuelve null si no está soportado. */
export function normalizeLanguage(value, supported = LANGUAGES) {
  const base = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return supported.includes(base) ? base : null;
}

/**
 * Idioma inicial: preferencia guardada → idiomas del navegador → respaldo.
 * @param {{stored?:string|null, navigatorLanguages?:string[], supported?:string[], fallback?:string}} opts
 */
export function detectLanguage({ stored = null, navigatorLanguages = [], supported = LANGUAGES, fallback = FALLBACK_LANGUAGE } = {}) {
  const saved = normalizeLanguage(stored, supported);
  if (saved) return saved;
  for (const candidate of navigatorLanguages || []) {
    const lang = normalizeLanguage(candidate, supported);
    if (lang) return lang;
  }
  return normalizeLanguage(fallback, supported) || supported[0];
}

/**
 * Elige el texto de un valor localizable.
 * Acepta un texto simple o un objeto `{ es, en }`; si falta el idioma pedido,
 * usa el de respaldo y después cualquiera que exista.
 */
export function localize(value, lang, fallback = FALLBACK_LANGUAGE) {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (value[lang] != null && value[lang] !== "") return String(value[lang]);
  if (value[fallback] != null && value[fallback] !== "") return String(value[fallback]);
  const first = Object.values(value).find((v) => v != null && v !== "");
  return first == null ? "" : String(first);
}

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (params && params[key] != null ? String(params[key]) : match));
}

/** Traduce una clave; los mensajes con plural son `{ one, other }` y usan `params.count`. */
export function translate(lang, key, params = {}) {
  const table = MESSAGES[lang] || MESSAGES[FALLBACK_LANGUAGE];
  let message = table[key] ?? MESSAGES[FALLBACK_LANGUAGE][key];
  if (message == null) return key;
  if (typeof message === "object") {
    const category = new Intl.PluralRules(lang).select(Number(params.count) || 0);
    message = message[category] ?? message.other;
  }
  return interpolate(message, params);
}

/** Lista de claves por idioma (para pruebas de completitud). */
export function messageKeys(lang) {
  return Object.keys(MESSAGES[lang] || {});
}

/**
 * Crea el estado de idioma de la aplicación.
 * @param {{storage?:{get:Function,set:Function}, navigatorLanguages?:string[], supported?:string[]}} opts
 */
export function createI18n({ storage = null, navigatorLanguages = [], supported = LANGUAGES } = {}) {
  const listeners = new Set();
  let lang = detectLanguage({
    stored: storage ? storage.get(LANGUAGE_STORAGE_KEY) : null,
    navigatorLanguages,
    supported,
  });

  const api = {
    get lang() {
      return lang;
    },
    supported,
    t: (key, params) => translate(lang, key, params),
    localize: (value) => localize(value, lang),
    setLanguage(next) {
      const normalized = normalizeLanguage(next, supported);
      if (!normalized) return lang;
      if (storage) storage.set(LANGUAGE_STORAGE_KEY, normalized);
      if (normalized !== lang) {
        lang = normalized;
        listeners.forEach((fn) => fn(lang));
      }
      return lang;
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Fecha `YYYY-MM-DD` sin desfase de zona horaria. */
    formatDate(value) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
      if (!m) return value ? String(value) : translate(lang, "time.unknown");
      const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(date);
    },
    /** Fecha y hora ISO 8601, en la zona horaria del lector. */
    formatDateTime(value) {
      const date = new Date(String(value || ""));
      if (!value || Number.isNaN(date.getTime())) return value ? String(value) : translate(lang, "time.unknown");
      return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(date);
    },
    formatTime(value) {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat(lang, { timeStyle: "short" }).format(date);
    },
  };
  return api;
}
