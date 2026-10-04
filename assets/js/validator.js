// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * validator.js — Pestaña «Validar» (#/validate).
 *
 * Revisa un documento antes de subirlo al repositorio, sin instalar nada:
 *  1. se abre o arrastra un `.md` (o se empieza desde una plantilla);
 *  2. se valida al escribir, con las mismas reglas que la portada, y cada
 *     error lleva a su línea;
 *  3. si no hay errores se muestra la vista previa real (interactiva);
 *  4. se descarga o se copia para guardarlo en `documents/…` y hacer push.
 * Nada sale del navegador. Los archivos abiertos se guardan como borrador en
 * localStorage para no perderlos al recargar.
 */

import { categoryFromPath, DOCUMENT_TYPES } from "./documents.js";
import { documentTemplate, TEMPLATE_CATEGORIES } from "./templates.js";
import { CATEGORY_ICONS } from "./icons.js";
import { h, icon, copyText } from "./ui.js";

const MAX_FILES = 20;
const MAX_SIZE = 512 * 1024;

/** Ruta que tendrá el archivo en el repositorio según su nombre. */
export function destinationPath(name) {
  const clean = String(name || "").trim().split(/[\\/]/).pop();
  const category = categoryFromPath(clean);
  if (category) return `${DOCUMENT_TYPES[category === "practice-test" ? "test" : "steps"].folder}/${clean}`;
  if (/\.steps\.md$/i.test(clean)) return `documents/steps/${clean}`;
  return `documents/${clean}`;
}

/** Desplazamiento (en caracteres) del comienzo de una línea (1-based). */
export function lineOffsets(text, line) {
  const lines = String(text).split("\n");
  const index = Math.max(0, Math.min(lines.length - 1, line - 1));
  let start = 0;
  for (let i = 0; i < index; i++) start += lines[i].length + 1;
  return { start, end: start + lines[index].length };
}

/** Línea y columna (1-based) de una posición del texto. */
export function caretPosition(text, offset) {
  const before = String(text).slice(0, offset).split("\n");
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

const slugLine = (text) => {
  const index = String(text).split("\n").findIndex((line) => /^slug\s*:/.test(line));
  return index >= 0 ? index + 1 : null;
};

/**
 * @param {{doc:Document, win:Window, t:Function, lang:string, store:object, draftKey:string,
 *          announce:Function, analyze:(path:string,text:string)=>object, existing:()=>Array,
 *          preview:(analysis:object, path:string)=>{element:Node, destroy:Function}}} ctx
 */
export function renderValidatorView(ctx) {
  const { doc, win, t } = ctx;
  const saved = ctx.store.getJSON(ctx.draftKey);
  let files = Array.isArray(saved && saved.files) ? saved.files.filter((f) => f && typeof f.name === "string" && typeof f.text === "string").slice(0, MAX_FILES) : [];
  let active = Math.min(Math.max(0, Number(saved && saved.active) || 0), Math.max(0, files.length - 1));
  let preview = null;
  let timer = null;
  let results = [];

  const save = () => ctx.store.setJSON(ctx.draftKey, { files, active });
  const current = () => files[active] || null;

  // ── Entrada ───────────────────────────────────────────────────────────────
  const fileInput = h(doc, "input", { type: "file", id: "validator-files", accept: ".md,text/markdown,text/plain", multiple: true, hidden: true });
  const openButton = h(doc, "button", { type: "button", class: "btn btn--primary" }, icon(doc, "file-up"), h(doc, "span", { text: t("validator.open") }));
  openButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    loadFiles([...(fileInput.files || [])]);
    fileInput.value = "";
  });

  const templates = h(
    doc,
    "div",
    { class: "validator__templates", role: "group", "aria-label": t("validator.templates") },
    h(doc, "span", { class: "validator__templates-label", "aria-hidden": "true", text: t("validator.templates") }),
    TEMPLATE_CATEGORIES.map((category) => {
      const button = h(doc, "button", { type: "button", class: "btn btn--ghost btn--small", dataset: { template: category } }, icon(doc, CATEGORY_ICONS[category]), h(doc, "span", { text: t(`category.${category}`) }));
      button.addEventListener("click", () => {
        const template = documentTemplate(category, ctx.lang);
        addFile(template.name, template.text);
      });
      return button;
    }),
  );

  const notice = h(doc, "p", { class: "validator__notice", role: "alert", hidden: true });
  const fileList = h(doc, "ul", { class: "validator__files", "aria-label": t("validator.files") });

  const nameInput = h(doc, "input", { type: "text", id: "validator-name", class: "answer-input validator__name", autocomplete: "off", spellcheck: "false", "aria-describedby": "validator-destination" });
  const destination = h(doc, "p", { class: "hint", id: "validator-destination" });
  const textarea = h(doc, "textarea", { id: "validator-text", class: "validator__textarea", spellcheck: "false", wrap: "off", rows: "22", "aria-describedby": "validator-caret" });
  const caret = h(doc, "p", { class: "validator__caret", id: "validator-caret" });

  const downloadButton = h(doc, "button", { type: "button", class: "btn btn--ghost btn--small" }, icon(doc, "download"), h(doc, "span", { text: t("validator.download") }));
  const copyButton = h(doc, "button", { type: "button", class: "btn btn--ghost btn--small" }, icon(doc, "copy"), h(doc, "span", { text: t("validator.copy") }));
  downloadButton.addEventListener("click", () => download());
  copyButton.addEventListener("click", async () => {
    const ok = await copyText(win, textarea.value);
    ctx.announce(ok ? t("code.copied") : t("code.copyFailed"));
    copyButton.querySelector("span").textContent = ok ? t("code.copied") : t("code.copyFailed");
    setTimeout(() => (copyButton.querySelector("span").textContent = t("validator.copy")), 1800);
  });

  const editor = h(
    doc,
    "div",
    { class: "validator__editor" },
    h(doc, "label", { for: "validator-name", class: "validator__label", text: t("validator.fileName") }),
    nameInput,
    destination,
    h(doc, "label", { for: "validator-text", class: "validator__label", text: t("validator.content") }),
    textarea,
    h(doc, "div", { class: "validator__under" }, caret, h(doc, "div", { class: "validator__actions" }, copyButton, downloadButton)),
  );

  // ── Resultado ─────────────────────────────────────────────────────────────
  const status = h(doc, "div", { class: "validator__status", role: "status" });
  const issues = h(doc, "div", { class: "validator__issues" });
  const next = h(doc, "p", { class: "validator__next" });
  const report = h(doc, "section", { class: "validator__report", "aria-labelledby": "validator-report-title" }, h(doc, "h2", { id: "validator-report-title", class: "section-title", text: t("validator.result") }), status, issues, next);

  const previewBody = h(doc, "div", { class: "validator__preview-body" });
  const previewSection = h(doc, "section", { class: "validator__preview", "aria-labelledby": "validator-preview-title" }, h(doc, "h2", { id: "validator-preview-title", class: "section-title" }, icon(doc, "eye"), h(doc, "span", { text: t("validator.preview") })), previewBody);

  const empty = h(
    doc,
    "div",
    { class: "validator__empty" },
    icon(doc, "file-up", { className: "validator__empty-icon" }),
    h(doc, "p", { class: "validator__empty-title", text: t("validator.emptyTitle") }),
    h(doc, "p", { class: "hint", text: t("validator.emptyBody") }),
  );
  const workspace = h(doc, "div", { class: "validator__workspace" }, fileList, h(doc, "div", { class: "validator__grid" }, editor, report), previewSection);

  const dropzone = h(
    doc,
    "section",
    { class: "validator", "aria-labelledby": "validate-title" },
    h(
      doc,
      "header",
      { class: "validator__intro" },
      h(doc, "p", { class: "eyebrow" }, icon(doc, "shield-check"), h(doc, "span", { text: t("validator.eyebrow") })),
      h(doc, "h1", { id: "validate-title", tabindex: "-1", text: t("validator.title") }),
      h(doc, "p", { class: "lead", text: t("validator.lead") }),
      h(doc, "div", { class: "validator__toolbar" }, openButton, fileInput, templates),
      h(doc, "p", { class: "hint validator__drop-hint" }, icon(doc, "upload"), h(doc, "span", { text: t("validator.dropHint") })),
      notice,
    ),
    empty,
    workspace,
  );

  ["dragenter", "dragover"].forEach((type) =>
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    }),
  );
  ["dragleave", "drop"].forEach((type) =>
    dropzone.addEventListener(type, (event) => {
      event.preventDefault();
      if (type === "dragleave" && dropzone.contains(event.relatedTarget)) return;
      dropzone.classList.remove("is-dragging");
      if (type === "drop" && event.dataTransfer) loadFiles([...(event.dataTransfer.files || [])]);
    }),
  );

  // ── Archivos ──────────────────────────────────────────────────────────────
  function showNotice(message) {
    notice.textContent = message;
    notice.hidden = !message;
  }

  function addFile(name, text) {
    const existing = files.findIndex((f) => f.name === name);
    if (existing >= 0) {
      files[existing].text = text;
      active = existing;
    } else {
      if (files.length >= MAX_FILES) return showNotice(t("validator.tooMany", { count: MAX_FILES }));
      files.push({ name, text });
      active = files.length - 1;
    }
    showNotice("");
    save();
    paint({ focus: true });
  }

  async function readFile(file) {
    if (typeof file.text === "function") return file.text();
    return new Promise((resolve, reject) => {
      const reader = new win.FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  async function loadFiles(list) {
    const skipped = [];
    for (const file of list) {
      if (!/\.md$/i.test(file.name) || file.size > MAX_SIZE) {
        skipped.push(file.name);
        continue;
      }
      try {
        addFile(file.name, (await readFile(file)).replace(/\r\n?/g, "\n"));
      } catch {
        skipped.push(file.name);
      }
    }
    if (skipped.length) showNotice(t("validator.skipped", { files: skipped.join(", ") }));
  }

  function removeFile(index) {
    files.splice(index, 1);
    active = Math.max(0, Math.min(active, files.length - 1));
    save();
    paint({ focus: true });
  }

  function download() {
    const file = current();
    if (!file) return;
    const URLs = win.URL;
    if (!URLs || typeof URLs.createObjectURL !== "function") return copyButton.click();
    const url = URLs.createObjectURL(new win.Blob([file.text], { type: "text/markdown;charset=utf-8" }));
    const link = h(doc, "a", { href: url, download: file.name.split(/[\\/]/).pop(), class: "visually-offscreen" });
    doc.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URLs.revokeObjectURL(url), 1000);
  }

  // ── Validación ────────────────────────────────────────────────────────────
  /** Analiza todos los archivos abiertos y añade los slugs repetidos (con el sitio y entre ellos). */
  function validateAll() {
    const existing = ctx.existing();
    const list = files.map((file) => {
      const path = destinationPath(file.name);
      const analysis = ctx.analyze(path, file.text);
      const slug = analysis.meta && typeof analysis.meta.slug === "string" ? analysis.meta.slug : null;
      return { file, path, analysis, slug, errors: [...analysis.errors], warnings: analysis.warnings, replaces: existing.some((d) => d.path === path) };
    });
    for (const result of list) {
      if (!result.slug) continue;
      const line = slugLine(result.file.text);
      const clash = existing.find((d) => d.slug === result.slug && d.path !== result.path && !d.invalid);
      if (clash) result.errors.push({ line, message: `slug «${result.slug}» ya lo usa ${clash.path}: elige otro.` });
      const twin = list.find((other) => other !== result && other.slug === result.slug && other.path !== result.path);
      if (twin) result.errors.push({ line, message: `slug «${result.slug}» también está en «${twin.file.name}».` });
    }
    return list;
  }

  function jumpTo(line) {
    const { start, end } = lineOffsets(textarea.value, line);
    textarea.focus();
    textarea.setSelectionRange(start, end);
    const style = win.getComputedStyle ? win.getComputedStyle(textarea) : null;
    const lineHeight = (style && parseFloat(style.lineHeight)) || 20;
    textarea.scrollTop = Math.max(0, (line - 4) * lineHeight);
    updateCaret();
  }

  function issueItem(issue, kind) {
    const label = issue.line ? t("validator.line", { line: issue.line }) : t("validator.file");
    const content = [h(doc, "span", { class: "issue__where", text: label }), h(doc, "span", { class: "issue__message", text: issue.message })];
    if (!issue.line) return h(doc, "li", { class: ["issue", "issue--static", `issue--${kind}`] }, icon(doc, kind === "error" ? "circle-x" : "triangle-alert"), h(doc, "span", { class: "issue__body" }, content));
    const button = h(doc, "button", { type: "button", class: "issue__button", title: t("validator.goToLine", { line: issue.line }) }, icon(doc, kind === "error" ? "circle-x" : "triangle-alert"), h(doc, "span", { class: "issue__body" }, content));
    button.addEventListener("click", () => jumpTo(issue.line));
    return h(doc, "li", { class: ["issue", `issue--${kind}`] }, button);
  }

  function paintReport(result) {
    const { errors, warnings, path, analysis } = result;
    status.className = ["validator__status", errors.length ? "status--failed" : "status--passed"].join(" ");
    status.replaceChildren(
      icon(doc, errors.length ? "circle-x" : "circle-check"),
      h(doc, "span", {}, h(doc, "strong", { text: errors.length ? t("validator.errors", { count: errors.length }) : t("validator.ok") }), warnings.length ? ` · ${t("validator.warnings", { count: warnings.length })}` : ""),
    );
    issues.replaceChildren(
      ...[
        errors.length ? h(doc, "ol", { class: "issue-list", "aria-label": t("validator.errorList") }, errors.map((issue) => issueItem(issue, "error"))) : null,
        warnings.length ? h(doc, "ol", { class: "issue-list", "aria-label": t("validator.warningList") }, warnings.map((issue) => issueItem(issue, "warning"))) : null,
      ].filter(Boolean),
    );
    const category = analysis.category;
    next.replaceChildren(
      ...(errors.length
        ? [t("validator.fixFirst")]
        : [
            category ? h(doc, "span", { class: "badge" }, icon(doc, CATEGORY_ICONS[category]), h(doc, "span", { text: t(`category.${category}`) })) : "",
            " ",
            t(result.replaces ? "validator.nextReplace" : "validator.next"),
            " ",
            h(doc, "code", { text: path }),
          ]),
    );
  }

  function paintPreview(result) {
    if (preview && typeof preview.destroy === "function") preview.destroy();
    preview = null;
    if (result.errors.length) {
      previewBody.replaceChildren(h(doc, "p", { class: "empty", text: t("validator.previewBlocked") }));
      return;
    }
    try {
      preview = ctx.preview(result.analysis, result.path);
      previewBody.replaceChildren(preview.element);
    } catch (error) {
      previewBody.replaceChildren(h(doc, "p", { class: "empty", text: `${t("validator.previewFailed")} ${String((error && error.message) || error)}` }));
    }
  }

  function paintFiles() {
    fileList.replaceChildren(
      ...files.map((file, index) => {
        const result = results[index];
        const ok = result && !result.errors.length;
        const select = h(
          doc,
          "button",
          { type: "button", class: "validator__file", "aria-current": index === active ? "true" : null },
          icon(doc, ok ? "circle-check" : "circle-x", { className: ok ? "is-ok" : "is-bad" }),
          h(doc, "span", { class: "validator__file-name", text: file.name }),
          h(doc, "span", { class: "sr-only", text: ` (${ok ? t("validator.ok") : t("validator.errors", { count: result ? result.errors.length : 0 })})` }),
        );
        select.addEventListener("click", () => {
          active = index;
          save();
          paint();
        });
        const close = h(doc, "button", { type: "button", class: "validator__close", "aria-label": t("validator.close", { name: file.name }) }, icon(doc, "x"));
        close.addEventListener("click", () => removeFile(index));
        return h(doc, "li", { class: "validator__file-item" }, select, close);
      }),
    );
  }

  function updateCaret() {
    const { line, column } = caretPosition(textarea.value, textarea.selectionStart || 0);
    caret.textContent = t("validator.caret", { line, column });
  }

  function paint({ focus = false } = {}) {
    empty.hidden = files.length > 0;
    workspace.hidden = files.length === 0;
    results = validateAll();
    paintFiles();
    const file = current();
    if (!file) {
      if (preview && preview.destroy) preview.destroy();
      preview = null;
      return;
    }
    if (nameInput.value !== file.name) nameInput.value = file.name;
    if (textarea.value !== file.text) textarea.value = file.text;
    const result = results[active];
    destination.textContent = t("validator.destination", { path: result.path });
    paintReport(result);
    paintPreview(result);
    updateCaret();
    if (focus) textarea.focus({ preventScroll: true });
  }

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      save();
      paint();
      const result = results[active];
      if (result) ctx.announce(result.errors.length ? t("validator.errors", { count: result.errors.length }) : t("validator.ok"));
    }, 350);
  };

  textarea.addEventListener("input", () => {
    const file = current();
    if (!file) return;
    file.text = textarea.value;
    schedule();
  });
  nameInput.addEventListener("input", () => {
    const file = current();
    if (!file) return;
    file.name = nameInput.value.trim() || file.name;
    schedule();
  });
  ["keyup", "click", "select"].forEach((type) => textarea.addEventListener(type, updateCaret));

  paint();

  return {
    element: dropzone,
    focusAnchor() {},
    destroy() {
      clearTimeout(timer);
      if (preview && typeof preview.destroy === "function") preview.destroy();
    },
    /** Para pruebas y para validar ya, sin esperar al temporizador. */
    flush() {
      clearTimeout(timer);
      save();
      paint();
    },
    loadFiles,
    _files: () => files,
  };
}

