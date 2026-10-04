// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * quiz.js — Pruebas de práctica `{titulo}.test.md`.
 *
 * Cada `:::question type="…"` es una pregunta de entrenamiento:
 *
 *   single      opción única        - [ ] / - [x] (exactamente una [x])
 *   multiple    opción múltiple     - [ ] / - [x] (una o más [x])
 *   true-false  verdadero o falso   answer="true" | answer="false"
 *   text        respuesta corta     answer="valor|alternativa"
 *   number      respuesta numérica  answer="42" tolerance="0.5"
 *   order       ordenar             lista numerada en el orden correcto
 *   match       relacionar          lista «elemento :: pareja»
 *
 * Opcionalmente lleva `:::hint` (pista) y `:::explanation` (se muestra al
 * corregir). Cada pregunta vale `points` (1 por defecto) si la respuesta es
 * exactamente correcta.
 *
 * Las respuestas del lector se guardan solo en este navegador:
 *   docpages:{repo}:{slug}:{version}:test →
 *   { v:2, seed, answers:{id:valor}, checked:[ids], finished, best, attempts,
 *     updatedAt, summary:{score,total,percent,…} }
 * `seed` fija el orden aleatorio de opciones y elementos hasta el siguiente
 * intento, para que el orden no cambie al recargar.
 */

import { groupLanguageBlocks, pickLanguageVariant, markdownOf, localizedAttribute, ID_RE } from "./markdown.js";
import { QUESTION_TYPE_ICONS } from "./icons.js";
import { h, icon, progressBar, enhanceContent, renderDocHeader, hydrateTaskMarkers } from "./ui.js";

export const QUESTION_TYPES = Object.freeze(["single", "multiple", "true-false", "text", "number", "order", "match"]);
export const FEEDBACK_MODES = Object.freeze(["immediate", "end"]);
export const DEFAULT_PASSING_SCORE = 70;
const MAX_POINTS = 100;
const TRUE_WORDS = ["true", "verdadero"];
const FALSE_WORDS = ["false", "falso"];
const MATCH_RE = /^([\s\S]*?\S)\s+::\s+(\S[\s\S]*)$/;
const range = (n) => Array.from({ length: n }, (_, i) => i);
const shorten = (text, max = 40) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

// ─────────────────────────────── Contenido ──────────────────────────────────

/** Markdown de un nodo en un idioma: texto común + la variante `:::lang` elegida, sin directivas hijas. */
export function sourceFor(children, lang) {
  const parts = [];
  for (const item of groupLanguageBlocks(children)) {
    if (item.kind === "markdown") parts.push(item.text);
    else if (item.kind === "lang-group") parts.push(markdownOf(pickLanguageVariant(item, lang).children));
  }
  return parts.join("\n\n").trim();
}

/**
 * Separa el enunciado de la lista de respuestas según el tipo.
 * @param {string} type
 * @param {string} source Markdown de la pregunta en un idioma
 * @param {(text:string)=>{lines:string[], lists:Array}} listsOf ver markdown.js
 * @returns {{prompt:string, items:Array, problems:string[]}}
 */
export function extractContent(type, source, listsOf) {
  const { lines, lists } = listsOf(source);
  const problems = [];
  const cut = (list) => [...lines.slice(0, list.start), ...lines.slice(list.end)].join("\n").trim();
  const taskLists = lists.filter((list) => list.items.some((item) => item.task !== null));
  let prompt = source.trim();
  let items = [];

  if (type === "single" || type === "multiple") {
    const list = taskLists[0];
    if (!list) {
      problems.push("no tiene opciones: escribe una lista con «- [ ]» y marca la correcta con «- [x]».");
    } else {
      if (taskLists.length > 1) problems.push("tiene más de una lista de opciones; deja una sola.");
      if (list.items.some((item) => item.task === null)) problems.push("todas las opciones deben empezar con «- [ ]» o «- [x]».");
      items = list.items.map((item) => ({ text: item.text, correct: item.task === true }));
      if (items.length < 2) problems.push("necesita al menos 2 opciones.");
      if (items.some((item) => !item.text)) problems.push("hay una opción vacía.");
      prompt = cut(list);
    }
  } else if (type === "order" || type === "match") {
    if (taskLists.length) problems.push(`no usa casillas «- [ ]»: escribe una lista ${type === "order" ? "numerada (1. 2. 3.) en el orden correcto" : "con líneas «elemento :: pareja»"}.`);
    const list = lists[lists.length - 1];
    if (!list) {
      problems.push(type === "order" ? "necesita una lista numerada (1. 2. 3.) con los elementos en el orden correcto." : "necesita una lista con líneas «elemento :: pareja».");
    } else {
      prompt = cut(list);
      if (type === "order") {
        items = list.items.map((item) => ({ text: item.text }));
      } else {
        items = list.items.map((item) => {
          const match = MATCH_RE.exec(item.text);
          if (!match) problems.push(`la línea «${shorten(item.text)}» no tiene el formato «elemento :: pareja».`);
          return match ? { left: match[1].trim(), right: match[2].trim() } : { left: item.text, right: "" };
        });
      }
      if (items.length < 2) problems.push("necesita al menos 2 elementos en la lista.");
      const keys = items.map((item) => normalizeAnswer(type === "order" ? item.text : item.right));
      if (new Set(keys).size !== keys.length) problems.push(type === "order" ? "hay elementos repetidos en la lista." : "hay parejas repetidas: cada elemento de la derecha debe ser distinto.");
    }
  } else if (taskLists.length) {
    problems.push(type === "true-false" ? 'no usa opciones «- [ ]»: indica la respuesta con answer="true" o answer="false".' : 'no usa opciones «- [ ]»: indica la respuesta con answer="…".');
  }
  if (!prompt) problems.push("no tiene enunciado: escribe la pregunta antes de la lista.");
  return { prompt, items, problems };
}

const splitAnswers = (value) =>
  String(value == null ? "" : value)
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);

/** Respuestas aceptadas por idioma a partir de `answer` / `answer.es` / `answer.en`. */
function answersByLanguage(answer, languages) {
  if (answer == null) return Object.fromEntries(languages.map((lang) => [lang, []]));
  if (typeof answer === "string") return Object.fromEntries(languages.map((lang) => [lang, splitAnswers(answer)]));
  return Object.fromEntries(languages.map((lang) => [lang, splitAnswers(answer[lang] != null ? answer[lang] : answer._)]));
}

function applyAnswerKey(question, attrs, { languages, fail, distinct }) {
  const { type } = question;
  const variants = languages.map((lang) => question.variants[lang]);
  const base = variants[0];
  const answer = localizedAttribute(attrs, "answer");

  if (!["true-false", "text", "number"].includes(type) && answer != null) {
    fail(type === "single" || type === "multiple" ? "no usa answer: marca la opción correcta con «- [x]»." : "no usa answer: la respuesta es el orden de la lista.");
  }
  if (type !== "number" && attrs.tolerance != null) fail("tolerance solo se usa en preguntas de tipo «number».");
  if (distinct && variants.some((v) => v.items.length !== base.items.length)) {
    fail(`las variantes de idioma tienen distinto número de elementos (${variants.map((v) => v.items.length).join(" / ")}).`);
  }

  switch (type) {
    case "single":
    case "multiple": {
      const correct = base.items.map((item, i) => (item.correct ? i : -1)).filter((i) => i >= 0);
      if (base.items.length) {
        if (type === "single" && correct.length !== 1) fail(`una pregunta «single» necesita exactamente una opción correcta «- [x]» (tiene ${correct.length}).`);
        if (type === "multiple" && !correct.length) fail("una pregunta «multiple» necesita al menos una opción correcta «- [x]».");
      }
      const pattern = (v) => v.items.map((item) => (item.correct ? "x" : "-")).join("");
      if (distinct && variants.some((v) => pattern(v) !== pattern(base))) fail("las variantes de idioma no marcan las mismas opciones correctas.");
      question.correct = correct;
      question.count = base.items.length;
      break;
    }
    case "true-false": {
      const word = typeof answer === "string" ? answer.trim().toLowerCase() : null;
      if (TRUE_WORDS.includes(word)) question.answer = true;
      else if (FALSE_WORDS.includes(word)) question.answer = false;
      else fail(answer == null ? 'necesita answer="true" o answer="false".' : 'answer no es válido: usa answer="true" o answer="false".');
      break;
    }
    case "text": {
      const byLang = answersByLanguage(answer, languages);
      const accepted = [...new Set(Object.values(byLang).flat())];
      if (!accepted.length) fail('necesita la respuesta aceptada: answer="…" (separa alternativas con «|»).');
      question.accepted = accepted;
      question.display = byLang;
      break;
    }
    case "number": {
      const value = typeof answer === "string" ? parseNumber(answer) : null;
      if (value == null) fail(answer == null ? 'necesita answer="…" con un número.' : `answer${typeof answer === "string" ? `="${answer}"` : ""} no es un número.`);
      const tolerance = attrs.tolerance == null ? 0 : parseNumber(attrs.tolerance);
      if (tolerance == null || tolerance < 0) fail(`tolerance="${attrs.tolerance}" debe ser un número mayor o igual que 0.`);
      question.value = value;
      question.tolerance = tolerance == null || tolerance < 0 ? 0 : tolerance;
      break;
    }
    default:
      question.count = base.items.length;
  }
}

/**
 * Construye y valida las preguntas de un documento.
 * @param {Array} nodes árbol de parseDirectives
 * @param {{listsOf:Function, languages?:string[]}} opts
 * @returns {{questions:Array, errors:Array<{line:number, message:string}>}}
 */
export function buildQuizModel(nodes, { listsOf, languages = ["es", "en"] }) {
  const questions = [];
  const errors = [];
  const ids = new Map();

  for (const node of nodes) {
    if (node.kind !== "directive" || node.name !== "question") continue;
    const index = questions.length;
    const problems = new Set();
    const fail = (message) => problems.add(message);

    const explicitId = node.attrs.id;
    if (explicitId != null && !ID_RE.test(explicitId)) fail(`id inválido «${explicitId}»: usa letras, números, guiones o guiones bajos.`);
    const id = explicitId != null && ID_RE.test(explicitId) ? explicitId : `q${index + 1}`;
    if (ids.has(id)) fail(`id duplicado «${id}» (ya usado en la línea ${ids.get(id)}).`);
    else ids.set(id, node.line);

    const type = String(node.attrs.type || "").trim().toLowerCase();
    if (!node.attrs.type) fail(`falta el tipo: añade type="…" (${QUESTION_TYPES.join(", ")}).`);
    else if (!QUESTION_TYPES.includes(type)) fail(`tipo desconocido «${node.attrs.type}» (usa: ${QUESTION_TYPES.join(", ")}).`);

    let points = 1;
    if (node.attrs.points != null) {
      const raw = String(node.attrs.points).trim();
      if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > MAX_POINTS) fail(`points="${node.attrs.points}" debe ser un número entero entre 1 y ${MAX_POINTS}.`);
      else points = Number(raw);
    }

    const children = node.children.filter((child) => child.kind === "directive");
    const explanations = children.filter((child) => child.name === "explanation");
    const hints = children.filter((child) => child.name === "hint");
    if (explanations.length > 1) fail("solo puede tener un «:::explanation».");
    if (hints.length > 1) fail("solo puede tener un «:::hint».");

    const question = { id, index, type, points, line: node.line, node, variants: {}, explanation: explanations[0] || null, hint: hints[0] || null, count: 0 };
    if (QUESTION_TYPES.includes(type)) {
      const sources = Object.fromEntries(languages.map((lang) => [lang, sourceFor(node.children, lang)]));
      const distinct = new Set(Object.values(sources)).size > 1;
      for (const lang of languages) {
        const content = extractContent(type, sources[lang], listsOf);
        question.variants[lang] = { prompt: content.prompt, items: content.items };
        content.problems.forEach((problem) => fail(distinct ? `[${lang}] ${problem}` : problem));
      }
      applyAnswerKey(question, node.attrs, { languages, fail, distinct });
    }
    problems.forEach((message) => errors.push({ line: node.line, message: `Pregunta ${index + 1}: ${message}` }));
    questions.push(question);
  }
  return { questions, errors };
}

// ─────────────────────────────── Corrección ─────────────────────────────────

/** Minúsculas, sin tildes, sin comillas ni puntuación final y con espacios simples. */
export function normalizeAnswer(value) {
  return String(value == null ? "" : value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[`"'“”‘’«»¿¡]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;:!?]+$/, "")
    .trim();
}

/** "3,5" o "3.5" → 3.5; texto que no es un número → null. */
export function parseNumber(value) {
  if (value == null) return null;
  const text = String(value).trim().replace(/\s+/g, "").replace(",", ".");
  if (!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

const isPermutation = (value, n) => Array.isArray(value) && value.length === n && [...value].sort((a, b) => a - b).every((v, i) => v === i);

/** ¿El valor guardado tiene la forma correcta para la pregunta? */
export function isValidValue(question, value) {
  switch (question.type) {
    case "single":
      return Number.isInteger(value) && value >= 0 && value < question.count;
    case "multiple":
      return Array.isArray(value) && value.every((i) => Number.isInteger(i) && i >= 0 && i < question.count) && new Set(value).size === value.length;
    case "true-false":
      return typeof value === "boolean";
    case "text":
    case "number":
      return typeof value === "string" && value.length <= 500;
    case "order":
      return isPermutation(value, question.count);
    case "match":
      return Array.isArray(value) && value.length === question.count && value.every((v) => v === null || (Number.isInteger(v) && v >= 0 && v < question.count));
    default:
      return false;
  }
}

export function isAnswered(question, value) {
  if (!isValidValue(question, value)) return false;
  if (question.type === "multiple") return value.length > 0;
  if (question.type === "text" || question.type === "number") return value.trim() !== "";
  if (question.type === "match") return value.some((v) => v !== null);
  return true;
}

export function isCorrect(question, value) {
  if (!isAnswered(question, value)) return false;
  switch (question.type) {
    case "single":
      return question.correct.length === 1 && value === question.correct[0];
    case "multiple":
      return value.length === question.correct.length && question.correct.every((i) => value.includes(i));
    case "true-false":
      return value === question.answer;
    case "text": {
      const given = normalizeAnswer(value);
      return question.accepted.some((accepted) => normalizeAnswer(accepted) === given);
    }
    case "number": {
      const given = parseNumber(value);
      return given != null && question.value != null && Math.abs(given - question.value) <= question.tolerance + 1e-9;
    }
    case "order":
    case "match":
      return value.every((v, i) => v === i);
    default:
      return false;
  }
}

/**
 * Puntuación de la prueba. Solo cuentan las preguntas comprobadas (todas, si
 * se finalizó). `percent` se redondea hacia abajo.
 */
export function gradeQuiz(model, state, { passingScore = DEFAULT_PASSING_SCORE } = {}) {
  const checkedIds = new Set(state.finished ? model.questions.map((q) => q.id) : state.checked);
  const result = { score: 0, total: 0, percent: 0, correct: 0, answered: 0, checked: 0, questions: model.questions.length, finished: false, passed: null, wrong: [] };
  for (const question of model.questions) {
    const value = state.answers[question.id];
    result.total += question.points;
    if (isAnswered(question, value)) result.answered += 1;
    if (!checkedIds.has(question.id)) continue;
    result.checked += 1;
    if (isCorrect(question, value)) {
      result.correct += 1;
      result.score += question.points;
    } else {
      result.wrong.push(question.id);
    }
  }
  result.percent = result.total ? Math.floor((result.score * 100) / result.total) : 0;
  result.finished = Boolean(state.finished) || (result.questions > 0 && result.checked === result.questions);
  result.passed = result.finished ? result.score * 100 >= passingScore * result.total : null;
  return result;
}

// ─────────────────────────────── Estado ─────────────────────────────────────

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

const hashString = (text) => {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** Semilla propia de cada pregunta, derivada de la del intento. */
export const questionSeed = (seed, id) => (seed ^ hashString(id)) >>> 0;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Permutación determinista de 0…n-1 (Fisher-Yates con semilla). */
export function seededPermutation(n, seed) {
  const random = mulberry32(seed);
  const order = range(n);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Como seededPermutation, pero nunca devuelve el orden correcto (si hay 2 o más elementos). */
export function shuffledOrder(n, seed) {
  const order = seededPermutation(n, seed);
  return n > 1 && order.every((v, i) => v === i) ? [...order.slice(1), order[0]] : order;
}

export function newQuizState({ seed = randomSeed(), best = null, attempts = 0 } = {}) {
  return { seed, answers: {}, checked: [], finished: false, best, attempts };
}

/** Estado guardado → estado en memoria; descarta preguntas y valores que ya no existen. */
export function restoreQuizState(raw, model, { seed = randomSeed() } = {}) {
  if (!raw || typeof raw !== "object" || raw.v !== 2) return newQuizState({ seed });
  const byId = new Map(model.questions.map((q) => [q.id, q]));
  const answers = {};
  for (const [id, value] of Object.entries(raw.answers && typeof raw.answers === "object" ? raw.answers : {})) {
    if (byId.has(id) && isValidValue(byId.get(id), value)) answers[id] = value;
  }
  return {
    seed: Number.isInteger(raw.seed) && raw.seed >= 0 ? raw.seed : seed,
    answers,
    checked: Array.isArray(raw.checked) ? [...new Set(raw.checked.filter((id) => byId.has(id)))] : [],
    finished: raw.finished === true,
    best: typeof raw.best === "number" && raw.best >= 0 && raw.best <= 100 ? raw.best : null,
    attempts: Number.isInteger(raw.attempts) && raw.attempts > 0 ? raw.attempts : 0,
  };
}

export function serializeQuizState(state, model, { passingScore = DEFAULT_PASSING_SCORE, now = new Date() } = {}) {
  const { score, total, percent, correct, answered, checked, questions, finished, passed } = gradeQuiz(model, state, { passingScore });
  return {
    v: 2,
    seed: state.seed,
    answers: { ...state.answers },
    checked: [...state.checked],
    finished: state.finished,
    best: state.best,
    attempts: state.attempts,
    updatedAt: now.toISOString(),
    summary: { score, total, percent, correct, answered, checked, questions, finished, passed },
  };
}

// ─────────────────────────────────── Vista ───────────────────────────────────

const domId = (prefix, id) => `${prefix}-${String(id).replace(/[^\w-]/g, "_")}`;
const letter = (position) => String.fromCharCode(65 + (position % 26));

/**
 * @param {object} ctx contexto de vista (ver app.js)
 * @param {{entry:object, analysis:object, stateKey:string}} input
 */
export function renderQuizView(ctx, { entry, analysis, stateKey }) {
  const { doc, t } = ctx;
  const meta = analysis.meta;
  const model = analysis.model;
  const passingScore = Number.isInteger(meta.passingScore) ? meta.passingScore : DEFAULT_PASSING_SCORE;
  const endFeedback = meta.feedback === "end";
  const shuffleChoices = meta.shuffle === true;
  const total = model.questions.length;
  let state = restoreQuizState(ctx.store.getJSON(stateKey), model);
  const views = new Map();

  const grade = () => gradeQuiz(model, state, { passingScore });
  const save = () => ctx.store.setJSON(stateKey, serializeQuizState(state, model, { passingScore }));
  const isChecked = (id) => state.finished || state.checked.includes(id);
  const blockOf = (node) => {
    const block = h(doc, "div", { class: "md" });
    block.append(ctx.renderMarkdown(sourceFor(node.children, ctx.lang)));
    return block;
  };
  /** Opciones: en línea si ocupan una línea; como bloque si traen código o párrafos. */
  const optionContent = (markdown) => (markdown.includes("\n") ? ctx.renderMarkdown(markdown) : ctx.renderInline(markdown));
  const plainOf = (markdown) => {
    const span = h(doc, "span");
    span.append(ctx.renderInline(markdown));
    return span.textContent.replace(/\s+/g, " ").trim();
  };
  const mark = (target, ok) => {
    target.replaceChildren(icon(doc, ok ? "circle-check" : "circle-x"), h(doc, "span", { class: "sr-only", text: ` ${t(ok ? "quiz.markCorrect" : "quiz.markWrong")}` }));
  };

  // ── Respuestas por tipo ───────────────────────────────────────────────────
  function buildChoices(q, variant, view, ids) {
    const multiple = q.type === "multiple";
    const options =
      q.type === "true-false"
        ? [
            { value: true, label: t("quiz.true") },
            { value: false, label: t("quiz.false") },
          ]
        : variant.items.map((item, i) => ({ value: i, markdown: item.text }));
    const order = q.type !== "true-false" && shuffleChoices ? seededPermutation(options.length, questionSeed(state.seed, q.id)) : range(options.length);
    const instruction = t(multiple ? "quiz.chooseMany" : q.type === "true-false" ? "quiz.chooseTrueFalse" : "quiz.chooseOne");
    const rows = order.map((index, position) => {
      const option = options[index];
      const input = h(doc, "input", { type: multiple ? "checkbox" : "radio", name: domId("q", q.id), value: String(index) });
      const text = h(doc, "span", { class: "choice__text" });
      if (option.markdown != null) text.append(optionContent(option.markdown));
      else text.textContent = option.label;
      const status = h(doc, "span", { class: "choice__mark" });
      const label = h(doc, "label", { class: "choice" }, input, q.type === "true-false" ? null : h(doc, "span", { class: "choice__letter", "aria-hidden": "true", text: letter(position) }), text, status);
      input.addEventListener("change", () => {
        if (!multiple) return setAnswer(q, option.value);
        const current = new Set(Array.isArray(state.answers[q.id]) ? state.answers[q.id] : []);
        if (input.checked) current.add(option.value);
        else current.delete(option.value);
        return setAnswer(q, [...current].sort((a, b) => a - b));
      });
      return { input, label, status, option };
    });
    const isRight = (option) => (q.type === "true-false" ? option.value === q.answer : q.correct.includes(option.value));
    view.sync = (value, checked) => {
      for (const { input, label, status, option } of rows) {
        const chosen = multiple ? Array.isArray(value) && value.includes(option.value) : value === option.value;
        input.checked = chosen;
        input.disabled = checked;
        label.classList.toggle("is-correct", checked && isRight(option));
        label.classList.toggle("is-wrong", checked && chosen && !isRight(option));
        if (checked && isRight(option)) mark(status, true);
        else if (checked && chosen) mark(status, false);
        else status.replaceChildren();
      }
    };
    return h(doc, "fieldset", { class: "choices", "aria-describedby": ids.prompt }, h(doc, "legend", { class: "answer-hint", text: instruction }), rows.map((row) => row.label));
  }

  function buildInput(q, view, ids) {
    const inputId = domId("answer", q.id);
    const helpId = q.type === "number" ? domId("answer-help", q.id) : null;
    const input = h(doc, "input", {
      type: "text",
      id: inputId,
      class: "answer-input",
      autocomplete: "off",
      spellcheck: "false",
      inputmode: q.type === "number" ? "decimal" : null,
      "aria-describedby": [ids.prompt, helpId].filter(Boolean).join(" "),
    });
    input.addEventListener("input", () => setAnswer(q, input.value));
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || endFeedback) return;
      event.preventDefault();
      check(q);
    });
    view.sync = (value, checked) => {
      const text = typeof value === "string" ? value : "";
      if (input.value !== text) input.value = text;
      input.disabled = checked;
      input.classList.toggle("is-correct", checked && isCorrect(q, value));
      input.classList.toggle("is-wrong", checked && !isCorrect(q, value));
    };
    view.answerText = () => {
      if (q.type === "number") {
        const format = (n) => new Intl.NumberFormat(ctx.lang, { maximumFractionDigits: 10 }).format(n);
        return q.tolerance ? `${format(q.value)} (± ${format(q.tolerance)})` : format(q.value);
      }
      return (q.display[ctx.lang] && q.display[ctx.lang][0]) || q.accepted[0];
    };
    return h(doc, "div", { class: "answer-field" }, h(doc, "label", { for: inputId, text: t("quiz.yourAnswer") }), input, helpId ? h(doc, "p", { class: "answer-hint", id: helpId, text: t("quiz.numberHint") }) : null);
  }

  function buildOrder(q, variant, view, ids) {
    const list = h(doc, "ol", { class: "order-list", "aria-describedby": ids.prompt });
    const labels = variant.items.map((item) => plainOf(item.text));
    const arrangement = () => (isPermutation(state.answers[q.id], q.count) ? state.answers[q.id] : shuffledOrder(q.count, questionSeed(state.seed, q.id)));
    let locked = false;

    const draw = (focus = null) => {
      const current = arrangement();
      list.replaceChildren(
        ...current.map((itemIndex, position) => {
          const text = h(doc, "span", { class: "order__text" });
          text.append(optionContent(variant.items[itemIndex].text));
          const button = (dir) => {
            const disabled = locked || (dir === "up" ? position === 0 : position === current.length - 1);
            const el = h(doc, "button", { type: "button", class: "btn btn--icon btn--tiny", "aria-label": t(dir === "up" ? "quiz.moveUp" : "quiz.moveDown", { item: labels[itemIndex] }), disabled, dataset: { item: String(itemIndex), dir } }, icon(doc, dir === "up" ? "arrow-up" : "arrow-down"));
            el.addEventListener("click", () => move(itemIndex, dir));
            return el;
          };
          return h(doc, "li", { class: "order__item", dataset: { item: String(itemIndex) } }, h(doc, "span", { class: "order__position", "aria-hidden": "true", text: String(position + 1) }), text, h(doc, "span", { class: "choice__mark" }), h(doc, "span", { class: "order__buttons" }, button("up"), button("down")));
        }),
      );
      if (!focus) return;
      const target = list.querySelector(`button[data-item="${focus.item}"][data-dir="${focus.dir}"]`);
      const fallback = list.querySelector(`button[data-item="${focus.item}"]:not(:disabled)`);
      const next = target && !target.disabled ? target : fallback;
      if (next) next.focus();
    };

    const move = (itemIndex, dir) => {
      const current = [...arrangement()];
      const from = current.indexOf(itemIndex);
      const to = from + (dir === "up" ? -1 : 1);
      if (to < 0 || to >= current.length) return;
      [current[from], current[to]] = [current[to], current[from]];
      setAnswer(q, current);
      draw({ item: itemIndex, dir });
      ctx.announce(t("quiz.moved", { item: labels[itemIndex], position: to + 1, total: current.length }));
    };

    view.ensureAnswer = () => {
      if (!isPermutation(state.answers[q.id], q.count)) state.answers[q.id] = arrangement();
    };
    view.sync = (value, checked) => {
      locked = checked;
      draw();
      list.querySelectorAll(".order__item").forEach((li, position) => {
        const ok = Number(li.dataset.item) === position;
        li.classList.toggle("is-correct", checked && ok);
        li.classList.toggle("is-wrong", checked && !ok);
        if (checked) mark(li.querySelector(".choice__mark"), ok);
      });
    };
    view.correctOrder = () => variant.items.map((item) => item.text);
    return h(doc, "div", { class: "order" }, h(doc, "p", { class: "answer-hint", text: t("quiz.orderHint") }), list);
  }

  function buildMatch(q, variant, view, ids) {
    const order = shuffledOrder(q.count, questionSeed(state.seed, q.id));
    const rows = variant.items.map((pair, leftIndex) => {
      const selectId = domId(`match-${leftIndex}`, q.id);
      const left = h(doc, "label", { for: selectId, class: "match__left" });
      left.append(optionContent(pair.left));
      const select = h(
        doc,
        "select",
        { id: selectId, class: "select", "aria-describedby": ids.prompt },
        h(doc, "option", { value: "", text: t("quiz.matchPlaceholder") }),
        order.map((rightIndex) => h(doc, "option", { value: String(rightIndex), text: plainOf(variant.items[rightIndex].right) })),
      );
      select.addEventListener("change", () => {
        const value = Array.isArray(state.answers[q.id]) ? [...state.answers[q.id]] : Array(q.count).fill(null);
        value[leftIndex] = select.value === "" ? null : Number(select.value);
        setAnswer(q, value.every((v) => v === null) ? null : value);
      });
      const status = h(doc, "span", { class: "choice__mark" });
      const fix = h(doc, "span", { class: "match__fix", hidden: true });
      return { row: h(doc, "li", { class: "match__row" }, left, h(doc, "span", { class: "match__answer" }, select, status), fix), select, status, fix, leftIndex };
    });
    view.sync = (value, checked) => {
      for (const { row, select, status, fix, leftIndex } of rows) {
        const chosen = Array.isArray(value) ? value[leftIndex] : null;
        select.value = chosen == null ? "" : String(chosen);
        select.disabled = checked;
        const ok = chosen === leftIndex;
        row.classList.toggle("is-correct", checked && ok);
        row.classList.toggle("is-wrong", checked && !ok);
        if (checked) mark(status, ok);
        else status.replaceChildren();
        fix.hidden = !checked || ok;
        fix.textContent = t("quiz.matchShould", { answer: plainOf(variant.items[leftIndex].right) });
      }
    };
    return h(doc, "div", { class: "match" }, h(doc, "p", { class: "answer-hint", text: t("quiz.matchHint") }), h(doc, "ul", { class: "match-list" }, rows.map((r) => r.row)));
  }

  // ── Pregunta ──────────────────────────────────────────────────────────────
  function renderQuestion(q) {
    const ids = { title: domId("question-title", q.id), prompt: domId("question-prompt", q.id), hint: domId("question-hint", q.id) };
    const variant = q.variants[ctx.lang] || Object.values(q.variants)[0];
    const view = { q, sync: () => {}, ensureAnswer: null, answerText: null, correctOrder: null };

    const title = h(doc, "h3", { class: "question__title", id: ids.title, tabindex: "-1", text: t("quiz.questionN", { n: q.index + 1, total }) });
    const prompt = h(doc, "div", { class: "question__prompt md", id: ids.prompt });
    prompt.append(ctx.renderMarkdown(variant.prompt));
    hydrateTaskMarkers(doc, prompt);

    let answer;
    if (["single", "multiple", "true-false"].includes(q.type)) answer = buildChoices(q, variant, view, ids);
    else if (q.type === "text" || q.type === "number") answer = buildInput(q, view, ids);
    else if (q.type === "order") answer = buildOrder(q, variant, view, ids);
    else answer = buildMatch(q, variant, view, ids);

    const notice = h(doc, "p", { class: "question__notice", role: "alert", hidden: true });
    const feedback = h(doc, "div", { class: "question__feedback", hidden: true });
    const explanation = q.explanation
      ? h(doc, "div", { class: "question__explanation", hidden: true }, h(doc, "p", { class: "question__label" }, icon(doc, "info"), h(doc, "span", { text: t("quiz.explanation") })), blockOf(q.explanation))
      : null;

    let hintBlock = null;
    let hintToggle = null;
    if (q.hint) {
      hintBlock = h(doc, "div", { class: "question__hint", id: ids.hint, hidden: true }, h(doc, "p", { class: "question__label" }, icon(doc, "lightbulb"), h(doc, "span", { text: t("quiz.hint") })), blockOf(q.hint));
      hintToggle = h(doc, "button", { type: "button", class: "btn btn--small btn--ghost", "aria-expanded": "false", "aria-controls": ids.hint }, icon(doc, "lightbulb"), h(doc, "span", { text: t("quiz.showHint") }));
      hintToggle.addEventListener("click", () => {
        const open = hintBlock.hidden;
        hintBlock.hidden = !open;
        hintToggle.setAttribute("aria-expanded", String(open));
        hintToggle.querySelector("span").textContent = t(open ? "quiz.hideHint" : "quiz.showHint");
      });
    }

    const checkButton = endFeedback ? null : h(doc, "button", { type: "button", class: "btn btn--small btn--primary" }, icon(doc, "check"), h(doc, "span", { text: t("quiz.check") }));
    const retryButton = endFeedback ? null : h(doc, "button", { type: "button", class: "btn btn--small btn--ghost", hidden: true }, icon(doc, "rotate-ccw"), h(doc, "span", { text: t("quiz.retry") }));
    if (checkButton) checkButton.addEventListener("click", () => check(q));
    if (retryButton) retryButton.addEventListener("click", () => retry(q));

    const section = h(
      doc,
      "section",
      { class: "question", id: domId("question", q.id), "aria-labelledby": ids.title, dataset: { id: q.id, type: q.type } },
      h(doc, "header", { class: "question__header" }, title, h(doc, "span", { class: "question__type" }, icon(doc, QUESTION_TYPE_ICONS[q.type]), h(doc, "span", { text: t(`quiz.type.${q.type}`) })), h(doc, "span", { class: "question__points", text: t("quiz.points", { count: q.points }) })),
      prompt,
      answer,
      hintBlock,
      notice,
      feedback,
      explanation,
      h(doc, "div", { class: "question__actions" }, checkButton, retryButton, hintToggle),
    );

    view.section = section;
    view.title = title;
    view.notice = notice;
    view.refresh = () => {
      const value = state.answers[q.id];
      const checked = isChecked(q.id);
      const ok = checked && isCorrect(q, value);
      view.sync(value, checked);
      section.dataset.result = checked ? (ok ? "correct" : "incorrect") : isAnswered(q, value) ? "answered" : "";
      if (checkButton) checkButton.hidden = checked;
      if (retryButton) retryButton.hidden = !checked || state.finished;
      if (explanation) explanation.hidden = !checked;
      feedback.hidden = !checked;
      notice.hidden = true;
      if (!checked) return feedback.replaceChildren();
      const answered = isAnswered(q, value);
      const answerText = !ok && view.answerText ? view.answerText() : "";
      feedback.className = `question__feedback ${ok ? "is-correct" : "is-incorrect"}`;
      // replaceChildren convertiría null en el texto «null»: se filtran los ausentes.
      feedback.replaceChildren(
        ...[
          h(doc, "p", { class: "question__verdict" }, icon(doc, ok ? "circle-check" : "circle-x"), h(doc, "strong", { text: ok ? t("quiz.correct") : answered ? t("quiz.incorrect") : t("quiz.unanswered") })),
          answerText ? h(doc, "p", { text: t("quiz.correctAnswer", { answer: answerText }) }) : null,
          !ok && view.correctOrder
            ? h(doc, "div", { class: "question__solution" }, h(doc, "p", { text: t("quiz.correctOrder") }), h(doc, "ol", {}, view.correctOrder().map((text) => h(doc, "li", {}, optionContent(text)))))
            : null,
        ].filter(Boolean),
      );
    };
    views.set(q.id, view);
    return section;
  }

  // ── Acciones ──────────────────────────────────────────────────────────────
  function record(wasFinished) {
    const result = grade();
    if (result.finished && !wasFinished) {
      state.attempts += 1;
      state.best = Math.max(state.best == null ? 0 : state.best, result.percent);
    }
    return result;
  }

  function setAnswer(q, value) {
    if (isChecked(q.id)) return;
    const empty = value == null || value === "" || (Array.isArray(value) && !value.length);
    if (empty) delete state.answers[q.id];
    else state.answers[q.id] = value;
    save();
    const view = views.get(q.id);
    view.notice.hidden = true;
    view.section.dataset.result = isAnswered(q, state.answers[q.id]) ? "answered" : "";
    syncSummary();
  }

  function check(q) {
    const view = views.get(q.id);
    if (view.ensureAnswer) view.ensureAnswer();
    const value = state.answers[q.id];
    if (!isAnswered(q, value)) {
      view.notice.textContent = t("quiz.answerFirst");
      view.notice.hidden = false;
      return;
    }
    const wasFinished = grade().finished;
    if (!state.checked.includes(q.id)) state.checked.push(q.id);
    const result = record(wasFinished);
    save();
    view.refresh();
    syncSummary();
    ctx.announce(t(isCorrect(q, value) ? "quiz.announceCorrect" : "quiz.announceIncorrect", { n: q.index + 1 }));
    if (result.finished && !wasFinished) showResults();
  }

  function retry(q) {
    state.checked = state.checked.filter((id) => id !== q.id);
    delete state.answers[q.id];
    save();
    const view = views.get(q.id);
    view.refresh();
    syncSummary();
    const first = view.section.querySelector("input:not(:disabled), select:not(:disabled), .order-list button:not(:disabled)");
    if (first) first.focus();
  }

  function finish() {
    const wasFinished = grade().finished;
    for (const view of views.values()) if (view.ensureAnswer) view.ensureAnswer();
    state.finished = true;
    state.checked = model.questions.map((q) => q.id);
    record(wasFinished);
    save();
    syncAll();
    showResults();
  }

  function tryAgain() {
    state = newQuizState({ best: state.best, attempts: state.attempts });
    save();
    rebuild();
    const first = views.get(model.questions[0].id);
    if (first) first.title.focus();
  }

  function reset() {
    ctx.store.remove(stateKey);
    state = newQuizState();
    rebuild();
  }

  // ── Puntuación, finalizar y resultado ─────────────────────────────────────
  const scoreLabel = h(doc, "span", { id: "quiz-score-label" });
  const scoreValue = h(doc, "strong", { class: "doc-progress__value" });
  const scoreBar = progressBar(doc, { labelledBy: "quiz-score-label" });
  const scoreDetail = h(doc, "span", { class: "doc-progress__detail" });
  const scoreStatus = h(doc, "p", { class: "quiz-score__status" });
  const scoreBest = h(doc, "p", { class: "quiz-score__best", hidden: true });
  const scorePanel = h(doc, "div", { class: "doc-progress quiz-score" }, h(doc, "div", { class: "doc-progress__top" }, scoreLabel, scoreValue), scoreBar.element, scoreDetail, scoreStatus, scoreBest);

  const finishStatus = h(doc, "p", { class: "quiz-finish__status", id: "quiz-finish-status" });
  const finishLabel = h(doc, "span", { text: t("quiz.finish") });
  const finishButton = h(doc, "button", { type: "button", class: "btn btn--primary", "aria-describedby": "quiz-finish-status" }, icon(doc, "flag"), finishLabel);
  let finishArmed = false;
  finishButton.addEventListener("click", () => {
    const pending = total - grade().answered;
    if (pending > 0 && !finishArmed) {
      finishArmed = true;
      finishLabel.textContent = t("quiz.finishConfirm");
      finishStatus.textContent = t("quiz.finishPending", { count: pending });
      ctx.announce(finishStatus.textContent);
      return;
    }
    finish();
  });
  finishButton.addEventListener("blur", () => {
    setTimeout(() => {
      if (doc.activeElement === finishButton || !finishArmed) return;
      finishArmed = false;
      syncSummary();
    }, 150);
  });
  const finishBar = h(doc, "div", { class: "quiz-finish" }, finishStatus, finishButton);

  const resultsBody = h(doc, "div", { class: "quiz-results__body" });
  const resultsTitle = h(doc, "h2", { id: "quiz-results-title", class: "section-title", tabindex: "-1" }, icon(doc, "trophy"), h(doc, "span", { text: t("quiz.resultTitle") }));
  const tryAgainButton = h(doc, "button", { type: "button", class: "btn btn--primary" }, icon(doc, "rotate-ccw"), h(doc, "span", { text: t("quiz.tryAgain") }));
  tryAgainButton.addEventListener("click", tryAgain);
  const results = h(doc, "section", { class: "quiz-results", "aria-labelledby": "quiz-results-title", hidden: true }, resultsTitle, resultsBody, h(doc, "div", { class: "quiz-results__actions" }, tryAgainButton));

  function syncSummary() {
    const result = grade();
    const pending = endFeedback && !result.finished;
    scoreLabel.textContent = pending ? t("quiz.progress") : t("quiz.score");
    const shown = pending ? Math.floor((result.answered * 100) / (total || 1)) : result.percent;
    const detail = pending ? t("quiz.answeredDetail", { answered: result.answered, total }) : `${t("quiz.scoreDetail", { score: result.score, total: result.total })} · ${t("quiz.checkedDetail", { checked: result.checked, total })}`;
    scoreValue.textContent = ctx.formatPercent(shown);
    scoreBar.update(shown, `${ctx.formatPercent(shown)} · ${detail}`);
    scoreDetail.textContent = detail;

    scoreStatus.replaceChildren();
    if (result.finished) {
      scoreStatus.append(h(doc, "span", { class: ["badge", result.passed ? "status--passed" : "status--failed"] }, icon(doc, result.passed ? "trophy" : "circle-x"), h(doc, "span", { text: t(result.passed ? "quiz.passed" : "quiz.failed") })));
    } else {
      scoreStatus.append(h(doc, "span", { class: "badge" }, icon(doc, "circle-dot-dashed"), h(doc, "span", { text: t("quiz.inProgress") })));
    }
    scoreStatus.append(" ", h(doc, "span", { class: "quiz-score__mark", text: t("quiz.passMarkShort", { percent: ctx.formatPercent(passingScore) }) }));
    scoreBest.hidden = !state.attempts;
    scoreBest.textContent = state.attempts ? `${t("quiz.best", { percent: ctx.formatPercent(state.best || 0) })} · ${t("quiz.attempts", { count: state.attempts })}` : "";

    finishBar.hidden = result.finished;
    if (!finishArmed) {
      finishLabel.textContent = t("quiz.finish");
      finishStatus.textContent = t("quiz.answeredDetail", { answered: result.answered, total });
    }
    results.hidden = !result.finished;
    if (result.finished) paintResults(result);
  }

  function paintResults(result) {
    resultsBody.replaceChildren(
      h(doc, "p", { class: ["quiz-results__verdict", result.passed ? "status--passed" : "status--failed"] }, icon(doc, result.passed ? "trophy" : "circle-x"), h(doc, "strong", { text: ctx.formatPercent(result.percent) }), h(doc, "span", { text: t(result.passed ? "quiz.passed" : "quiz.failed") })),
      h(doc, "p", { text: `${t("quiz.resultDetail", { correct: result.correct, total: result.questions })} · ${t("quiz.scoreDetail", { score: result.score, total: result.total })}` }),
      h(doc, "p", { class: "hint", text: t("quiz.passMark", { percent: ctx.formatPercent(passingScore) }) }),
      result.wrong.length
        ? h(doc, "div", { class: "quiz-results__review" }, h(doc, "p", { text: t("quiz.review") }), h(doc, "ul", {}, result.wrong.map((id) => {
            const q = model.questions.find((item) => item.id === id);
            return h(doc, "li", {}, h(doc, "a", { href: ctx.routeFor(entry, id), text: t("quiz.questionN", { n: q.index + 1, total }) }));
          })))
        : h(doc, "p", { class: "quiz-results__perfect" }, icon(doc, "party-popper"), h(doc, "span", { text: t("quiz.allCorrect") })),
    );
  }

  function showResults() {
    const result = grade();
    syncSummary();
    ctx.announce(t("quiz.announceResult", { percent: ctx.formatPercent(result.percent), verdict: t(result.passed ? "quiz.passed" : "quiz.failed") }));
    if (typeof results.scrollIntoView === "function") results.scrollIntoView({ block: "start" });
    resultsTitle.focus({ preventScroll: true });
  }

  function syncAll() {
    for (const view of views.values()) view.refresh();
    syncSummary();
  }

  // ── Ensamblado ────────────────────────────────────────────────────────────
  const buildContent = () => {
    views.clear();
    const container = h(doc, "div", { class: "quiz-content" });
    for (const item of groupLanguageBlocks(analysis.nodes)) {
      if (item.kind === "directive" && item.name === "question") {
        const q = model.questions.find((question) => question.node === item);
        if (q) container.append(renderQuestion(q));
      } else if (item.kind === "lang-group") {
        const block = h(doc, "div", { class: "lang-block" });
        block.append(ctx.renderMarkdown(markdownOf(pickLanguageVariant(item, ctx.lang).children)));
        container.append(block);
      } else if (item.kind === "markdown" && item.text.trim()) {
        const block = h(doc, "div", { class: "md" });
        block.append(ctx.renderMarkdown(item.text));
        container.append(block);
      }
    }
    if (!model.questions.length) container.append(h(doc, "p", { class: "empty", text: t("quiz.empty") }));
    enhanceContent(container, ctx);
    return container;
  };

  let content = buildContent();
  function rebuild() {
    finishArmed = false;
    const fresh = buildContent();
    content.replaceWith(fresh);
    content = fresh;
    syncAll();
  }

  const extraMeta = [
    ["circle-help", t("quiz.questions"), String(total)],
    ["award", t("quiz.passingScore"), ctx.formatPercent(passingScore)],
    ["eye", t("quiz.feedback"), t(endFeedback ? "quiz.feedback.end" : "quiz.feedback.immediate")],
  ];
  const header = renderDocHeader(ctx, { entry, meta, extraMeta, aside: scorePanel, onReset: meta.reset === false ? null : reset });
  const element = h(doc, "article", { class: "doc doc--quiz", "aria-labelledby": "doc-title" }, header, content, finishBar, results);
  syncAll();

  return {
    element,
    focusAnchor(id) {
      const view = views.get(id);
      if (!view) return;
      if (typeof view.section.scrollIntoView === "function") view.section.scrollIntoView({ block: "start" });
      view.title.focus({ preventScroll: true });
    },
    destroy() {},
    /** Solo para pruebas. */
    _state: () => state,
  };
}
