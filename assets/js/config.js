// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * config.js — Configuración del sitio.
 *
 * Es el único archivo que una copia del repositorio puede necesitar tocar, y
 * normalmente se deja tal cual: el propietario y el nombre del repositorio se
 * detectan solos (ver github.js). Lo leen tanto el navegador como los scripts
 * de Node (validación y manifiesto), así que debe seguir siendo un módulo sin
 * dependencias ni acceso al DOM.
 */

/**
 * Qué tipos de documento se publican.
 *   "all"   → procedimientos (/documents/steps) y pruebas (/documents/tests)
 *   "steps" → solo procedimientos
 *   "tests" → solo pruebas
 */
export const DOCUMENTATION_MODE = "all";

export const CONFIG = Object.freeze({
  /** Nombre visible del sitio, por idioma. */
  siteTitle: { es: "Documentación", en: "Documentation" },
  siteTagline: {
    es: "Procedimientos guiados y resultados de pruebas, publicados desde Markdown.",
    en: "Guided procedures and test results, published from Markdown.",
  },

  /**
   * Override opcional del repositorio. Déjalo vacío para detectarlo desde la
   * URL de GitHub Pages o desde el manifiesto generado en el despliegue.
   * Útil con un dominio propio sin Actions: { owner: "mi-org", name: "mi-repo" }.
   */
  repository: Object.freeze({ owner: "", name: "", branch: "" }),

  /** Idiomas de la interfaz. El primero es el de respaldo. */
  languages: Object.freeze(["es", "en"]),

  /** Archivo generado por scripts/build-manifest.mjs, relativo a index.html. */
  manifestUrl: "documents.manifest.json",

  /** Prefijo de todas las claves de localStorage/sessionStorage. */
  storagePrefix: "docpages",

  /** API pública de GitHub (sin token) para «Actualizar desde el repositorio». */
  github: Object.freeze({
    api: "https://api.github.com",
    raw: "https://raw.githubusercontent.com",
    maxDocuments: 100,
    timeoutMs: 15000,
  }),
});
