// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/*
 * theme-init.js — Aplica el tema guardado antes de pintar la página para
 * evitar el destello claro/oscuro. Es un script clásico y diminuto porque la
 * CSP no permite scripts en línea. Sin preferencia guardada manda el sistema
 * (prefers-color-scheme).
 */
(function () {
  try {
    var saved = window.localStorage.getItem("docpages:theme");
    if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);
    var lang = window.localStorage.getItem("docpages:lang");
    if (lang === "es" || lang === "en") document.documentElement.setAttribute("lang", lang);
  } catch (e) {
    /* sin almacenamiento: se usa la preferencia del sistema */
  }
})();
