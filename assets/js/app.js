// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * app.js — Orquestación del sitio.
 *
 * Rutas (hash, para funcionar igual en la raíz y bajo /{repositorio}/ sin
 * configurar el servidor):
 *   #/                          portada (búsqueda y las tres categorías)
 *   #/?type={categoría}         portada filtrada: procedure | lab-guide | practice-test
 *   #/steps/{slug}[/{paso}]     procedimiento o guía de laboratorio
 *   #/tests/{slug}[/{pregunta}] prueba de práctica
 *
 * Fuente de datos: `documents.manifest.json` (generado en el despliegue). Con
 * «Actualizar desde el repositorio público» se reemplaza durante la sesión
 * por uno leído en vivo de la API pública de GitHub; si falla se conserva el
 * del despliegue.
 *
 * `startApp()` no toca globales: recibe la ventana y las librerías, así que
 * también corre en jsdom para las pruebas de accesibilidad.
 */

import { CONFIG, DOCUMENTATION_MODE } from "./config.js";
import { createI18n } from "./i18n.js";
import { createStore, browserStorage, documentStateKey, liveManifestKey } from "./storage.js";
import { resolveRepository, repositoryTokens, refreshFromGitHub } from "./github.js";
import { createMarkdownRenderer, prismHighlighter, expandTokens, dirname } from "./markdown.js";
import {
  analyzeDocument,
  buildManifestEntry,
  invalidEntry,
  findDuplicateSlugs,
  isCandidatePath,
  enabledTypes,
  enabledCategories,
  categoryOf,
  normalizeCategory,
  normalizeMode,
  filterByMode,
  typeFromRoute,
  routeFor,
} from "./documents.js";
import { renderStepsView } from "./steps.js";
import { renderQuizView } from "./quiz.js";
import { CATEGORY_ICONS } from "./icons.js";
import { h, icon, setIcon, progressBar, markExternal } from "./ui.js";

export const THEME_STORAGE_KEY = "docpages:theme";

/** `#/steps/x/paso` → `{ name: "doc", type: "steps", slug: "x", anchor: "paso" }`; null = ancla normal. */
export function parseRoute(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  if (raw === "" || raw === "/") return { name: "home", params: {} };
  if (!raw.startsWith("/")) return null;
  const [pathPart, query = ""] = raw.split("?");
  const params = Object.fromEntries(new URLSearchParams(query));
  const segments = pathPart
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  if (!segments.length) return { name: "home", params };
  const type = typeFromRoute(segments[0]);
  if (type && segments[1]) return { name: "doc", type, slug: segments[1], anchor: segments[2] || "", params };
  return { name: "not-found", params };
}

/** Minúsculas, sin tildes y con espacios simples. */
export function normalizeText(value) {
  return String(value == null ? "" : value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .trim();
}

const localizedValues = (value) => (value && typeof value === "object" ? Object.values(value) : [value]);

export function searchIndexText(entry) {
  return normalizeText(
    [...localizedValues(entry.title), ...localizedValues(entry.description), ...(entry.tags || []), entry.slug, entry.author, entry.searchText].filter(Boolean).join(" "),
  );
}

/** ¿El documento contiene todos los términos de la búsqueda? */
export function matchesQuery(entry, query, index = searchIndexText(entry)) {
  const terms = normalizeText(query).split(" ").filter(Boolean);
  return terms.every((term) => index.includes(term));
}

async function sha256(win, text) {
  try {
    const subtle = win.crypto && win.crypto.subtle;
    if (!subtle) return "";
    const digest = await subtle.digest("SHA-256", new TextEncoder().encode(text));
    return "sha256-" + [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

/**
 * @param {{win:Window, libs:{markdownit:Function, yaml:object, DOMPurify:object, Prism?:object},
 *          config?:object, mode?:string, fetchImpl?:Function}} options
 */
export function startApp({ win, libs, config = CONFIG, mode = DOCUMENTATION_MODE, fetchImpl = null }) {
  const doc = win.document;
  const activeMode = normalizeMode(mode);
  const fetcher = fetchImpl || (typeof win.fetch === "function" ? win.fetch.bind(win) : null);
  const store = createStore(browserStorage(win, "localStorage"));
  const session = createStore(browserStorage(win, "sessionStorage"));
  const nav = win.navigator || {};
  const i18n = createI18n({
    storage: store,
    navigatorLanguages: nav.languages && nav.languages.length ? [...nav.languages] : [nav.language].filter(Boolean),
    supported: config.languages,
  });
  const t = i18n.t;
  const renderer = createMarkdownRenderer({ markdownit: libs.markdownit, DOMPurify: libs.DOMPurify, highlight: prismHighlighter(libs.Prism) });
  const byId = (id) => doc.getElementById(id);
  const els = {
    main: byId("main"),
    view: byId("view"),
    announcer: byId("announcer"),
    brandTitle: byId("brand-title"),
    repoChip: byId("repo-chip"),
    repoChipText: byId("repo-chip-text"),
    themeToggle: byId("theme-toggle"),
    footerSource: byId("footer-source"),
    lightbox: byId("lightbox"),
    lightboxImg: byId("lightbox-img"),
    lightboxCaption: byId("lightbox-caption"),
    lightboxClose: byId("lightbox-close"),
  };
  const app = { deployed: null, manifest: null, repo: null, schemas: null, view: null, renderToken: 0, docCache: new Map(), notice: null, query: "", homeCategory: "all", started: false };
  const siteTitle = () => i18n.localize(config.siteTitle);
  const liveKey = () => liveManifestKey({ prefix: config.storagePrefix, repository: app.repo });
  const formatPercent = (value) => new Intl.NumberFormat(i18n.lang, { style: "percent", maximumFractionDigits: 0 }).format(value / 100);

  // ── Utilidades de interfaz ────────────────────────────────────────────────
  function announce(message) {
    if (!els.announcer) return;
    els.announcer.textContent = "";
    setTimeout(() => {
      els.announcer.textContent = message;
    }, 30);
  }

  function currentTheme() {
    const explicit = doc.documentElement.dataset.theme;
    if (explicit === "dark" || explicit === "light") return explicit;
    return typeof win.matchMedia === "function" && win.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function paintThemeToggle() {
    if (!els.themeToggle) return;
    const dark = currentTheme() === "dark";
    const label = dark ? t("theme.toLight") : t("theme.toDark");
    els.themeToggle.setAttribute("aria-label", label);
    els.themeToggle.setAttribute("title", label);
    setIcon(els.themeToggle.querySelector("svg"), dark ? "sun" : "moon");
  }

  function paintRepo() {
    if (!els.repoChip) return;
    if (!app.repo) {
      els.repoChip.hidden = true;
      return;
    }
    els.repoChip.hidden = false;
    els.repoChip.setAttribute("href", app.repo.url);
    els.repoChip.setAttribute("aria-label", `${t("repo.view")}: ${app.repo.fullName} ${t("doc.newTab")}`);
    els.repoChip.setAttribute("target", "_blank");
    els.repoChip.setAttribute("rel", "noopener noreferrer");
    if (els.repoChipText) els.repoChipText.textContent = app.repo.fullName;
  }

  function paintFooter() {
    if (!els.footerSource) return;
    els.footerSource.replaceChildren();
    if (!app.repo) {
      els.footerSource.append(t("footer.local"));
      return;
    }
    const link = h(doc, "a", { href: app.repo.url, text: app.repo.fullName });
    markExternal(doc, t, link);
    const sha = app.manifest && app.manifest.source !== "github" && app.manifest.repository && app.manifest.repository.sha;
    els.footerSource.append(`${t("footer.source")} `, link, sha ? ` · ${t("repo.commit", { sha: String(sha).slice(0, 7) })}` : "");
  }

  function translateStatic() {
    doc.documentElement.lang = i18n.lang;
    doc.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    doc.querySelectorAll("[data-i18n-label]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nLabel)));
    if (els.brandTitle) els.brandTitle.textContent = siteTitle();
    doc.querySelectorAll("[data-lang]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.lang === i18n.lang)));
    paintThemeToggle();
    paintRepo();
    paintFooter();
  }

  function openLightbox(src, alt) {
    const dialog = els.lightbox;
    if (!dialog || !els.lightboxImg) return;
    els.lightboxImg.setAttribute("src", src);
    els.lightboxImg.setAttribute("alt", alt || "");
    if (els.lightboxCaption) els.lightboxCaption.textContent = alt || "";
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeLightbox() {
    const dialog = els.lightbox;
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    if (els.lightboxImg) els.lightboxImg.removeAttribute("src");
  }

  // ── Datos ─────────────────────────────────────────────────────────────────
  async function fetchJson(url) {
    const response = await fetcher(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    return response.json();
  }

  function documentUrl(entry) {
    return entry.rawUrl || new URL(entry.path, doc.baseURI).href;
  }

  async function fetchDocument(entry) {
    const url = entry.rawUrl ? entry.rawUrl : `${documentUrl(entry)}?v=${String(entry.hash || "").replace(/^sha256-/, "").slice(0, 12)}`;
    if (app.docCache.has(url)) return app.docCache.get(url);
    const response = await fetcher(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${entry.path}`);
    const text = await response.text();
    app.docCache.set(url, text);
    return text;
  }

  /** Estado guardado: avance (procedimientos y guías) o intento en curso (pruebas). */
  function savedState(entry) {
    const key = documentStateKey({ prefix: config.storagePrefix, repository: app.repo, slug: entry.slug, version: entry.version, type: entry.type });
    const saved = store.getJSON(key);
    return saved && saved.summary && typeof saved.summary.percent === "number" ? saved : null;
  }

  const analyze = (path, text) => analyzeDocument({ path, source: text, yaml: libs.yaml, schemas: app.schemas, renderer, languages: config.languages });

  // ── Vistas ────────────────────────────────────────────────────────────────
  function viewContext({ entry, tokens, docBaseUrl, docDir }) {
    return {
      doc,
      win,
      t,
      lang: i18n.lang,
      localize: i18n.localize,
      formatDate: i18n.formatDate,
      formatDateTime: i18n.formatDateTime,
      formatPercent,
      store,
      announce,
      tokens,
      entry,
      docBaseUrl,
      docDir,
      routeFor,
      documentRoute: (path) => {
        const target = app.manifest.documents.find((d) => d.path === path);
        return target && enabledTypes(activeMode).includes(target.type) ? routeFor(target) : null;
      },
      renderMarkdown: (text) => renderer.renderFragment(expandTokens(text, tokens)),
      renderInline: (text) => renderer.renderInlineFragment(expandTokens(text, tokens)),
      openLightbox,
    };
  }

  function messageView({ title, body = "", hint = "", details = [], iconName = "triangle-alert", retry = false }) {
    return h(
      doc,
      "section",
      { class: "message-view", "aria-labelledby": "message-title" },
      icon(doc, iconName, { className: "message-view__icon" }),
      h(doc, "h1", { id: "message-title", tabindex: "-1", text: title }),
      body ? h(doc, "p", { class: "lead", text: body }) : null,
      details.length ? h(doc, "ul", { class: "error-list" }, details.map((d) => h(doc, "li", {}, h(doc, "code", { text: d.where }), " ", d.message))) : null,
      hint ? h(doc, "p", { class: "hint", text: hint }) : null,
      h(
        doc,
        "p",
        { class: "message-view__actions" },
        retry ? h(doc, "button", { type: "button", class: "btn btn--primary", onClick: () => win.location.reload() }, icon(doc, "refresh-cw"), h(doc, "span", { text: t("error.retry") })) : null,
        h(doc, "a", { class: "btn btn--ghost", href: "#/" }, icon(doc, "house"), h(doc, "span", { text: t("doc.backHome") })),
      ),
    );
  }

  function noticeView() {
    if (!app.notice) return null;
    const iconName = app.notice.kind === "success" ? "circle-check" : app.notice.kind === "warning" ? "triangle-alert" : "circle-x";
    return h(doc, "div", { class: ["notice", `notice--${app.notice.kind}`], role: app.notice.kind === "error" ? "alert" : "status" }, icon(doc, iconName), h(doc, "div", {}, app.notice.messages.map((m) => h(doc, "p", { text: m }))));
  }

  function errorMessage(error) {
    if (error.code === "rate-limited") {
      const reset = error.resetAt ? t("error.rate-limited-reset", { time: i18n.formatTime(error.resetAt) }) : "";
      return t("error.rate-limited", { reset });
    }
    if (error.code === "http") return t("error.http", { status: error.status || "?" });
    return t(`error.${error.code}`);
  }

  async function refresh(button) {
    if (!app.repo) {
      app.notice = { kind: "error", messages: [t("error.no-repo")] };
      return render({ keepFocus: true });
    }
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.querySelector("span").textContent = t("repo.refreshing");
    announce(t("repo.refreshing"));

    const result = await refreshFromGitHub({
      deployed: app.deployed,
      repository: { owner: app.repo.owner, name: app.repo.name, branch: app.repo.branch },
      fetchImpl: fetcher,
      api: config.github.api,
      raw: config.github.raw,
      maxDocuments: config.github.maxDocuments,
      timeoutMs: config.github.timeoutMs,
      isDocumentPath: (path) => isCandidatePath(path, activeMode),
      // Un documento con errores no se descarta: la portada lo muestra con sus errores.
      analyze: async ({ path, text, rawUrl }) => {
        const analysis = analyze(path, text);
        if (analysis.errors.length) return invalidEntry(analysis, { rawUrl });
        return buildManifestEntry(analysis, { hash: await sha256(win, text), size: text.length, rawUrl });
      },
    });

    if (result.ok) {
      const documents = result.manifest.documents;
      for (const duplicate of findDuplicateSlugs(documents.filter((d) => !d.invalid).map((d) => ({ path: d.path, meta: { slug: d.slug } })))) {
        for (const path of duplicate.paths) {
          const index = documents.findIndex((d) => d.path === path);
          documents[index] = invalidEntry({ ...documents[index], errors: [{ line: null, message: duplicate.message }] }, { rawUrl: documents[index].rawUrl });
        }
      }
      app.manifest = result.manifest;
      app.docCache.clear();
      session.setJSON(liveKey(), result.manifest);
      const invalid = documents.filter((d) => d.invalid).length;
      const skipped = (result.skipped || []).length;
      const messages = [t("repo.refreshed", { count: documents.length - invalid, repo: app.repo.fullName })];
      if (invalid) messages.push(t("repo.invalid", { count: invalid }));
      if (skipped) messages.push(t("repo.skipped", { count: skipped }));
      if (result.truncated) messages.push(t("repo.truncated"));
      app.notice = { kind: invalid || skipped ? "error" : result.truncated ? "warning" : "success", messages };
      if (skipped && win.console) win.console.warn("[docpages] Documentos que no se pudieron leer:", result.skipped);
    } else {
      app.notice = { kind: "error", messages: [errorMessage(result.error)] };
    }
    announce(app.notice.messages.join(" "));
    paintFooter();
    return render({ keepFocus: true });
  }

  function useDeployed() {
    session.remove(liveKey());
    app.manifest = app.deployed;
    app.docCache.clear();
    app.notice = null;
    paintFooter();
    return render({ keepFocus: true });
  }

  function renderHome(params) {
    const visible = filterByMode(app.manifest.documents, activeMode);
    const documents = visible.filter((d) => !d.invalid);
    const invalid = visible.filter((d) => d.invalid);
    const categories = enabledCategories(activeMode);
    const requested = normalizeCategory(params.type);
    if (requested && categories.includes(requested)) app.homeCategory = requested;
    if (app.homeCategory !== "all" && !categories.includes(app.homeCategory)) app.homeCategory = "all";
    const live = app.manifest.source === "github";

    // Hero con origen del contenido.
    const sourceBits = [];
    const repoInfo = app.manifest.repository || {};
    if (repoInfo.branch) sourceBits.push(t("repo.branch", { branch: repoInfo.branch }));
    if (!live && repoInfo.sha) sourceBits.push(t("repo.commit", { sha: String(repoInfo.sha).slice(0, 7) }));
    if (app.manifest.generatedAt) sourceBits.push(t("repo.generated", { date: i18n.formatDateTime(app.manifest.generatedAt) }));

    const repoActions = [];
    if (app.repo) {
      const view = h(doc, "a", { class: "btn btn--primary", href: app.repo.url }, icon(doc, "github"), h(doc, "span", { text: t("repo.view") }));
      markExternal(doc, t, view);
      repoActions.push(view);
      const refreshButton = h(doc, "button", { type: "button", class: "btn btn--ghost" }, icon(doc, "refresh-cw"), h(doc, "span", { text: t("repo.refresh") }));
      refreshButton.addEventListener("click", () => refresh(refreshButton));
      repoActions.push(refreshButton);
      if (live) repoActions.push(h(doc, "button", { type: "button", class: "btn btn--link", onClick: useDeployed }, icon(doc, "rotate-ccw"), h(doc, "span", { text: t("repo.useDeployed") })));
    }

    const hero = h(
      doc,
      "section",
      { class: "hero", "aria-labelledby": "home-title" },
      h(doc, "p", { class: "eyebrow" }, icon(doc, app.repo ? "github" : "book-open"), h(doc, "span", { text: app.repo ? app.repo.fullName : t("repo.unknown") })),
      h(doc, "h1", { id: "home-title", tabindex: "-1", text: siteTitle() }),
      h(doc, "p", { class: "lead", text: i18n.localize(config.siteTagline) }),
      repoActions.length ? h(doc, "div", { class: "hero__actions" }, repoActions) : null,
      h(doc, "p", { class: ["hero__source", live && "is-live"] }, icon(doc, live ? "globe" : "git-branch"), h(doc, "span", { text: [live ? t("repo.sourceLive") : t("repo.sourceDeployed"), ...sourceBits].join(" · ") })),
      noticeView(),
    );

    // Búsqueda y filtro por categoría.
    const searchInput = h(doc, "input", { type: "search", id: "search", class: "search__input", placeholder: t("home.searchPlaceholder"), autocomplete: "off", spellcheck: "false", "aria-describedby": "search-status" });
    searchInput.value = app.query;
    const searchStatus = h(doc, "p", { id: "search-status", class: "search__status", role: "status" });
    const search = h(doc, "div", { class: "search", role: "search" }, h(doc, "label", { for: "search", class: "sr-only", text: t("home.searchLabel") }), icon(doc, "search", { className: "search__icon" }), searchInput, searchStatus);

    const filterButtons = new Map();
    const filter =
      categories.length > 1
        ? h(
            doc,
            "div",
            { class: "segmented", role: "group", "aria-label": t("home.filter") },
            ["all", ...categories].map((category) => {
              const count = category === "all" ? documents.length : documents.filter((d) => categoryOf(d) === category).length;
              const label = category === "all" ? t("home.filterAll") : t(`section.${category}`);
              const button = h(doc, "button", { type: "button", class: "segmented__option", "aria-pressed": "false", dataset: { category } }, label, h(doc, "span", { class: "segmented__count", text: String(count) }));
              button.addEventListener("click", () => {
                app.homeCategory = category;
                applyFilters();
              });
              filterButtons.set(category, button);
              return button;
            }),
          )
        : null;

    // Secciones y tarjetas.
    const cards = [];
    const sections = categories.map((category) => {
      const docs = documents.filter((d) => categoryOf(d) === category);
      const titleId = `section-${category}`;
      const list = h(
        doc,
        "ul",
        { class: "card-grid" },
        docs.map((entry) => {
          const card = renderCard(entry);
          cards.push({ entry, category, card, index: searchIndexText(entry) });
          return card;
        }),
      );
      const empty = h(doc, "p", { class: "empty", hidden: docs.length > 0 });
      const count = h(doc, "span", { class: "section-count" });
      const section = h(
        doc,
        "section",
        { class: ["doc-section", `doc-section--${category}`], "aria-labelledby": titleId, dataset: { category } },
        h(doc, "div", { class: "doc-section__head" }, h(doc, "h2", { id: titleId, class: "section-title" }, icon(doc, CATEGORY_ICONS[category]), h(doc, "span", { text: t(`section.${category}`) }), count), h(doc, "p", { class: "hint", text: t(`section.hint.${category}`) })),
        list,
        empty,
      );
      return { category, section, count, empty, docs };
    });

    function applyFilters() {
      app.query = searchInput.value;
      let total = 0;
      for (const { category, card, entry, index } of cards) {
        const show = (app.homeCategory === "all" || app.homeCategory === category) && matchesQuery(entry, app.query, index);
        card.hidden = !show;
        if (show) total += 1;
      }
      for (const s of sections) {
        const shown = cards.filter((c) => c.category === s.category && !c.card.hidden).length;
        s.section.hidden = app.homeCategory !== "all" && app.homeCategory !== s.category;
        s.count.textContent = String(shown);
        s.empty.hidden = shown > 0;
        s.empty.textContent = s.docs.length ? t("home.noResults", { query: app.query.trim() }) : t(`home.empty.${s.category}`);
      }
      for (const [category, button] of filterButtons) button.setAttribute("aria-pressed", String(category === app.homeCategory));
      searchStatus.textContent = app.query.trim() ? t("home.results", { count: total }) : t("home.documents", { count: total });
    }

    searchInput.addEventListener("input", applyFilters);
    applyFilters();

    doc.title = siteTitle();
    return h(doc, "div", { class: "home" }, hero, invalid.length ? renderInvalid(invalid) : null, h(doc, "div", { class: "toolbar" }, search, filter), sections.map((s) => s.section));
  }

  /** Documentos que no siguen el formato (solo aparecen al leer en vivo desde GitHub). */
  function renderInvalid(entries) {
    const branch = (app.manifest.repository && app.manifest.repository.branch) || (app.repo && app.repo.branch) || "main";
    const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
    return h(
      doc,
      "section",
      { class: "invalid-docs", "aria-labelledby": "invalid-title" },
      h(doc, "h2", { id: "invalid-title", class: "section-title" }, icon(doc, "file-warning"), h(doc, "span", { text: t("home.invalidTitle") }), h(doc, "span", { class: "section-count", text: String(entries.length) })),
      h(doc, "p", { class: "invalid-docs__hint", text: t("home.invalidHint") }),
      h(
        doc,
        "ul",
        { class: "invalid-docs__list" },
        entries.map((entry) => {
          let source = null;
          if (app.repo) {
            source = h(doc, "a", { class: "invalid-doc__source", href: `${app.repo.url}/blob/${encodePath(branch)}/${encodePath(entry.path)}` }, icon(doc, "github"), h(doc, "span", { text: t("home.invalidOpen") }));
            markExternal(doc, t, source);
          }
          return h(
            doc,
            "li",
            { class: "invalid-doc" },
            h(doc, "p", { class: "invalid-doc__path" }, icon(doc, "file-text"), h(doc, "code", { text: entry.path }), source),
            h(doc, "ul", { class: "error-list" }, (entry.errors || []).map((e) => h(doc, "li", {}, h(doc, "code", { text: e.line ? t("home.line", { line: e.line }) : "—" }), " ", e.message))),
          );
        }),
      ),
    );
  }

  function renderCard(entry) {
    const category = categoryOf(entry);
    const saved = savedState(entry);
    const summary = saved && saved.summary;
    const titleId = `card-${entry.type}-${entry.slug}`;
    let status;
    if (entry.type === "steps") {
      const text = summary ? t("card.progress", { percent: formatPercent(summary.percent) }) : t("card.notStarted");
      const bar = progressBar(doc, { label: `${i18n.localize(entry.title)}: ${t(`steps.progress.${category}`)}`, className: "progress--small" });
      bar.update(summary ? summary.percent : 0, text);
      status = h(doc, "div", { class: "card__status" }, bar.element, h(doc, "span", { class: "card__status-text", text }));
    } else {
      const parts = [];
      let badge = null;
      if (summary && summary.finished) {
        badge = h(doc, "span", { class: ["badge", summary.passed ? "status--passed" : "status--failed"] }, icon(doc, summary.passed ? "trophy" : "circle-x"), h(doc, "span", { text: t(summary.passed ? "quiz.passed" : "quiz.failed") }));
        parts.push(t("card.lastResult", { percent: formatPercent(summary.percent) }));
      } else if (summary && summary.answered) {
        parts.push(t("card.inProgress", { answered: summary.answered, total: summary.questions }));
      } else {
        parts.push(t("card.notTaken"));
      }
      if (saved && saved.attempts && typeof saved.best === "number") parts.push(t("card.best", { percent: formatPercent(saved.best) }));
      status = h(doc, "div", { class: "card__status" }, badge, h(doc, "span", { class: "card__status-text", text: parts.join(" · ") }));
    }
    const facts = [
      h(doc, "span", {}, icon(doc, "calendar"), t("card.updated", { date: i18n.formatDate(entry.updated) })),
      h(doc, "span", {}, icon(doc, "git-commit-horizontal"), `v${entry.version}`),
      entry.type === "steps" && entry.stepCount ? h(doc, "span", {}, icon(doc, "list-checks"), t("card.steps", { count: entry.stepCount })) : null,
      entry.type === "test" && entry.questionCount ? h(doc, "span", {}, icon(doc, "circle-help"), t("card.questions", { count: entry.questionCount })) : null,
      entry.duration ? h(doc, "span", {}, icon(doc, "timer"), i18n.localize(entry.duration)) : null,
    ];
    return h(
      doc,
      "li",
      { class: ["card", `card--${category}`], dataset: { slug: entry.slug } },
      h(doc, "p", { class: "card__type" }, icon(doc, CATEGORY_ICONS[category]), h(doc, "span", { text: t(`category.${category}`) })),
      h(doc, "h3", { class: "card__title", id: titleId }, h(doc, "a", { class: "card__link", href: routeFor(entry), text: i18n.localize(entry.title) })),
      entry.description ? h(doc, "p", { class: "card__desc", text: i18n.localize(entry.description) }) : null,
      status,
      h(doc, "p", { class: "card__meta" }, facts),
      entry.tags && entry.tags.length ? h(doc, "ul", { class: "tag-list tag-list--small", "aria-label": t("doc.tags") }, entry.tags.map((tag) => h(doc, "li", { class: "tag", text: tag }))) : null,
    );
  }

  function invalidView(entry, errors) {
    return messageView({
      title: t("doc.invalid"),
      body: entry.path,
      hint: t("doc.invalidHint"),
      details: errors.map((e) => ({ where: e.line ? `${entry.path}:${e.line}` : entry.path, message: e.message })),
      iconName: "file-warning",
    });
  }

  async function renderDocument(route, token) {
    if (!enabledTypes(activeMode).includes(route.type)) return messageView({ title: t("doc.notFound"), body: t("doc.disabled"), iconName: "ban" });
    const entry = app.manifest.documents.find((d) => d.type === route.type && d.slug === route.slug);
    if (!entry) return messageView({ title: t("doc.notFound"), body: t("doc.notFoundBody"), iconName: "file-text" });
    if (entry.invalid) return invalidView(entry, entry.errors || []);

    let text;
    try {
      text = await fetchDocument(entry);
    } catch (error) {
      if (token !== app.renderToken) return null;
      return messageView({ title: t("doc.loadError"), body: String(error.message || error), retry: true });
    }
    if (token !== app.renderToken) return null;

    const analysis = analyze(entry.path, text);
    if (analysis.errors.length) return invalidView(entry, analysis.errors);
    const meta = analysis.meta;
    const tokens = {
      ...repositoryTokens(app.repo),
      title: i18n.localize(meta.title),
      description: i18n.localize(meta.description),
      version: String(meta.version),
      author: meta.author || "",
      updated: meta.updated,
      slug: meta.slug,
    };
    const current = { ...entry, category: analysis.category };
    const ctx = viewContext({ entry: current, tokens, docBaseUrl: documentUrl(entry), docDir: dirname(entry.path) });
    const stateKey = documentStateKey({ prefix: config.storagePrefix, repository: app.repo, slug: meta.slug, version: meta.version, type: entry.type });
    const view = entry.type === "steps" ? renderStepsView(ctx, { entry: current, analysis, stateKey, anchor: route.anchor }) : renderQuizView(ctx, { entry: current, analysis, stateKey });
    view.key = `${entry.type}:${entry.slug}`;
    view.lang = i18n.lang;
    doc.title = `${i18n.localize(meta.title)} · ${siteTitle()}`;
    return view;
  }

  // ── Router ────────────────────────────────────────────────────────────────
  async function render({ keepFocus = false, preserveScroll = false } = {}) {
    if (!app.manifest) return;
    const route = parseRoute(win.location.hash);
    if (!route) return;

    // Mismo documento, otra ancla: no se reconstruye la vista.
    if (route.name === "doc" && app.view && app.view.key === `${route.type}:${route.slug}` && app.view.lang === i18n.lang && !keepFocus && !preserveScroll) {
      if (route.anchor) app.view.focusAnchor(route.anchor);
      return;
    }

    const token = ++app.renderToken;
    const scrollY = win.scrollY || 0;
    els.view.setAttribute("aria-busy", "true");
    let element = null;
    let view = null;
    if (route.name === "home") element = renderHome(route.params);
    else if (route.name === "doc") {
      const result = await renderDocument(route, token);
      if (token !== app.renderToken) return;
      if (result && result.element) {
        view = result;
        element = result.element;
      } else element = result;
    } else element = messageView({ title: t("doc.notFound"), body: t("doc.notFoundBody"), iconName: "file-text" });
    if (token !== app.renderToken || !element) return;

    if (app.view && typeof app.view.destroy === "function") app.view.destroy();
    app.view = view;
    if (route.name !== "home") app.notice = null;
    els.view.replaceChildren(element);
    els.view.removeAttribute("aria-busy");
    // Con ancla (#/…/paso o #/…/pregunta) el foco va a ese elemento, no al título.
    const anchored = Boolean(route.name === "doc" && view && route.anchor);
    if (anchored) view.focusAnchor(route.anchor);
    else if (preserveScroll && typeof win.scrollTo === "function") win.scrollTo(0, scrollY);
    else if (app.started && typeof win.scrollTo === "function") win.scrollTo(0, 0);

    if (app.started && !preserveScroll && !anchored) {
      const heading = keepFocus ? null : els.view.querySelector("h1[tabindex]");
      if (heading) heading.focus({ preventScroll: true });
    }
    app.started = true;
  }

  async function navigate(hash) {
    if (win.history && typeof win.history.pushState === "function") win.history.pushState(null, "", hash);
    else win.location.hash = hash;
    await render();
  }

  // ── Eventos globales ──────────────────────────────────────────────────────
  doc.querySelectorAll("[data-lang]").forEach((button) =>
    button.addEventListener("click", () => {
      if (button.dataset.lang === i18n.lang) return;
      i18n.setLanguage(button.dataset.lang);
    }),
  );
  i18n.onChange(() => {
    translateStatic();
    render({ preserveScroll: true });
  });

  if (els.themeToggle) {
    els.themeToggle.addEventListener("click", () => {
      const next = currentTheme() === "dark" ? "light" : "dark";
      doc.documentElement.dataset.theme = next;
      store.set(THEME_STORAGE_KEY, next);
      paintThemeToggle();
    });
  }
  if (typeof win.matchMedia === "function") {
    const media = win.matchMedia("(prefers-color-scheme: dark)");
    if (media && typeof media.addEventListener === "function") media.addEventListener("change", paintThemeToggle);
  }

  doc.querySelectorAll(".skip-link").forEach((link) =>
    link.addEventListener("click", (event) => {
      event.preventDefault();
      els.main.focus();
    }),
  );

  if (els.lightbox) {
    if (els.lightboxClose) els.lightboxClose.addEventListener("click", closeLightbox);
    els.lightbox.addEventListener("click", (event) => {
      if (event.target === els.lightbox) closeLightbox();
    });
    els.lightbox.addEventListener("close", () => els.lightboxImg && els.lightboxImg.removeAttribute("src"));
  }

  doc.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing = target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable);
    if (event.key === "/" && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const search = byId("search");
      if (search) {
        event.preventDefault();
        search.focus();
      }
    }
  });

  win.addEventListener("hashchange", () => render());

  // ── Arranque ──────────────────────────────────────────────────────────────
  translateStatic();

  const ready = (async () => {
    try {
      const [deployed, steps, test] = await Promise.all([fetchJson(config.manifestUrl), fetchJson("schemas/steps.schema.json"), fetchJson("schemas/test.schema.json")]);
      if (!deployed || !Array.isArray(deployed.documents)) throw new Error("documents.manifest.json no tiene la lista «documents».");
      app.deployed = deployed;
      app.schemas = { steps, test };
    } catch (error) {
      els.view.removeAttribute("aria-busy");
      els.view.replaceChildren(messageView({ title: t("error.manifest"), body: t("error.manifestHint"), details: [{ where: config.manifestUrl, message: String(error.message || error) }], retry: true }));
      return;
    }
    app.repo = resolveRepository({ location: win.location, override: config.repository, manifestRepository: app.deployed.repository });
    const live = session.getJSON(liveKey());
    app.manifest = live && live.source === "github" && Array.isArray(live.documents) ? live : app.deployed;
    paintRepo();
    paintFooter();
    await render();
  })();

  return {
    ready,
    navigate,
    render,
    i18n,
    get repository() {
      return app.repo;
    },
    get manifest() {
      return app.manifest;
    },
    get view() {
      return app.view;
    },
  };
}
