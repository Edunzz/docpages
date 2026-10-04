// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * icons.js — Catálogo de iconos del sprite `assets/icons/sprite.svg`.
 *
 * scripts/vendor.mjs genera el sprite con exactamente estos nombres: los de
 * Lucide (ISC) salen de `lucide-static` y `github` de `@primer/octicons` (MIT),
 * porque Lucide ya no incluye marcas. Para añadir un icono: agrégalo aquí y
 * ejecuta `npm run vendor`.
 */

export const LUCIDE_ICONS = Object.freeze([
  "arrow-down",
  "arrow-left",
  "arrow-left-right",
  "arrow-right",
  "arrow-up",
  "award",
  "ban",
  "book-open",
  "calendar",
  "check",
  "chevron-down",
  "circle",
  "circle-check",
  "circle-dot",
  "circle-dot-dashed",
  "circle-help",
  "circle-x",
  "clipboard-check",
  "clipboard-list",
  "copy",
  "external-link",
  "eye",
  "file-text",
  "file-warning",
  "flag",
  "flask-conical",
  "gauge",
  "git-branch",
  "git-commit-horizontal",
  "globe",
  "graduation-cap",
  "hash",
  "house",
  "info",
  "languages",
  "lightbulb",
  "link",
  "list-checks",
  "list-ordered",
  "message-square-warning",
  "moon",
  "octagon-alert",
  "party-popper",
  "refresh-cw",
  "rotate-ccw",
  "search",
  "square-check",
  "sun",
  "tag",
  "target",
  "text-cursor-input",
  "timer",
  "toggle-left",
  "triangle-alert",
  "trophy",
  "user",
  "x",
  "zoom-in",
]);

export const BRAND_ICONS = Object.freeze(["github"]);

export const ICON_NAMES = Object.freeze([...LUCIDE_ICONS, ...BRAND_ICONS].sort());

/** Icono de cada categoría de documento. */
export const CATEGORY_ICONS = Object.freeze({
  procedure: "list-checks",
  "lab-guide": "flask-conical",
  "practice-test": "graduation-cap",
});

/** Icono de cada tipo de pregunta de las pruebas de práctica. */
export const QUESTION_TYPE_ICONS = Object.freeze({
  single: "circle-dot",
  multiple: "square-check",
  "true-false": "toggle-left",
  text: "text-cursor-input",
  number: "hash",
  order: "list-ordered",
  match: "arrow-left-right",
});

export const CALLOUT_ICONS = Object.freeze({
  note: "info",
  tip: "lightbulb",
  important: "message-square-warning",
  warning: "triangle-alert",
  caution: "octagon-alert",
});
