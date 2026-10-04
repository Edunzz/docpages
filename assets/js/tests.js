// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * tests.js — Pruebas `{titulo}.test.md`: resumen de estados y vista.
 *
 * El resultado documentado (front matter + `:::testcase status="…"`) nunca se
 * modifica. Lo único interactivo y local es:
 *   - el filtro de casos por estado;
 *   - la «re-ejecución local»: el lector puede registrar su propio resultado
 *     por caso para repetir la prueba.
 * Ambos se guardan en `docpages:{repo}:{slug}:{version}:test` y «Reiniciar»
 * los borra.
 */

import { groupLanguageBlocks, pickLanguageVariant, languageOf, markdownOf, localizedAttribute, expandTokens, resolveRelativePath } from "./markdown.js";
import { STATUS_ICONS } from "./icons.js";
import { h, icon, statusBadge, enhanceContent, renderDocHeader, resolveDocumentHref, markExternal, hydrateTaskMarkers } from "./ui.js";

/** Orden de presentación de los estados. */
export const TEST_STATUSES = Object.freeze(["passed", "failed", "blocked", "partial", "running", "not-run"]);
export const SUMMARY_KEYS = Object.freeze([...TEST_STATUSES, "total"]);

export function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();
  return TEST_STATUSES.includes(status) ? status : null;
}

export function buildTestModel(nodes) {
  const cases = [];
  for (const node of nodes) {
    if (node.kind !== "directive" || node.name !== "testcase") continue;
    const id = node.attrs.id || `case-${cases.length + 1}`;
    cases.push({
      id,
      title: localizedAttribute(node.attrs, "title") || id,
      status: normalizeStatus(node.attrs.status) || "not-run",
      line: node.line,
      node,
      evidence: node.children
        .filter((child) => child.kind === "directive" && child.name === "evidence")
        .map((child) => ({
          type: String(child.attrs.type || "").toLowerCase(),
          label: localizedAttribute(child.attrs, "label"),
          target: (markdownOf(child.children).split("\n").map((line) => line.trim()).find(Boolean) || ""),
          line: child.line,
        })),
    });
  }
  return { cases };
}

/** Cuenta casos por estado. `statusOf` permite resumir la re-ejecución local. */
export function summarizeCases(cases, statusOf = (testCase) => testCase.status) {
  const summary = Object.fromEntries(SUMMARY_KEYS.map((key) => [key, 0]));
  for (const testCase of cases) {
    const status = statusOf(testCase);
    if (!status) continue;
    summary[status] += 1;
    summary.total += 1;
  }
  return summary;
}

/**
 * Estado global a partir del resumen:
 * failed > blocked > partial > running > (todo sin ejecutar → not-run) >
 * (algo sin ejecutar → partial) > passed.
 */
export function deriveOverallStatus(summary) {
  if (!summary || !summary.total) return "not-run";
  if (summary.failed) return "failed";
  if (summary.blocked) return "blocked";
  if (summary.partial) return "partial";
  if (summary.running) return "running";
  if (summary["not-run"] === summary.total) return "not-run";
  if (summary["not-run"]) return "partial";
  return "passed";
}

export function restoreTestState(raw, model) {
  const ids = new Set(model.cases.map((c) => c.id));
  const local = {};
  if (raw && raw.local && typeof raw.local === "object") {
    for (const [id, status] of Object.entries(raw.local)) if (ids.has(id) && normalizeStatus(status)) local[id] = status;
  }
  const filter = raw && (raw.filter === "all" || normalizeStatus(raw.filter)) ? raw.filter : "all";
  return { filter, local };
}

export function serializeTestState(state, now = new Date()) {
  return { v: 1, filter: state.filter, local: { ...state.local }, updatedAt: now.toISOString() };
}

// ─────────────────────────────────── Vista ───────────────────────────────────

const domId = (prefix, id) => `${prefix}-${String(id).replace(/[^\w-]/g, "_")}`;
const FIELD_RE = /^(?:(expected|esperado|resultado esperado)|(actual|obtenido|resultado obtenido))\b/i;

/** Marca los párrafos «**Esperado:** …» / «**Obtenido:** …» para darles estilo. */
function decorateFields(container) {
  container.querySelectorAll("p").forEach((p) => {
    const first = p.firstElementChild;
    if (!first || first.nodeName !== "STRONG" || p.firstChild !== first) return;
    const match = FIELD_RE.exec(first.textContent.trim());
    if (!match) return;
    p.classList.add("case__field", match[1] ? "case__field--expected" : "case__field--actual");
  });
}

/**
 * @param {object} ctx contexto de vista (ver app.js)
 * @param {{entry:object, analysis:object, stateKey:string, anchor?:string}} input
 */
export function renderTestView(ctx, { entry, analysis, stateKey, anchor = "" }) {
  const { doc, t } = ctx;
  const meta = analysis.meta;
  const model = analysis.model;
  const summary = summarizeCases(model.cases);
  const overall = normalizeStatus(meta.status) || deriveOverallStatus(summary);
  let state = restoreTestState(ctx.store.getJSON(stateKey), model);
  const refs = { cases: new Map(), selects: new Map(), chips: new Map() };
  const save = () => ctx.store.setJSON(stateKey, serializeTestState(state, new Date()));

  // ── Veredicto y resumen ───────────────────────────────────────────────────
  const verdict = h(
    doc,
    "div",
    { class: ["verdict", `status--${overall}`] },
    icon(doc, STATUS_ICONS[overall], { className: "verdict__icon" }),
    h(doc, "div", {}, h(doc, "span", { class: "verdict__label", text: t("tests.verdict") }), h(doc, "strong", { class: "verdict__value", text: t(`status.${overall}`) })),
  );

  const cards = ["passed", "failed", "blocked", "partial"].map((status) =>
    h(doc, "li", { class: ["stat", `status--${status}`] }, icon(doc, STATUS_ICONS[status], { className: "stat__icon" }), h(doc, "span", { class: "stat__value", text: String(summary[status]) }), h(doc, "span", { class: "stat__label", text: t(`summary.${status}`) })),
  );
  cards.push(h(doc, "li", { class: "stat stat--total" }, icon(doc, "layers", { className: "stat__icon" }), h(doc, "span", { class: "stat__value", text: String(summary.total) }), h(doc, "span", { class: "stat__label", text: t("summary.total") })));

  const extraStatuses = ["running", "not-run"].filter((status) => summary[status] > 0);
  const distributionText = TEST_STATUSES.filter((s) => summary[s] > 0).map((s) => `${summary[s]} ${t(`summary.${s}`).toLowerCase()}`).join(", ");
  const distribution = h(
    doc,
    "div",
    { class: "distribution", role: "img", "aria-label": `${t("summary.distribution")}: ${distributionText}` },
    TEST_STATUSES.filter((s) => summary[s] > 0).map((status) => {
      const segment = h(doc, "span", { class: ["distribution__segment", `status--${status}`], title: `${t(`summary.${status}`)}: ${summary[status]}` });
      segment.style.flexGrow = String(summary[status]);
      return segment;
    }),
  );
  const declared = meta.summary && typeof meta.summary === "object" ? meta.summary : null;
  const mismatch = declared && SUMMARY_KEYS.some((key) => declared[key] != null && declared[key] !== summary[key]);

  const summarySection = h(
    doc,
    "section",
    { class: "summary", "aria-labelledby": "summary-title" },
    h(doc, "h2", { id: "summary-title", class: "section-title", text: t("summary.title") }),
    h(doc, "ul", { class: "stat-grid" }, cards),
    distribution,
    extraStatuses.length ? h(doc, "p", { class: "summary__extra" }, extraStatuses.map((s) => statusBadge(doc, t, s, { className: "badge--count" })).map((badge, i) => (badge.append(` ${summary[extraStatuses[i]]}`), badge))) : null,
    mismatch ? h(doc, "p", { class: "notice notice--warning" }, icon(doc, "triangle-alert"), h(doc, "span", { text: t("summary.mismatch") })) : null,
  );

  // ── Casos ─────────────────────────────────────────────────────────────────
  const localSummary = h(doc, "p", { class: "local-summary", role: "status" });
  const emptyFilter = h(doc, "p", { class: "empty", hidden: true, text: t("tests.noCases") });

  const renderMarkdownItem = (item) => {
    if (item.kind === "lang-group") {
      const variant = pickLanguageVariant(item, ctx.lang);
      const block = h(doc, "div", { class: "lang-block", lang: languageOf(variant) || null });
      block.append(ctx.renderMarkdown(markdownOf(variant.children)));
      hydrateTaskMarkers(doc, block);
      return block;
    }
    const block = h(doc, "div", { class: "md" });
    block.append(ctx.renderMarkdown(item.text));
    hydrateTaskMarkers(doc, block);
    return block;
  };

  const renderEvidence = (evidence) => {
    const label = ctx.localize(evidence.label) || evidence.target;
    const target = expandTokens(evidence.target, ctx.tokens);
    if (evidence.type === "image") {
      const path = resolveRelativePath(ctx.docDir, target);
      if (!path) return null;
      const src = resolveDocumentHref(target, { ...ctx, documentRoute: null });
      const img = h(doc, "img", { src, alt: label, loading: "lazy", decoding: "async" });
      const zoom = h(doc, "button", { type: "button", class: "zoomable", "aria-label": t("tests.openImage", { label }) }, img, h(doc, "span", { class: "zoomable__hint", "aria-hidden": "true" }, icon(doc, "zoom-in")));
      zoom.addEventListener("click", () => ctx.openLightbox(src, label));
      return h(doc, "li", { class: "evidence evidence--image" }, h(doc, "figure", {}, zoom, h(doc, "figcaption", { text: label })));
    }
    const href = resolveDocumentHref(target, ctx);
    if (!href) return null;
    const anchorEl = h(doc, "a", { class: "evidence__link", href }, icon(doc, /^https?:/i.test(href) ? "external-link" : "file-text"), h(doc, "span", { text: label }));
    if (/^https?:/i.test(href)) markExternal(doc, t, anchorEl);
    return h(doc, "li", { class: "evidence evidence--link" }, anchorEl);
  };

  const renderCase = (testCase) => {
    const titleId = domId("case-title", testCase.id);
    const body = h(doc, "div", { class: "case__body" });
    for (const item of groupLanguageBlocks(testCase.node.children)) {
      if (item.kind === "directive") continue;
      if (item.kind === "markdown" && !item.text.trim()) continue;
      body.append(renderMarkdownItem(item));
    }
    decorateFields(body);

    const evidenceItems = testCase.evidence.map(renderEvidence).filter(Boolean);
    const selectId = domId("local", testCase.id);
    const select = h(
      doc,
      "select",
      { id: selectId, class: "select" },
      h(doc, "option", { value: "", text: t("tests.localNone") }),
      TEST_STATUSES.map((status) => h(doc, "option", { value: status, text: t(`status.${status}`) })),
    );
    select.value = state.local[testCase.id] || "";
    select.addEventListener("change", () => {
      if (select.value) state.local[testCase.id] = select.value;
      else delete state.local[testCase.id];
      save();
      syncLocal();
    });
    refs.selects.set(testCase.id, select);

    const article = h(
      doc,
      "article",
      { class: ["case", `status--${testCase.status}`], id: domId("case", testCase.id), "aria-labelledby": titleId, dataset: { status: testCase.status, id: testCase.id } },
      h(doc, "header", { class: "case__header" }, h(doc, "h3", { class: "case__title", id: titleId, text: ctx.localize(testCase.title) }), statusBadge(doc, t, testCase.status)),
      h(doc, "p", { class: "case__id" }, icon(doc, "tag"), h(doc, "span", { class: "sr-only", text: `${t("tests.caseId")}: ` }), h(doc, "code", { text: testCase.id })),
      body,
      evidenceItems.length ? h(doc, "div", { class: "case__evidence" }, h(doc, "h4", { text: t("tests.evidence") }), h(doc, "ul", { class: "evidence-list" }, evidenceItems)) : null,
      h(doc, "div", { class: "case__local" }, h(doc, "label", { for: selectId, text: t("tests.localRun") }), select),
    );
    refs.cases.set(testCase.id, article);
    return article;
  };

  const filterOptions = ["all", ...TEST_STATUSES.filter((s) => summary[s] > 0)];
  const toolbar = h(
    doc,
    "div",
    { class: "cases-toolbar" },
    h(doc, "h2", { class: "section-title", id: "cases-title", text: t("tests.cases") }),
    h(
      doc,
      "div",
      { class: "chip-group", role: "group", "aria-label": t("tests.filter") },
      filterOptions.map((option) => {
        const count = option === "all" ? summary.total : summary[option];
        const chip = h(doc, "button", { type: "button", class: ["chip", "chip--filter", option !== "all" && `status--${option}`], "aria-pressed": "false", dataset: { filter: option } }, option === "all" ? null : icon(doc, STATUS_ICONS[option]), h(doc, "span", { text: option === "all" ? t("tests.filterAll") : t(`status.${option}`) }), h(doc, "span", { class: "chip__count", text: String(count) }));
        chip.addEventListener("click", () => {
          state.filter = option;
          save();
          syncFilter();
        });
        refs.chips.set(option, chip);
        return chip;
      }),
    ),
    h(doc, "p", { class: "hint", text: t("tests.localRunHint") }),
    localSummary,
  );

  const content = h(doc, "div", { class: "test-content" });
  let toolbarPlaced = false;
  for (const item of groupLanguageBlocks(analysis.nodes)) {
    if (item.kind === "directive" && item.name === "testcase") {
      if (!toolbarPlaced) {
        content.append(toolbar);
        toolbarPlaced = true;
      }
      const testCase = model.cases.find((c) => c.node === item);
      if (testCase) content.append(renderCase(testCase));
    } else if (!(item.kind === "markdown" && !item.text.trim())) {
      if (toolbarPlaced && refs.cases.size === model.cases.length && !content.contains(emptyFilter)) content.append(emptyFilter);
      content.append(renderMarkdownItem(item));
    }
  }
  if (!content.contains(emptyFilter)) content.append(emptyFilter);

  function syncFilter() {
    let visible = 0;
    for (const [option, chip] of refs.chips) chip.setAttribute("aria-pressed", String(option === state.filter));
    for (const testCase of model.cases) {
      const show = state.filter === "all" || testCase.status === state.filter;
      refs.cases.get(testCase.id).hidden = !show;
      if (show) visible += 1;
    }
    emptyFilter.hidden = visible > 0;
  }

  function syncLocal() {
    const local = summarizeCases(model.cases, (c) => state.local[c.id] || null);
    const parts = TEST_STATUSES.filter((s) => local[s] > 0).map((s) => `${local[s]} ${t(`summary.${s}`).toLowerCase()}`);
    localSummary.textContent = t("tests.localSummary", { recorded: local.total, total: model.cases.length }) + (parts.length ? ` · ${parts.join(", ")}` : "");
    for (const [id, select] of refs.selects) {
      select.value = state.local[id] || "";
      refs.cases.get(id).dataset.local = state.local[id] || "";
    }
  }

  function reset() {
    ctx.store.remove(stateKey);
    state = { filter: "all", local: {} };
    syncFilter();
    syncLocal();
  }

  const extraMeta = [
    ["clock", t("doc.executedAt"), meta.executedAt ? ctx.formatDateTime(meta.executedAt) : ""],
    ["server", t("doc.environment"), ctx.localize(meta.environment)],
  ];
  const header = renderDocHeader(ctx, { entry, meta, extraMeta, aside: verdict, onReset: meta.reset === false ? null : reset });
  const element = h(doc, "article", { class: "doc doc--test", "aria-labelledby": "doc-title" }, header, summarySection, content);

  enhanceContent(content, ctx);
  syncFilter();
  syncLocal();

  return {
    element,
    focusAnchor(id) {
      const target = refs.cases.get(id);
      if (!target) return;
      if (target.hidden) {
        state.filter = "all";
        syncFilter();
      }
      if (typeof target.scrollIntoView === "function") target.scrollIntoView({ block: "start" });
    },
    destroy() {},
    _state: () => state,
  };
}
