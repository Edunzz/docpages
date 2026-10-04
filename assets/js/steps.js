// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * steps.js — Procedimientos y guías de laboratorio `{titulo}.steps.md`:
 * modelo de progreso y vista. Ambos comparten formato; `kind` solo cambia
 * los textos y la presentación.
 *
 * Modelo de progreso («hojas»): la unidad mínima completable es
 *   - cada casilla `- [ ]`, con clave `{nodo}#{n}`;
 *   - cada subpaso SIN casillas, con clave `{subpaso}`;
 *   - cada paso SIN subpasos ni casillas, con clave `{paso}`.
 * Un paso o subpaso está completo cuando todas sus hojas lo están, y
 * «Marcar como completado» marca (o desmarca) todas sus hojas a la vez.
 * Progreso = hojas completas / hojas totales (redondeo hacia abajo: el 100 %
 * solo aparece cuando de verdad está todo).
 *
 * El estado se guarda en localStorage como
 *   { v:1, done:[claves], current:"paso", updatedAt, summary:{done,total,percent} }
 * bajo `docpages:{repo}:{slug}:{version}:steps`. Las claves que ya no existen
 * en el documento se descartan al cargar.
 */

import { groupLanguageBlocks, pickLanguageVariant, languageOf, markdownOf, localizedAttribute } from "./markdown.js";
import { h, icon, setIcon, progressBar, enhanceContent, renderDocHeader, prefersReducedMotion, hydrateTaskMarkers } from "./ui.js";

export const taskKey = (nodeId, index) => `${nodeId}#${index}`;
const range = (n) => Array.from({ length: n }, (_, i) => i);

/** Casillas propias de un nodo (sin contar las de sus subpasos). */
function countOwnTasks(children, countTasks) {
  return groupLanguageBlocks(children).reduce((total, item) => {
    if (item.kind === "markdown") return total + countTasks(item.text);
    if (item.kind === "lang-group") return total + countTasks(markdownOf(item.variants[0].children));
    return total;
  }, 0);
}

/**
 * @param {Array} nodes árbol de parseDirectives
 * @param {{countTasks?:(text:string)=>number}} opts
 */
export function buildStepsModel(nodes, { countTasks = () => 0 } = {}) {
  const steps = [];
  const nodesById = new Map();

  for (const node of nodes) {
    if (node.kind !== "directive" || node.name !== "step") continue;
    const id = node.attrs.id || `step-${steps.length + 1}`;
    const step = { kind: "step", id, index: steps.length, title: localizedAttribute(node.attrs, "title") || id, line: node.line, node, ownTasks: countOwnTasks(node.children, countTasks), substeps: [], leaves: [] };

    for (const child of node.children) {
      if (child.kind !== "directive" || child.name !== "substep") continue;
      const subId = child.attrs.id || `${id}-sub-${step.substeps.length + 1}`;
      const tasks = countOwnTasks(child.children, countTasks);
      const substep = { kind: "substep", id: subId, parent: id, title: localizedAttribute(child.attrs, "title") || subId, line: child.line, node: child, tasks, leaves: tasks ? range(tasks).map((i) => taskKey(subId, i)) : [subId] };
      step.substeps.push(substep);
      nodesById.set(subId, substep);
    }

    step.leaves = [...range(step.ownTasks).map((i) => taskKey(id, i)), ...step.substeps.flatMap((s) => s.leaves)];
    if (!step.leaves.length) step.leaves = [id];
    steps.push(step);
    nodesById.set(id, step);
  }

  return { steps, nodesById, leaves: steps.flatMap((s) => s.leaves) };
}

/** Hojas bajo un paso, subpaso o casilla. */
export function leavesOf(model, id) {
  const node = model.nodesById.get(id);
  if (node) return node.leaves;
  return model.leaves.includes(id) ? [id] : [];
}

export function isComplete(model, done, id) {
  const leaves = leavesOf(model, id);
  return leaves.length > 0 && leaves.every((key) => done.has(key));
}

/** Marca (value=true) o desmarca todas las hojas de un nodo. Devuelve un Set nuevo. */
export function setDone(model, done, id, value) {
  const next = new Set(done);
  for (const key of leavesOf(model, id)) {
    if (value) next.add(key);
    else next.delete(key);
  }
  return next;
}

export function computeProgress(model, done) {
  const count = (leaves) => leaves.filter((key) => done.has(key)).length;
  const steps = model.steps.map((step) => {
    const stepDone = count(step.leaves);
    return {
      id: step.id,
      done: stepDone,
      total: step.leaves.length,
      complete: stepDone === step.leaves.length,
      started: stepDone > 0,
      substeps: step.substeps.map((sub) => {
        const subDone = count(sub.leaves);
        return { id: sub.id, done: subDone, total: sub.leaves.length, complete: subDone === sub.leaves.length };
      }),
    };
  });
  const total = model.leaves.length;
  const doneCount = count(model.leaves);
  return { done: doneCount, total, percent: total ? Math.floor((doneCount * 100) / total) : 0, complete: total > 0 && doneCount === total, steps };
}

export function firstIncompleteStep(model, done) {
  const step = model.steps.find((s) => !s.leaves.every((key) => done.has(key)));
  return (step || model.steps[0] || {}).id || null;
}

/** Estado guardado → estado en memoria, descartando claves desconocidas. */
export function restoreStepsState(raw, model) {
  const valid = new Set(model.leaves);
  const done = new Set(Array.isArray(raw && raw.done) ? raw.done.filter((key) => valid.has(key)) : []);
  const current = raw && model.steps.some((s) => s.id === raw.current) ? raw.current : firstIncompleteStep(model, done);
  return { done, current };
}

export function serializeStepsState(state, model, now = new Date()) {
  const progress = computeProgress(model, state.done);
  return {
    v: 1,
    done: model.leaves.filter((key) => state.done.has(key)),
    current: state.current,
    updatedAt: now.toISOString(),
    summary: { done: progress.done, total: progress.total, percent: progress.percent },
  };
}

// ─────────────────────────────────── Vista ───────────────────────────────────

const domId = (prefix, id) => `${prefix}-${String(id).replace(/[^\w-]/g, "_")}`;

/**
 * Renderiza un procedimiento.
 * @param {object} ctx contexto de vista (ver app.js)
 * @param {{entry:object, analysis:object, stateKey:string, anchor?:string}} input
 * @returns {{element:HTMLElement, focusAnchor:(id:string)=>void, destroy:()=>void}}
 */
export function renderStepsView(ctx, { entry, analysis, stateKey, anchor = "" }) {
  const { doc, win, t } = ctx;
  const model = analysis.model;
  const category = analysis.category === "lab-guide" ? "lab-guide" : "procedure";
  let state = restoreStepsState(ctx.store.getJSON(stateKey), model);
  const stepOf = (id) => {
    const node = model.nodesById.get(id);
    return node ? (node.kind === "step" ? node.id : node.parent) : null;
  };
  if (anchor && stepOf(anchor)) state.current = stepOf(anchor);

  const refs = { sections: new Map(), toggles: new Map(), bodies: new Map(), pills: new Map(), counts: new Map(), completeButtons: new Map(), stepperLinks: new Map(), substeps: new Map(), checks: new Map() };
  const save = () => ctx.store.setJSON(stateKey, serializeStepsState(state, model, new Date()));

  // ── Contenido Markdown con casillas ───────────────────────────────────────
  const renderItem = (item, owner) => {
    if (item.kind === "lang-group") {
      const variant = pickLanguageVariant(item, ctx.lang);
      const block = h(doc, "div", { class: "lang-block", lang: languageOf(variant) || null });
      block.append(ctx.renderMarkdown(markdownOf(variant.children)));
      hydrateTasks(block, owner);
      return block;
    }
    const block = h(doc, "div", { class: "md" });
    block.append(ctx.renderMarkdown(item.text));
    hydrateTasks(block, owner);
    return block;
  };

  function hydrateTasks(container, owner) {
    if (!owner) return hydrateTaskMarkers(doc, container);
    hydrateTaskMarkers(doc, container, (input) => {
      const key = taskKey(owner.id, owner.counter++);
      input.dataset.key = key;
      input.addEventListener("change", () => toggleLeaf(key, input.checked));
      refs.checks.set(key, input);
    });
  }

  // ── Subpasos ──────────────────────────────────────────────────────────────
  const renderSubstep = (node) => {
    const sub = model.nodesById.get(node.attrs.id) || [...model.nodesById.values()].find((n) => n.node === node);
    const titleId = domId("substep-title", sub.id);
    const stateIcon = icon(doc, "circle", { className: "substep__icon" });
    const stateText = h(doc, "span", { class: "sr-only" });
    const button = h(doc, "button", { type: "button", class: "btn btn--small btn--outline", "aria-pressed": "false" }, icon(doc, "check"), h(doc, "span", { text: t("steps.markSubDone") }));
    button.addEventListener("click", () => toggleNode(sub.id));
    const section = h(doc, "section", { class: "substep", id: domId("substep", sub.id), "aria-labelledby": titleId, dataset: { id: sub.id } }, h(doc, "h3", { class: "substep__title", id: titleId }, stateIcon, h(doc, "span", { text: ctx.localize(sub.title) }), stateText));
    const owner = { id: sub.id, counter: 0 };
    for (const item of groupLanguageBlocks(node.children)) {
      if (item.kind === "markdown" && !item.text.trim()) continue;
      section.append(renderItem(item, owner));
    }
    section.append(h(doc, "div", { class: "substep__actions" }, button));
    refs.substeps.set(sub.id, { section, stateIcon, stateText, button });
    return section;
  };

  // ── Pasos ─────────────────────────────────────────────────────────────────
  const renderStep = (node, step) => {
    const n = step.index + 1;
    const toggleId = domId("step-toggle", step.id);
    const bodyId = domId("step-body", step.id);
    const pill = h(doc, "span", { class: "step__status" }, icon(doc, "circle"), h(doc, "span", {}));
    const count = h(doc, "span", { class: "step__count" });
    const toggle = h(
      doc,
      "button",
      { type: "button", class: "step__toggle", id: toggleId, "aria-expanded": "false", "aria-controls": bodyId },
      h(doc, "span", { class: "step__index", "aria-hidden": "true" }, h(doc, "span", { class: "step__number", text: String(n) }), icon(doc, "check", { className: "step__done-icon" })),
      h(doc, "span", { class: "step__heading" }, h(doc, "span", { class: "step__eyebrow", text: t("steps.stepN", { n }) }), h(doc, "span", { class: "step__title", text: ctx.localize(step.title) })),
      pill,
      count,
      icon(doc, "chevron-down", { className: "step__chevron" }),
    );
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setOpen(step.id, open);
      if (open) {
        state.current = step.id;
        save();
        sync();
      }
    });

    const body = h(doc, "div", { class: "step__body", id: bodyId, role: "region", "aria-labelledby": toggleId, hidden: true });
    const owner = { id: step.id, counter: 0 };
    for (const item of groupLanguageBlocks(node.children)) {
      if (item.kind === "directive" && item.name === "substep") body.append(renderSubstep(item));
      else if (!(item.kind === "markdown" && !item.text.trim())) body.append(renderItem(item, owner));
    }

    const isLast = step.index === model.steps.length - 1;
    const prev = h(doc, "button", { type: "button", class: "btn btn--ghost", disabled: step.index === 0 }, icon(doc, "arrow-left"), h(doc, "span", { text: t("steps.prev") }));
    const complete = h(doc, "button", { type: "button", class: "btn btn--primary", "aria-pressed": "false" }, icon(doc, "check"), h(doc, "span", { text: t("steps.markDone") }));
    const next = h(doc, "button", { type: "button", class: "btn btn--ghost", disabled: isLast }, h(doc, "span", { text: t("steps.next") }), icon(doc, "arrow-right"));
    prev.addEventListener("click", () => goTo(model.steps[step.index - 1].id));
    next.addEventListener("click", () => goTo(model.steps[step.index + 1].id));
    complete.addEventListener("click", () => {
      const nowDone = toggleNode(step.id);
      if (nowDone && !isLast) goTo(model.steps[step.index + 1].id);
    });
    body.append(h(doc, "div", { class: "step__actions" }, prev, complete, next));

    const section = h(doc, "section", { class: "step", id: domId("step", step.id), dataset: { id: step.id } }, h(doc, "h2", { class: "step__header" }, toggle), body);
    refs.sections.set(step.id, section);
    refs.toggles.set(step.id, toggle);
    refs.bodies.set(step.id, body);
    refs.pills.set(step.id, pill);
    refs.counts.set(step.id, count);
    refs.completeButtons.set(step.id, complete);
    return section;
  };

  // ── Acciones ──────────────────────────────────────────────────────────────
  function setOpen(id, open) {
    const toggle = refs.toggles.get(id);
    const body = refs.bodies.get(id);
    if (!toggle || !body) return;
    toggle.setAttribute("aria-expanded", String(open));
    body.hidden = !open;
    refs.sections.get(id).classList.toggle("is-open", open);
  }

  function goTo(id, { focus = true, scroll = true, persist = true } = {}) {
    const stepId = stepOf(id) || id;
    if (!refs.sections.has(stepId)) return;
    for (const other of refs.sections.keys()) setOpen(other, other === stepId);
    state.current = stepId;
    if (persist) save();
    sync();
    // En la vista previa de «Validar» la URL no cambia: no es una página publicada.
    if (!ctx.preview && win.history && typeof win.history.replaceState === "function") win.history.replaceState(null, "", ctx.routeFor(entry, stepId));
    const section = refs.sections.get(stepId);
    if (scroll && typeof section.scrollIntoView === "function") section.scrollIntoView({ behavior: prefersReducedMotion(win) ? "auto" : "smooth", block: "start" });
    if (focus) refs.toggles.get(stepId).focus({ preventScroll: true });
  }

  function toggleLeaf(key, value) {
    state.done = setDone(model, state.done, key, value);
    save();
    const progress = sync();
    ctx.announce(t("steps.announceProgress", { percent: ctx.formatPercent(progress.percent) }));
  }

  /** Alterna un paso/subpaso completo. Devuelve el nuevo estado. */
  function toggleNode(id) {
    const value = !isComplete(model, state.done, id);
    state.done = setDone(model, state.done, id, value);
    save();
    const progress = sync();
    const title = ctx.localize(model.nodesById.get(id).title);
    ctx.announce(t(value ? "steps.announceDone" : "steps.announcePending", { title, percent: ctx.formatPercent(progress.percent) }));
    return value;
  }

  function reset() {
    ctx.store.remove(stateKey);
    state = { done: new Set(), current: model.steps[0] ? model.steps[0].id : null };
    sync();
    if (state.current) goTo(state.current, { focus: false, persist: false });
  }

  // ── Sincronización de la UI con el estado ─────────────────────────────────
  const bar = progressBar(doc, { labelledBy: "steps-progress-label" });
  const progressValue = h(doc, "strong", { class: "doc-progress__value" });
  const progressDetail = h(doc, "span", { class: "doc-progress__detail" });
  const progressBlock = h(
    doc,
    "div",
    { class: "doc-progress" },
    h(doc, "div", { class: "doc-progress__top" }, h(doc, "span", { id: "steps-progress-label", text: t(`steps.progress.${category}`) }), progressValue),
    bar.element,
    progressDetail,
  );
  const completion = h(doc, "div", { class: "completion", role: "status", hidden: true }, icon(doc, "party-popper", { className: "completion__icon" }), h(doc, "div", {}, h(doc, "p", { class: "completion__title", text: t(`steps.complete.${category}`) }), h(doc, "p", { text: t("steps.completeBody") })));

  function sync() {
    const progress = computeProgress(model, state.done);
    const percentText = ctx.formatPercent(progress.percent);
    const detail = t("steps.progressDetail", { done: progress.done, total: progress.total });
    bar.update(progress.percent, `${percentText} · ${detail}`);
    progressValue.textContent = percentText;
    progressDetail.textContent = detail;
    completion.hidden = !progress.complete;

    for (const stepProgress of progress.steps) {
      const id = stepProgress.id;
      const status = stepProgress.complete ? "done" : stepProgress.started ? "progress" : "pending";
      const statusText = t(`steps.state.${status}`);
      refs.sections.get(id).dataset.state = status;
      refs.sections.get(id).classList.toggle("is-current", state.current === id);
      const pill = refs.pills.get(id);
      setIcon(pill.querySelector("svg"), status === "done" ? "circle-check" : status === "progress" ? "circle-dot-dashed" : "circle");
      pill.querySelector("span").textContent = statusText;
      refs.counts.get(id).textContent = t("steps.count", { done: stepProgress.done, total: stepProgress.total });
      const button = refs.completeButtons.get(id);
      button.setAttribute("aria-pressed", String(stepProgress.complete));
      button.querySelector("span").textContent = stepProgress.complete ? t("steps.markPending") : t("steps.markDone");
      setIcon(button.querySelector("svg"), stepProgress.complete ? "rotate-ccw" : "check");

      const link = refs.stepperLinks.get(id);
      link.dataset.state = status;
      if (state.current === id) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
      link.querySelector(".stepper__meta").textContent = `${statusText} · ${t("steps.count", { done: stepProgress.done, total: stepProgress.total })}`;

      for (const subProgress of stepProgress.substeps) {
        const sub = refs.substeps.get(subProgress.id);
        if (!sub) continue;
        sub.section.dataset.state = subProgress.complete ? "done" : subProgress.done ? "progress" : "pending";
        setIcon(sub.stateIcon, subProgress.complete ? "circle-check" : subProgress.done ? "circle-dot-dashed" : "circle");
        sub.stateText.textContent = ` (${t(subProgress.complete ? "steps.state.done" : subProgress.done ? "steps.state.progress" : "steps.state.pending")})`;
        sub.button.setAttribute("aria-pressed", String(subProgress.complete));
        sub.button.querySelector("span").textContent = subProgress.complete ? t("steps.markSubPending") : t("steps.markSubDone");
      }
    }
    for (const [key, input] of refs.checks) input.checked = state.done.has(key);
    return progress;
  }

  // ── Ensamblado ────────────────────────────────────────────────────────────
  const content = h(doc, "div", { class: "steps-content" });
  for (const item of groupLanguageBlocks(analysis.nodes)) {
    if (item.kind === "directive" && item.name === "step") {
      const step = model.steps.find((s) => s.node === item);
      if (step) content.append(renderStep(item, step));
    } else if (!(item.kind === "markdown" && !item.text.trim())) {
      content.append(renderItem(item, null));
    }
  }
  if (!model.steps.length) content.append(h(doc, "p", { class: "empty", text: t("steps.empty") }));
  content.append(completion);

  const stepper = h(
    doc,
    "nav",
    { class: "stepper", "aria-label": t(`steps.nav.${category}`) },
    h(
      doc,
      "ol",
      { class: "stepper__list" },
      model.steps.map((step) => {
        const link = h(
          doc,
          "a",
          { class: "stepper__link", href: ctx.routeFor(entry, step.id), dataset: { id: step.id } },
          h(doc, "span", { class: "stepper__marker", "aria-hidden": "true" }, h(doc, "span", { class: "stepper__number", text: String(step.index + 1) }), icon(doc, "check", { className: "stepper__check" })),
          h(doc, "span", { class: "stepper__text" }, h(doc, "span", { class: "stepper__title", text: ctx.localize(step.title) }), h(doc, "span", { class: "stepper__meta" })),
        );
        link.addEventListener("click", (event) => {
          event.preventDefault();
          goTo(step.id);
        });
        refs.stepperLinks.set(step.id, link);
        return h(doc, "li", { class: "stepper__item" }, link);
      }),
    ),
  );

  const header = renderDocHeader(ctx, { entry, meta: analysis.meta, aside: progressBlock, onReset: analysis.meta.reset === false ? null : reset });
  const element = h(doc, "article", { class: "doc doc--steps", "aria-labelledby": "doc-title" }, header, h(doc, "div", { class: "steps-layout" }, stepper, content));

  enhanceContent(content, ctx);
  sync();
  if (state.current) setOpen(state.current, true);

  const onKey = (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target && (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName) || target.isContentEditable)) return;
    const index = model.steps.findIndex((s) => s.id === state.current);
    if (event.key === "ArrowRight" && index < model.steps.length - 1) goTo(model.steps[index + 1].id);
    else if (event.key === "ArrowLeft" && index > 0) goTo(model.steps[index - 1].id);
  };
  doc.addEventListener("keydown", onKey);

  return {
    element,
    focusAnchor(id) {
      if (stepOf(id)) {
        goTo(stepOf(id));
        const sub = refs.substeps.get(id);
        if (sub && typeof sub.section.scrollIntoView === "function") sub.section.scrollIntoView({ block: "start" });
      }
    },
    destroy() {
      doc.removeEventListener("keydown", onKey);
    },
    /** Solo para pruebas. */
    _state: () => state,
  };
}
