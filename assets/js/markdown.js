// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * markdown.js — Gramática de los documentos y render seguro.
 *
 *   ---                        ← front matter YAML (obligatorio)
 *   title: { es: …, en: … }
 *   ---
 *   # {{ title }}              ← lo consume la cabecera de la página
 *
 *   :::step id="x" title.es="…" title.en="…"     ← procedimientos y guías (.steps.md)
 *   Markdown libre…
 *   :::substep id="y" title.es="…"
 *   - [ ] tarea
 *   :::
 *   :::
 *
 *   :::question type="single"                   ← pruebas de práctica (.test.md)
 *   ¿Enunciado?
 *   - [ ] opción
 *   - [x] opción correcta
 *   :::explanation
 *   Por qué es la correcta.
 *   :::
 *   :::
 *
 *   :::lang es                 ← bloque visible solo en español
 *   …
 *   :::
 *
 * Reglas:
 *  1. Las directivas abren con `:::nombre atributos` y cierran con `:::` en su
 *     propia línea (hasta 3 espacios de sangría). Se anidan con una pila.
 *  2. Lo que está dentro de un bloque de código cercado (``` o ~~~) es texto.
 *  3. El Markdown se renderiza con `html: false` (el HTML crudo se muestra como
 *     texto) y después se sanitiza con DOMPurify antes de llegar al DOM.
 *  4. Solo se aceptan enlaces http(s), mailto, tel, anclas y rutas relativas;
 *     las imágenes, solo https o rutas relativas.
 *
 * Las librerías (markdown-it, DOMPurify, Prism) se inyectan: este módulo no
 * toca globales y funciona igual en el navegador y en Node.
 */

export function normalizeNewlines(text) {
  return String(text == null ? "" : text)
    .replace(/^﻿/, "")
    .replace(/\r\n?/g, "\n");
}

// ─────────────────────────────── Front matter ───────────────────────────────

const FRONT_MATTER_RE = /^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/;

/** Separa el front matter del cuerpo. `bodyLine` es la línea (1-based) donde empieza el cuerpo. */
export function splitFrontMatter(source) {
  const text = normalizeNewlines(source);
  const match = FRONT_MATTER_RE.exec(text);
  if (!match) return { raw: null, body: text, bodyLine: 1 };
  const consumed = match[0].split("\n").length - (match[0].endsWith("\n") ? 1 : 0);
  return { raw: match[1], body: text.slice(match[0].length), bodyLine: consumed + 1 };
}

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);

/**
 * @param {string} source contenido completo del .md
 * @param {{load:Function}} yaml js-yaml (o compatible)
 */
export function parseFrontMatter(source, yaml) {
  const { raw, body, bodyLine } = splitFrontMatter(source);
  if (raw == null) {
    return { data: null, body, bodyLine, error: "El documento debe comenzar con front matter YAML delimitado por «---»." };
  }
  try {
    const data = yaml.load(raw);
    if (!isPlainObject(data)) return { data: null, body, bodyLine, error: "El front matter debe ser un objeto YAML (clave: valor)." };
    return { data, body, bodyLine, error: null };
  } catch (error) {
    const reason = String((error && error.message) || error).split("\n")[0];
    return { data: null, body, bodyLine, error: `Front matter YAML inválido: ${reason}` };
  }
}

/**
 * Sustituye `{{ clave }}` por su valor (`{{repo_url}}`, `{{ title }}`…). Los
 * tokens desconocidos se dejan intactos para que el error sea visible.
 */
export function expandTokens(text, values) {
  return String(text == null ? "" : text).replace(/\{\{\s*([A-Za-z_]+)\s*\}\}/g, (match, key) => {
    const name = key.toLowerCase();
    return Object.prototype.hasOwnProperty.call(values, name) && values[name] != null ? String(values[name]) : match;
  });
}

/** Quita la primera línea `# {{ title }}`: el título ya lo pinta la cabecera. */
export function stripTitlePlaceholder(body) {
  return String(body).replace(/^(\s*\n)*#[ \t]+\{\{\s*title\s*\}\}[ \t]*(\n|$)/, "");
}

// ─────────────────────────────── Directivas ────────────────────────────────

/**
 * Directivas permitidas: en qué tipo de documento, dentro de qué directiva
 * (`null` = nivel superior) y con qué atributos. Los atributos de `localized`
 * admiten variantes por idioma (`title.es`, `answer.en`…).
 */
export const DIRECTIVE_RULES = Object.freeze({
  step: { types: ["steps"], parents: [null], attributes: ["id", "title"], localized: ["title"] },
  substep: { types: ["steps"], parents: ["step"], attributes: ["id", "title"], localized: ["title"] },
  question: { types: ["test"], parents: [null], attributes: ["id", "type", "points", "answer", "tolerance"], localized: ["answer"] },
  explanation: { types: ["test"], parents: ["question"], attributes: [], localized: [] },
  hint: { types: ["test"], parents: ["question"], attributes: [], localized: [] },
  lang: { types: ["steps", "test"], parents: [null, "step", "substep", "question", "explanation", "hint"], attributes: [], localized: [] },
});

/** Identificadores de pasos, subpasos y preguntas (parte de la URL y del progreso). */
export const ID_RE = /^[A-Za-z0-9][\w-]*$/;

/** ¿Es `key` un atributo permitido en la directiva `name`? */
export function isKnownAttribute(name, key) {
  const rule = DIRECTIVE_RULES[name];
  if (!rule) return false;
  const match = /^([\w-]+)\.([a-z]{2})$/.exec(key);
  if (match) return rule.localized.includes(match[1]);
  return rule.attributes.includes(key);
}

const FENCE_RE = /^ {0,3}(`{3,}|~{3,})(.*)$/;
const OPEN_RE = /^ {0,3}:::[ \t]*([A-Za-z][\w-]*)(.*)$/;
const CLOSE_RE = /^ {0,3}:::[ \t]*$/;
const ATTR_RE = /([A-Za-z_][\w.:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')|(\S+)/g;

/** `id="a" title.es="Hola"` → `{ attrs: { id, "title.es" }, args: [] }` */
export function parseAttributes(text) {
  const attrs = {};
  const args = [];
  for (const match of String(text || "").matchAll(ATTR_RE)) {
    if (match[1]) attrs[match[1]] = match[2] !== undefined ? match[2] : match[3];
    else args.push(match[4]);
  }
  return { attrs, args };
}

/**
 * Convierte el cuerpo en un árbol de nodos `markdown` y `directive`.
 * @param {string} body
 * @param {{type?:'steps'|'test', lineOffset?:number}} opts
 * @returns {{nodes:Array, errors:Array<{line:number,message:string}>}}
 */
export function parseDirectives(body, { type = null, lineOffset = 1 } = {}) {
  const lines = normalizeNewlines(body).split("\n");
  const root = { name: null, children: [] };
  const stack = [root];
  const errors = [];
  let buffer = [];
  let bufferLine = null;
  let fence = null;

  const pushText = (line, lineNo) => {
    if (bufferLine == null) bufferLine = lineNo;
    buffer.push(line);
  };
  const flush = () => {
    if (buffer.length) stack[stack.length - 1].children.push({ kind: "markdown", text: buffer.join("\n"), line: bufferLine });
    buffer = [];
    bufferLine = null;
  };

  lines.forEach((line, index) => {
    const lineNo = index + lineOffset;

    if (fence) {
      pushText(line, lineNo);
      const close = FENCE_RE.exec(line);
      if (close && close[1][0] === fence.char && close[1].length >= fence.length && close[2].trim() === "") fence = null;
      return;
    }

    const opening = FENCE_RE.exec(line);
    if (opening && !(opening[1][0] === "`" && opening[2].includes("`"))) {
      fence = { char: opening[1][0], length: opening[1].length };
      pushText(line, lineNo);
      return;
    }

    if (CLOSE_RE.test(line)) {
      if (stack.length === 1) {
        errors.push({ line: lineNo, message: "Cierre «:::» sin ninguna directiva abierta." });
        return;
      }
      flush();
      stack.pop().endLine = lineNo;
      return;
    }

    const open = OPEN_RE.exec(line);
    if (open) {
      const name = open[1].toLowerCase();
      const rule = DIRECTIVE_RULES[name];
      const parent = stack[stack.length - 1];
      if (!rule) {
        errors.push({ line: lineNo, message: `Directiva desconocida «:::${name}». Usa: ${Object.keys(DIRECTIVE_RULES).join(", ")}.` });
      } else if (type && !rule.types.includes(type)) {
        errors.push({ line: lineNo, message: `La directiva «:::${name}» no se admite en documentos de tipo «${type}».` });
      } else if (!rule.parents.includes(parent.name)) {
        errors.push({
          line: lineNo,
          message: parent.name
            ? `«:::${name}» no puede ir dentro de «:::${parent.name}».`
            : `«:::${name}» debe ir dentro de «:::${rule.parents.filter(Boolean).join("» o «:::")}».`,
        });
      }
      flush();
      const { attrs, args } = parseAttributes(open[2]);
      const node = { kind: "directive", name, attrs, args, line: lineNo, endLine: null, children: [] };
      parent.children.push(node);
      stack.push(node);
      return;
    }

    pushText(line, lineNo);
  });

  flush();
  while (stack.length > 1) {
    const node = stack.pop();
    errors.push({ line: node.line, message: `La directiva «:::${node.name}» no se cerró con «:::».` });
  }
  return { nodes: root.children, errors };
}

/**
 * Atributo localizable: `title="…"`, `title.es="…"`, `title.en="…"`.
 * Devuelve un texto, un objeto `{ es, en }` o null.
 */
export function localizedAttribute(attrs, name) {
  const variants = {};
  for (const [key, value] of Object.entries(attrs || {})) {
    const match = key.match(/^([\w-]+)\.([a-z]{2})$/);
    if (match && match[1] === name) variants[match[2]] = value;
  }
  const plain = attrs ? attrs[name] : undefined;
  if (!Object.keys(variants).length) return plain != null ? plain : null;
  if (plain != null) variants._ = plain;
  return variants;
}

export const languageOf = (node) => String(node.args[0] || node.attrs.lang || node.attrs.code || "").toLowerCase();

/**
 * Agrupa los bloques `:::lang` consecutivos (separados solo por líneas en
 * blanco) en un nodo `lang-group`; el render muestra una sola variante.
 */
export function groupLanguageBlocks(children) {
  const out = [];
  let group = null;
  for (const node of children) {
    if (node.kind === "directive" && node.name === "lang") {
      if (!group) {
        group = { kind: "lang-group", line: node.line, variants: [] };
        out.push(group);
      }
      group.variants.push(node);
      continue;
    }
    if (group && node.kind === "markdown" && node.text.trim() === "") continue;
    group = null;
    out.push(node);
  }
  return out;
}

/** Variante de un grupo para un idioma, con respaldo al español y luego a la primera. */
export function pickLanguageVariant(group, lang, fallback = "es") {
  return (
    group.variants.find((v) => languageOf(v) === lang) ||
    group.variants.find((v) => languageOf(v) === fallback) ||
    group.variants[0]
  );
}

/** Concatena el Markdown directo de un nodo (sin directivas hijas). */
export function markdownOf(children) {
  return children
    .filter((child) => child.kind === "markdown")
    .map((child) => child.text)
    .join("\n");
}

// ─────────────────────────────── URLs seguras ───────────────────────────────

const CONTROL_RE = /[\u0000- \u007f-\u009f]/g;

export function urlScheme(url) {
  const cleaned = String(url == null ? "" : url).replace(CONTROL_RE, "");
  const match = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned);
  return match ? match[1].toLowerCase() : null;
}

/** Enlaces: http(s), mailto, tel, anclas y rutas relativas. */
export function isSafeUrl(url, { schemes = ["http", "https", "mailto", "tel"] } = {}) {
  if (url == null) return false;
  const value = String(url).trim();
  if (!value) return false;
  const scheme = urlScheme(value);
  if (scheme) return schemes.includes(scheme);
  return !value.replace(CONTROL_RE, "").startsWith("//");
}

/** Imágenes: https o rutas relativas (nada de data:, javascript: ni http:). */
export function isSafeImageSrc(src) {
  return isSafeUrl(src, { schemes: ["https"] });
}

/** Ruta relativa sin esquema, sin raíz y sin barras invertidas. */
export function isSafeRelativePath(path) {
  const value = String(path == null ? "" : path).trim();
  if (!value || urlScheme(value) || /[\u0000-\u001f\\]/.test(value)) return false;
  return !value.startsWith("/");
}

/**
 * Resuelve `relative` contra el directorio `baseDir` ("documents/tests").
 * Devuelve null si la ruta sale de la raíz del sitio.
 */
export function resolveRelativePath(baseDir, relative) {
  if (!isSafeRelativePath(relative)) return null;
  const clean = String(relative).trim().split(/[?#]/)[0];
  const parts = String(baseDir || "").split("/").filter(Boolean);
  for (const segment of clean.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if (!parts.length) return null;
      parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.join("/");
}

export const dirname = (path) => String(path || "").split("/").slice(0, -1).join("/");

// ─────────────────────────────── Render ─────────────────────────────────────

const TASK_RE = /^\[([ xX])\][ \t]+/;
const CALLOUT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*/i;

/** Listas de tareas: `- [ ] texto` → marcador que la vista convierte en checkbox. */
function taskListRule(state) {
  const tokens = state.tokens;
  for (let i = 2; i < tokens.length; i++) {
    const inline = tokens[i];
    if (inline.type !== "inline" || tokens[i - 1].type !== "paragraph_open" || tokens[i - 2].type !== "list_item_open") continue;
    const first = inline.children && inline.children[0];
    const match = first && first.type === "text" ? TASK_RE.exec(first.content) : null;
    if (!match) continue;

    first.content = first.content.slice(match[0].length);
    inline.content = inline.content.replace(TASK_RE, "");
    const marker = new state.Token("html_inline", "", 0);
    marker.content = `<span class="task-marker" data-checked="${match[1] !== " "}"></span>`;
    inline.children.unshift(marker);
    tokens[i - 2].attrJoin("class", "task-item");
    state.env.taskCount = (state.env.taskCount || 0) + 1;
  }
}

/** Avisos estilo GitHub: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`. */
function calloutRule(state) {
  const tokens = state.tokens;
  for (let i = 0; i < tokens.length - 2; i++) {
    if (tokens[i].type !== "blockquote_open" || tokens[i + 1].type !== "paragraph_open" || tokens[i + 2].type !== "inline") continue;
    const inline = tokens[i + 2];
    const first = inline.children && inline.children[0];
    const match = first && first.type === "text" ? CALLOUT_RE.exec(first.content) : null;
    if (!match) continue;

    const kind = match[1].toLowerCase();
    tokens[i].attrJoin("class", `callout callout--${kind}`);
    tokens[i].attrSet("data-callout", kind);
    first.content = first.content.slice(match[0].length);
    inline.content = inline.content.replace(CALLOUT_RE, "");
    if (first.content === "") {
      inline.children.shift();
      if (inline.children[0] && inline.children[0].type === "softbreak") inline.children.shift();
    }
    if (!inline.children.length) tokens.splice(i + 1, 3);
  }
}

/** La alineación de tablas como clase: la CSP no permite atributos `style`. */
function tableAlignRule(state) {
  for (const token of state.tokens) {
    if (token.type !== "th_open" && token.type !== "td_open") continue;
    const style = token.attrGet("style");
    if (!style) continue;
    token.attrs = token.attrs.filter(([name]) => name !== "style");
    const match = /text-align:\s*(left|center|right)/.exec(style);
    if (match) token.attrJoin("class", `align-${match[1]}`);
  }
}

/** Texto de un elemento de lista a partir de sus líneas: sin viñeta, sin casilla y sin sangría. */
function listItemText(lines, [start, end]) {
  const raw = lines.slice(start, end);
  const marker = /^(\s*(?:[-*+]|\d{1,9}[.)]))(?:[ \t]+|$)/.exec(raw[0] || "");
  const width = marker ? marker[0].length : 0;
  const first = (raw[0] || "").slice(width);
  const task = TASK_RE.exec(first);
  const head = task ? first.slice(task[0].length) : first;
  const rest = raw.slice(1).map((line) => line.replace(new RegExp(`^ {0,${Math.max(width, 1)}}`), ""));
  return { text: [head, ...rest].join("\n").trim(), task: task ? task[1] !== " " : null };
}

export const SANITIZE_OPTIONS = Object.freeze({
  USE_PROFILES: { html: true },
  FORBID_TAGS: [
    "style", "script", "form", "input", "button", "textarea", "select", "option",
    "iframe", "frame", "frameset", "object", "embed", "link", "meta", "base",
    "svg", "math", "video", "audio", "source", "track", "template",
  ],
  FORBID_ATTR: ["style", "srcset", "formaction", "action", "xlink:href", "ping"],
  ALLOW_DATA_ATTR: true,
});

const LANGUAGE_ALIASES = { sh: "bash", shell: "bash", zsh: "bash", console: "bash", ps1: "powershell", pwsh: "powershell", yml: "yaml", js: "javascript", mjs: "javascript", ts: "typescript", md: "markdown", py: "python", html: "markup", xml: "markup", jsonc: "json" };

/** Resaltado con Prism si está disponible; si no, markdown-it escapa el código. */
export function prismHighlighter(Prism) {
  if (!Prism || !Prism.languages) return null;
  return (code, lang) => {
    const name = LANGUAGE_ALIASES[String(lang || "").toLowerCase()] || String(lang || "").toLowerCase();
    const grammar = Prism.languages[name];
    return grammar ? Prism.highlight(code, grammar, name) : "";
  };
}

/**
 * @param {{markdownit:Function, DOMPurify?:object|null, highlight?:Function|null}} libs
 */
export function createMarkdownRenderer({ markdownit, DOMPurify = null, highlight = null }) {
  const md = markdownit({
    html: false,
    linkify: true,
    typographer: false,
    highlight: highlight
      ? (code, lang) => {
          try {
            return highlight(code, lang) || "";
          } catch {
            return "";
          }
        }
      : null,
  });
  md.core.ruler.push("docpages_tasks", taskListRule);
  md.core.ruler.push("docpages_callouts", calloutRule);
  md.core.ruler.push("docpages_tables", tableAlignRule);

  const defaultValidateLink = md.validateLink.bind(md);
  md.validateLink = (url) => defaultValidateLink(url) && isSafeUrl(url);

  if (DOMPurify) {
    if (typeof DOMPurify.removeHooks === "function") DOMPurify.removeHooks("afterSanitizeAttributes");
    DOMPurify.addHook("afterSanitizeAttributes", (node) => {
      if (node.nodeName === "A") {
        const href = node.getAttribute("href");
        if (href != null && !isSafeUrl(href)) node.removeAttribute("href");
        if (href && /^https?:/i.test(href.trim())) {
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noopener noreferrer");
        } else {
          node.removeAttribute("target");
        }
      } else if (node.nodeName === "IMG") {
        const src = node.getAttribute("src");
        if (src != null && !isSafeImageSrc(src)) node.removeAttribute("src");
        node.setAttribute("loading", "lazy");
        node.setAttribute("decoding", "async");
        if (!node.hasAttribute("alt")) node.setAttribute("alt", "");
      }
    });
  }

  const requirePurify = () => {
    if (!DOMPurify) throw new Error("DOMPurify no está disponible: no se puede insertar HTML.");
  };

  return {
    md,
    /** HTML SIN sanitizar: no lo insertes en el DOM; usa `renderFragment`. */
    renderUnsafe: (text) => md.render(String(text == null ? "" : text)),
    /** Texto HTML ya sanitizado. */
    renderHtml(text) {
      requirePurify();
      return DOMPurify.sanitize(md.render(String(text == null ? "" : text)), SANITIZE_OPTIONS);
    },
    /** DocumentFragment sanitizado, listo para `appendChild`. */
    renderFragment(text) {
      requirePurify();
      return DOMPurify.sanitize(md.render(String(text == null ? "" : text)), { ...SANITIZE_OPTIONS, RETURN_DOM_FRAGMENT: true });
    },
    /** Markdown en línea (sin párrafo), sanitizado, como DocumentFragment. */
    renderInlineFragment(text) {
      requirePurify();
      return DOMPurify.sanitize(md.renderInline(String(text == null ? "" : text)), { ...SANITIZE_OPTIONS, RETURN_DOM_FRAGMENT: true });
    },
    sanitize(html) {
      requirePurify();
      return DOMPurify.sanitize(String(html), SANITIZE_OPTIONS);
    },
    /**
     * Listas de nivel superior de un texto, con el rango de líneas que ocupan
     * y el texto de cada elemento (sin la viñeta ni la casilla).
     * `task` es true (`[x]`), false (`[ ]`) o null (elemento normal).
     */
    listsOf(text) {
      const source = normalizeNewlines(text);
      const lines = source.split("\n");
      const tokens = md.parse(source, {});
      const lists = [];
      for (let i = 0; i < tokens.length; i++) {
        const open = tokens[i];
        if (open.level !== 0 || (open.type !== "bullet_list_open" && open.type !== "ordered_list_open") || !open.map) continue;
        const closeType = open.type.replace("_open", "_close");
        const items = [];
        let j = i + 1;
        for (; j < tokens.length; j++) {
          const token = tokens[j];
          if (token.type === closeType && token.level === 0) break;
          if (token.type === "list_item_open" && token.level === 1 && token.map) items.push(listItemText(lines, token.map));
        }
        lists.push({ ordered: open.type === "ordered_list_open", start: open.map[0], end: open.map[1], items });
        i = j;
      }
      return { lines, lists };
    },
    /** Cuántas casillas `- [ ]` tiene un texto (misma regla que el render). */
    countTasks(text) {
      const env = {};
      md.parse(String(text == null ? "" : text), env);
      return env.taskCount || 0;
    },
    /** Enlaces e imágenes de un texto, para el verificador de enlaces. */
    collectLinks(text) {
      const found = [];
      const walk = (tokens) => {
        for (const token of tokens) {
          if (token.type === "link_open") found.push({ kind: "link", url: token.attrGet("href") });
          if (token.type === "image") found.push({ kind: "image", url: token.attrGet("src") });
          if (token.children) walk(token.children);
        }
      };
      walk(md.parse(String(text == null ? "" : text), {}));
      return found;
    },
  };
}

/** Texto plano aproximado para el índice de búsqueda. */
export function plainText(markdown, limit = 6000) {
  return normalizeNewlines(markdown)
    .replace(/^ {0,3}:::[ \t]*[\w-]*(.*)$/gm, (line, attrs) => Object.values(parseAttributes(attrs).attrs).join(" "))
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\{\{\s*[\w]+\s*\}\}/g, " ")
    .replace(/[`*_>#|~[\]()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
