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
  "arrow-left",
  "arrow-right",
  "ban",
  "book-open",
  "calendar",
  "check",
  "chevron-down",
  "circle",
  "circle-check",
  "circle-dashed",
  "circle-dot-dashed",
  "circle-x",
  "clipboard-check",
  "clock",
  "copy",
  "external-link",
  "file-text",
  "flask-conical",
  "git-branch",
  "git-commit-horizontal",
  "globe",
  "house",
  "info",
  "languages",
  "layers",
  "lightbulb",
  "link",
  "list-checks",
  "loader-circle",
  "message-square-warning",
  "moon",
  "octagon-alert",
  "party-popper",
  "refresh-cw",
  "rotate-ccw",
  "search",
  "server",
  "sun",
  "tag",
  "triangle-alert",
  "user",
  "x",
  "zoom-in",
]);

export const BRAND_ICONS = Object.freeze(["github"]);

export const ICON_NAMES = Object.freeze([...LUCIDE_ICONS, ...BRAND_ICONS].sort());

export const STATUS_ICONS = Object.freeze({
  passed: "circle-check",
  failed: "circle-x",
  blocked: "ban",
  partial: "circle-dot-dashed",
  running: "loader-circle",
  "not-run": "circle-dashed",
});

export const CALLOUT_ICONS = Object.freeze({
  note: "info",
  tip: "lightbulb",
  important: "message-square-warning",
  warning: "triangle-alert",
  caution: "octagon-alert",
});
