// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * ui.js — Piezas de interfaz compartidas.
 *
 * Todo se construye con createElement/textContent. El único HTML que entra al
 * DOM es el del Markdown, que llega ya sanitizado por DOMPurify como
 * DocumentFragment (ver markdown.js). Las funciones reciben el `document`
 * para poder probarse con jsdom.
 */

import { ICON_NAMES, STATUS_ICONS, CALLOUT_ICONS } from "./icons.js";
import { isSafeUrl, resolveRelativePath, expandTokens, urlScheme } from "./markdown.js";

export const ICON_SPRITE = "assets/icons/sprite.svg";
const SVG_NS = "http://www.w3.org/2000/svg";
const ICONS = new Set(ICON_NAMES);

/** `h(doc, "a", { href, class, text, onClick }, ...hijos)` */
export function h(doc, tag, props = {}, ...children) {
  const el = doc.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === "class") el.className = Array.isArray(value) ? value.filter(Boolean).join(" ") : String(value);
    else if (key === "text") el.textContent = String(value);
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key === "hidden") el.hidden = true;
    else if (/^on[A-Z]/.test(key) && typeof value === "function") el.addEventListener(key.slice(2).toLowerCase(), value);
    else el.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    el.append(typeof child === "object" ? child : String(child));
  }
  return el;
}

export function icon(doc, name, { className = "", label = "" } = {}) {
  const svg = doc.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", `icon ${className}`.trim());
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("focusable", "false");
  if (label) {
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
  } else {
    svg.setAttribute("aria-hidden", "true");
  }
  const use = doc.createElementNS(SVG_NS, "use");
  use.setAttribute("href", `${ICON_SPRITE}#${ICONS.has(name) ? name : "link"}`);
  svg.append(use);
  return svg;
}

export function setIcon(svg, name) {
  const use = svg && svg.querySelector("use");
  if (use) use.setAttribute("href", `${ICON_SPRITE}#${ICONS.has(name) ? name : "link"}`);
}

export function statusBadge(doc, t, status, { className = "" } = {}) {
  return h(doc, "span", { class: ["badge", `status--${status}`, className], dataset: { status } }, icon(doc, STATUS_ICONS[status] || "circle"), h(doc, "span", { text: t(`status.${status}`) }));
}

/** Barra de progreso accesible; devuelve `{ element, update(percent, valueText) }`. */
export function progressBar(doc, { labelledBy = null, label = null, className = "" } = {}) {
  const bar = h(doc, "div", { class: "progress__bar" });
  const element = h(
    doc,
    "div",
    { class: ["progress", className], role: "progressbar", "aria-valuemin": "0", "aria-valuemax": "100", "aria-valuenow": "0", "aria-labelledby": labelledBy, "aria-label": labelledBy ? null : label },
    bar,
  );
  return {
    element,
    update(percent, valueText = "") {
      const value = Math.max(0, Math.min(100, Math.round(percent)));
      element.setAttribute("aria-valuenow", String(value));
      if (valueText) element.setAttribute("aria-valuetext", valueText);
      bar.style.width = `${value}%`;
      element.dataset.complete = String(value === 100);
    },
  };
}

export const prefersReducedMotion = (win) => Boolean(win && typeof win.matchMedia === "function" && win.matchMedia("(prefers-reduced-motion: reduce)").matches);

export async function copyText(win, text) {
  try {
    if (win.navigator && win.navigator.clipboard) {
      await win.navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* sin permisos: se intenta el método clásico */
  }
  try {
    const doc = win.document;
    const area = doc.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.className = "visually-offscreen";
    doc.body.append(area);
    area.select();
    const ok = typeof doc.execCommand === "function" && doc.execCommand("copy");
    area.remove();
    return Boolean(ok);
  } catch {
    return false;
  }
}

const isExternal = (url) => /^https?:\/\//i.test(String(url).trim());

/**
 * Resuelve un enlace relativo de un documento:
 *  - a otro documento publicado (`../tests/x.test.md`) → ruta interna `#/tests/slug`;
 *  - a cualquier otro archivo → URL absoluta respecto al documento.
 */
export function resolveDocumentHref(href, { docDir, docBaseUrl, documentRoute = null }) {
  const value = String(href || "").trim();
  if (!value || value.startsWith("#") || urlScheme(value)) return value;
  const path = resolveRelativePath(docDir, value);
  const route = path && documentRoute ? documentRoute(path) : null;
  if (route) return route;
  try {
    return new URL(value, docBaseUrl).href;
  } catch {
    return "";
  }
}

/** Abre una URL externa en otra pestaña de forma segura y lo anuncia a lectores de pantalla. */
export function markExternal(doc, t, anchor) {
  anchor.setAttribute("target", "_blank");
  anchor.setAttribute("rel", "noopener noreferrer");
  if (!anchor.querySelector(".sr-only[data-new-tab]")) anchor.append(h(doc, "span", { class: "sr-only", dataset: { newTab: "" }, text: ` ${t("doc.newTab")}` }));
}

/**
 * Post-proceso del Markdown ya sanitizado: avisos, código, tablas, enlaces e
 * imágenes. `ctx`: { doc, win, t, docDir, docBaseUrl, documentRoute, openLightbox }.
 */
export function enhanceContent(container, ctx) {
  const { doc, t } = ctx;

  container.querySelectorAll("blockquote[data-callout]").forEach((quote) => {
    const kind = quote.dataset.callout;
    quote.setAttribute("role", "note");
    quote.prepend(h(doc, "p", { class: "callout__title" }, icon(doc, CALLOUT_ICONS[kind] || "info"), h(doc, "span", { text: t(`callout.${kind}`) })));
  });

  container.querySelectorAll("pre > code").forEach((code) => {
    const pre = code.parentElement;
    const lang = ((code.className || "").match(/language-([\w-]+)/) || [])[1] || "";
    if (lang) pre.classList.add(`language-${lang}`);
    pre.setAttribute("tabindex", "0");
    const status = h(doc, "span", { class: "codeblock__status", role: "status" });
    const label = h(doc, "span", { text: t("code.copy") });
    const button = h(doc, "button", { type: "button", class: "codeblock__copy", "aria-label": t("code.copyLabel", { lang: lang || "" }).replace(/\s+/g, " ") }, icon(doc, "copy"), label);
    button.addEventListener("click", async () => {
      const ok = await copyText(ctx.win, code.textContent);
      label.textContent = ok ? t("code.copied") : t("code.copyFailed");
      status.textContent = ok ? t("code.copied") : t("code.copyFailed");
      setIcon(button.querySelector("svg"), ok ? "clipboard-check" : "copy");
      button.classList.toggle("is-done", ok);
      setTimeout(() => {
        label.textContent = t("code.copy");
        status.textContent = "";
        setIcon(button.querySelector("svg"), "copy");
        button.classList.remove("is-done");
      }, 1800);
    });
    const wrap = h(doc, "div", { class: "codeblock" }, h(doc, "div", { class: "codeblock__bar" }, h(doc, "span", { class: "codeblock__lang", text: lang || "text" }), button, status));
    pre.replaceWith(wrap);
    wrap.append(pre);
  });

  container.querySelectorAll("table").forEach((table) => {
    const wrap = h(doc, "div", { class: "table-wrap", tabindex: "0", role: "region", "aria-label": t("content.table") });
    table.replaceWith(wrap);
    wrap.append(table);
  });

  container.querySelectorAll("a").forEach((anchor) => {
    const href = anchor.getAttribute("href");
    // Rutas absolutas a la raíz ("/x") rompen bajo /{repositorio}/; también
    // aparecen cuando un token como {{repo_url}} no se pudo resolver.
    if (!href || !isSafeUrl(href) || /^\/(?!\/)/.test(href.trim())) {
      anchor.replaceWith(...anchor.childNodes);
      return;
    }
    const resolved = resolveDocumentHref(href, ctx);
    if (!resolved) {
      anchor.replaceWith(...anchor.childNodes);
      return;
    }
    anchor.setAttribute("href", resolved);
    if (isExternal(resolved)) markExternal(doc, t, anchor);
    else anchor.removeAttribute("target");
  });

  container.querySelectorAll("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (!src) {
      img.remove();
      return;
    }
    if (!isExternal(src)) img.setAttribute("src", resolveDocumentHref(src, { ...ctx, documentRoute: null }));
    if (img.closest("a, button") || !ctx.openLightbox) return;
    const button = h(doc, "button", { type: "button", class: "zoomable", "aria-label": t("tests.openImage", { label: img.getAttribute("alt") || "" }) });
    img.replaceWith(button);
    button.append(img);
    button.addEventListener("click", () => ctx.openLightbox(img.getAttribute("src"), img.getAttribute("alt") || ""));
  });

  return container;
}

/**
 * Convierte los marcadores `- [ ]` en casillas reales envueltas en <label>
 * (asociación implícita, sin ids). `onTask(input, marker)` las configura; por
 * defecto quedan deshabilitadas con el valor escrito en el Markdown.
 */
export function hydrateTaskMarkers(doc, container, onTask = null) {
  container.querySelectorAll(".task-marker").forEach((marker) => {
    const input = h(doc, "input", { type: "checkbox", class: "task-check" });
    const text = h(doc, "span", { class: "task-text" });
    let next = marker.nextSibling;
    while (next && !(next.nodeType === 1 && /^(UL|OL)$/.test(next.nodeName))) {
      const move = next;
      next = next.nextSibling;
      text.append(move);
    }
    marker.replaceWith(h(doc, "label", { class: "task-label" }, input, text));
    if (onTask) onTask(input, marker);
    else {
      input.disabled = true;
      input.checked = marker.dataset.checked === "true";
    }
  });
}

/** Botón de reinicio en dos pasos (sin diálogos bloqueantes). */
export function resetButton(ctx, onConfirm) {
  const { doc, t } = ctx;
  const label = h(doc, "span", { text: t("doc.reset") });
  const hintId = `reset-hint-${Math.random().toString(36).slice(2, 8)}`;
  const hint = h(doc, "span", { id: hintId, class: "sr-only", text: "" });
  const button = h(doc, "button", { type: "button", class: "btn btn--ghost btn--reset", "aria-describedby": hintId }, icon(doc, "rotate-ccw"), label);
  let timer = null;
  const disarm = () => {
    clearTimeout(timer);
    button.classList.remove("is-armed");
    label.textContent = t("doc.reset");
    hint.textContent = "";
  };
  button.addEventListener("click", () => {
    if (!button.classList.contains("is-armed")) {
      button.classList.add("is-armed");
      label.textContent = t("doc.resetConfirm");
      hint.textContent = t("doc.resetHint");
      ctx.announce(t("doc.resetHint"));
      timer = setTimeout(disarm, 5000);
      return;
    }
    disarm();
    onConfirm();
    ctx.announce(t("doc.resetDone"));
  });
  button.addEventListener("blur", () => setTimeout(() => doc.activeElement !== button && disarm(), 150));
  return h(doc, "span", { class: "reset" }, button, hint);
}

/** Enlaces iniciales del front matter (`links`), con tokens ya resueltos. */
export function renderDocLinks(ctx, links) {
  const { doc, t } = ctx;
  const items = [];
  for (const link of Array.isArray(links) ? links : []) {
    const raw = expandTokens(link.url, ctx.tokens);
    const label = ctx.localize(link.label);
    if (!raw.trim() || !isSafeUrl(raw)) {
      items.push(h(doc, "li", {}, h(doc, "span", { class: "chip chip--disabled", title: t("doc.repoUnknownLink") }, icon(doc, link.icon || "link"), h(doc, "span", { text: label }))));
      continue;
    }
    const href = resolveDocumentHref(raw, ctx);
    const external = isExternal(href);
    const anchor = h(doc, "a", { class: ["chip", link.highlight && "chip--accent"], href }, icon(doc, link.icon || (external ? "external-link" : "link")), h(doc, "span", { text: label }));
    if (external) markExternal(doc, t, anchor);
    items.push(h(doc, "li", {}, anchor));
  }
  if (!items.length) return null;
  return h(doc, "nav", { class: "doc-links", "aria-label": t("doc.links") }, h(doc, "ul", { class: "chip-list" }, items));
}

/**
 * Cabecera común de procedimientos y pruebas.
 * @param {object} ctx contexto de vista
 * @param {{entry:object, meta:object, extraMeta?:Array<[string,string,string]>, aside?:Node, onReset?:Function}} opts
 */
export function renderDocHeader(ctx, { entry, meta, extraMeta = [], aside = null, onReset = null }) {
  const { doc, t } = ctx;
  const typeIcon = entry.type === "steps" ? "list-checks" : "flask-conical";
  const sectionLabel = entry.type === "steps" ? t("section.steps") : t("section.tests");

  const breadcrumb = h(
    doc,
    "nav",
    { class: "breadcrumb", "aria-label": t("nav.breadcrumb") },
    h(
      doc,
      "ol",
      {},
      h(doc, "li", {}, h(doc, "a", { href: "#/" }, icon(doc, "house"), h(doc, "span", { text: t("nav.home") }))),
      h(doc, "li", {}, h(doc, "a", { href: `#/?type=${entry.type}` }, sectionLabel)),
      h(doc, "li", {}, h(doc, "span", { "aria-current": "page", text: ctx.localize(meta.title) })),
    ),
  );

  const facts = [
    ["user", t("doc.author"), meta.author || ""],
    ["calendar", t("doc.updated"), ctx.formatDate(meta.updated)],
    ["git-commit-horizontal", t("doc.version"), String(meta.version)],
    ...extraMeta,
  ].filter(([, , value]) => value);

  const tags = Array.isArray(meta.tags) && meta.tags.length
    ? h(doc, "ul", { class: "tag-list", "aria-label": t("doc.tags") }, meta.tags.map((tag) => h(doc, "li", { class: "tag" }, icon(doc, "tag"), tag)))
    : null;

  return h(
    doc,
    "header",
    { class: ["doc-header", `doc-header--${entry.type}`] },
    breadcrumb,
    h(
      doc,
      "div",
      { class: "doc-header__main" },
      h(
        doc,
        "div",
        { class: "doc-header__text" },
        h(doc, "p", { class: "eyebrow" }, icon(doc, typeIcon), h(doc, "span", { text: t(`doc.type.${entry.type}`) })),
        h(doc, "h1", { id: "doc-title", tabindex: "-1", text: ctx.localize(meta.title) }),
        meta.description ? h(doc, "p", { class: "lead", text: ctx.localize(meta.description) }) : null,
        h(
          doc,
          "dl",
          { class: "facts", "aria-label": t("doc.details") },
          facts.map(([name, label, value]) => h(doc, "div", { class: "fact" }, h(doc, "dt", {}, icon(doc, name), h(doc, "span", { text: label })), h(doc, "dd", { text: value }))),
        ),
        tags,
        renderDocLinks(ctx, meta.links),
      ),
      aside || onReset ? h(doc, "div", { class: "doc-header__aside" }, aside, onReset ? resetButton(ctx, onReset) : null) : null,
    ),
  );
}
