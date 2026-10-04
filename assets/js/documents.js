// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * documents.js — Reconocimiento, validación y metadatos de los documentos.
 *
 * Lo usan los scripts de Node (validate-documents, build-manifest) y el
 * navegador («Actualizar desde el repositorio»), así que las reglas son las
 * mismas en el CI y en vivo:
 *
 *   documents/steps/**\/{titulo}.steps.md  → type "steps"
 *       kind: "procedure"  (por defecto) → Procedimiento
 *       kind: "lab-guide"                → Guía de laboratorio
 *   documents/tests/**\/{titulo}.test.md   → type "test" → Prueba de práctica
 *
 * Cualquier otro Markdown dentro de /documents es un error: o sigue el
 * formato o no se publica nada.
 */

import {
  parseFrontMatter,
  splitFrontMatter,
  parseDirectives,
  groupLanguageBlocks,
  languageOf,
  localizedAttribute,
  markdownOf,
  expandTokens,
  isSafeUrl,
  plainText,
  stripTitlePlaceholder,
  isKnownAttribute,
  DIRECTIVE_RULES,
  ID_RE,
} from "./markdown.js";
import { validateAgainstSchema } from "./schema.js";
import { ICON_NAMES } from "./icons.js";
import { buildStepsModel } from "./steps.js";
import { buildQuizModel, QUESTION_TYPES, DEFAULT_PASSING_SCORE } from "./quiz.js";

export { ID_RE };

export const DOCUMENT_TYPES = Object.freeze({
  steps: Object.freeze({ type: "steps", suffix: ".steps.md", folder: "documents/steps", route: "steps", mode: "steps" }),
  test: Object.freeze({ type: "test", suffix: ".test.md", folder: "documents/tests", route: "tests", mode: "tests" }),
});

/** Categorías visibles, en orden de presentación, con el tipo de archivo que las contiene. */
export const CATEGORIES = Object.freeze(["procedure", "lab-guide", "practice-test"]);
const CATEGORY_TYPES = Object.freeze({ procedure: "steps", "lab-guide": "steps", "practice-test": "test" });
export const STEPS_KINDS = Object.freeze(["procedure", "lab-guide"]);
export const LEVELS = Object.freeze(["beginner", "intermediate", "advanced"]);

export const MODES = Object.freeze(["all", "steps", "tests"]);
export const FILE_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:steps|test)\.md$/;

/** Valores de ejemplo para validar URLs con tokens sin conocer el repositorio real. */
const SAMPLE_TOKENS = {
  repo_url: "https://github.com/owner/repository",
  repo: "owner/repository",
  owner: "owner",
  repo_name: "repository",
  pages_url: "https://owner.github.io/repository/",
  clone_url: "https://github.com/owner/repository.git",
  branch: "main",
};

export function normalizeMode(mode) {
  return MODES.includes(mode) ? mode : "all";
}

/** Tipos publicados en un modo: all → [steps, test]; steps → [steps]; tests → [test]. */
export function enabledTypes(mode) {
  const normalized = normalizeMode(mode);
  if (normalized === "steps") return ["steps"];
  if (normalized === "tests") return ["test"];
  return ["steps", "test"];
}

/** Categorías publicadas en un modo (en orden de presentación). */
export function enabledCategories(mode) {
  const types = enabledTypes(mode);
  return CATEGORIES.filter((category) => types.includes(CATEGORY_TYPES[category]));
}

export const categoryType = (category) => CATEGORY_TYPES[category] || null;

/** Categoría de una entrada del manifiesto o de un análisis. */
export function categoryOf(entry) {
  if (entry && CATEGORIES.includes(entry.category)) return entry.category;
  if (!entry || entry.type === "test") return "practice-test";
  return entry.kind === "lab-guide" ? "lab-guide" : "procedure";
}

/** `?type=` de la portada: acepta categorías y los tipos antiguos (steps/test). */
export function normalizeCategory(value) {
  const text = String(value || "").toLowerCase();
  if (CATEGORIES.includes(text)) return text;
  if (text === "steps") return "procedure";
  if (text === "test" || text === "tests") return "practice-test";
  return null;
}

const basename = (path) => String(path).split("/").pop();

export function typeFromPath(path) {
  const name = basename(path);
  if (name.endsWith(DOCUMENT_TYPES.steps.suffix)) return "steps";
  if (name.endsWith(DOCUMENT_TYPES.test.suffix)) return "test";
  return null;
}

/** ¿Es un documento publicable en este modo (sufijo + carpeta correctos)? */
export function isDocumentPath(path, mode = "all") {
  const type = typeFromPath(path);
  if (!type || !enabledTypes(mode).includes(type)) return false;
  return String(path).startsWith(`${DOCUMENT_TYPES[type].folder}/`);
}

/**
 * ¿Hay que revisar este archivo? Todo Markdown de /documents: los que no
 * siguen el formato se analizan igual para informar del error.
 */
export function isCandidatePath(path, mode = "all") {
  const value = String(path);
  if (!value.startsWith("documents/") || !/\.md$/i.test(value)) return false;
  const type = typeFromPath(value);
  return !type || enabledTypes(mode).includes(type);
}

export function typeFromRoute(route) {
  return Object.values(DOCUMENT_TYPES).find((def) => def.route === route)?.type || null;
}

export function routeFor(entry, anchor = "") {
  const base = `#/${DOCUMENT_TYPES[entry.type].route}/${encodeURIComponent(entry.slug)}`;
  return anchor ? `${base}/${encodeURIComponent(anchor)}` : base;
}

/** Orden determinista: procedimientos, guías de laboratorio, pruebas; después por ruta. */
export function sortDocuments(documents) {
  const rank = (doc) => CATEGORIES.indexOf(categoryOf(doc));
  return [...documents].sort((a, b) => rank(a) - rank(b) || String(a.path).localeCompare(String(b.path)));
}

/** Filtra un manifiesto por modo (por si se publicó con otro). */
export function filterByMode(documents, mode) {
  const types = enabledTypes(mode);
  return documents.filter((doc) => types.includes(doc.type));
}

// ─────────────────────────────── Validación ─────────────────────────────────

function lineOfKey(rawFrontMatter, key) {
  const lines = String(rawFrontMatter || "").split("\n");
  const index = lines.findIndex((line) => new RegExp(`^${key.replace(/[-]/g, "\\-")}\\s*:`).test(line));
  return index >= 0 ? index + 2 : 1;
}

function missingLanguages(value, languages) {
  if (!value || typeof value !== "object") return [];
  return languages.filter((lang) => !value[lang] && !value._);
}

const stripCode = (text) =>
  String(text)
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\1[ \t]*$|(?![\s\S]))/gm, "")
    .replace(/`[^`\n]*`/g, "");

const FORMAT_HELP = "Los documentos se llaman «{titulo}.steps.md» (procedimientos y guías de laboratorio) o «{titulo}.test.md» (pruebas de práctica).";

/**
 * Analiza un documento completo.
 * @param {{path:string, source:string, yaml:{load:Function}, schemas:{steps:object,test:object},
 *          renderer?:{countTasks:Function, listsOf:Function}, languages?:string[]}} input
 * @returns {{path, type, category, meta, body, bodyLine, nodes, model, errors:Array, warnings:Array}}
 */
export function analyzeDocument({ path, source, yaml, schemas, renderer = {}, languages = ["es", "en"] }) {
  const countTasks = renderer.countTasks || (() => 0);
  const result = { path, type: null, category: null, meta: null, body: "", bodyLine: 1, nodes: [], model: null, errors: [], warnings: [] };
  const error = (message, line = null) => result.errors.push({ line, message });
  const warn = (message, line = null) => result.warnings.push({ line, message });

  // 1. Nombre y ubicación.
  const type = typeFromPath(path);
  if (!type) {
    error(`El archivo no sigue el formato: ${FORMAT_HELP} Renómbralo o sácalo de /documents.`);
    return result;
  }
  result.type = type;
  const def = DOCUMENT_TYPES[type];
  if (!FILE_NAME_RE.test(basename(path))) {
    error(`Nombre de archivo inválido «${basename(path)}»: usa minúsculas, números y guiones (kebab-case) antes de «${def.suffix}».`);
  }
  if (!String(path).startsWith(`${def.folder}/`)) error(`Los archivos «${def.suffix}» deben estar dentro de /${def.folder}.`);

  // 2. Front matter.
  const front = parseFrontMatter(source, yaml);
  if (front.error) {
    error(front.error, 1);
    return result;
  }
  const raw = splitFrontMatter(source).raw;
  const meta = front.data;
  result.meta = meta;
  result.category = type === "test" ? "practice-test" : meta.kind === "lab-guide" ? "lab-guide" : "procedure";
  result.body = stripTitlePlaceholder(front.body);
  result.bodyLine = front.bodyLine + (front.body.split("\n").length - result.body.split("\n").length);

  if (meta.type !== type) {
    error(`El campo «type: ${JSON.stringify(meta.type ?? null)}» no coincide con el sufijo del archivo: «${def.suffix}» exige «type: "${type}"».`, lineOfKey(raw, "type"));
  }
  for (const issue of validateAgainstSchema(schemas[type], meta)) {
    if (issue.path === "/type") continue;
    const key = issue.path.split("/")[1] || "";
    error(`front matter ${issue.path || "/"}: ${issue.message}.`, key ? lineOfKey(raw, key) : 1);
  }
  for (const key of ["title", "description", "duration"]) {
    const missing = missingLanguages(meta[key], languages);
    if (missing.length) warn(`«${key}» no tiene traducción para: ${missing.join(", ")} (se mostrará otro idioma).`, lineOfKey(raw, key));
  }
  for (const key of ["objectives", "prerequisites"]) {
    const missing = new Set((Array.isArray(meta[key]) ? meta[key] : []).flatMap((item) => missingLanguages(item, languages)));
    if (missing.size) warn(`«${key}» tiene elementos sin traducción para: ${[...missing].join(", ")}.`, lineOfKey(raw, key));
  }
  (Array.isArray(meta.links) ? meta.links : []).forEach((link, i) => {
    const url = link && typeof link.url === "string" ? expandTokens(link.url, SAMPLE_TOKENS) : "";
    if (url && !isSafeUrl(url)) error(`links[${i}].url usa un esquema no permitido.`, lineOfKey(raw, "links"));
    if (link && typeof link.icon === "string" && !ICON_NAMES.includes(link.icon)) {
      warn(`links[${i}].icon «${link.icon}» no existe en el sprite; se usará «link». Disponibles: ${ICON_NAMES.join(", ")}.`, lineOfKey(raw, "links"));
    }
  });

  // 3. Cuerpo y directivas.
  const parsed = parseDirectives(result.body, { type, lineOffset: result.bodyLine });
  result.nodes = parsed.nodes;
  parsed.errors.forEach((e) => error(e.message, e.line));
  validateBody(result, { countTasks, languages, error, warn });

  // 4. Modelo según el tipo.
  if (type === "steps") {
    result.model = buildStepsModel(result.nodes, { countTasks });
    if (!result.model.steps.length) error("Un documento .steps.md necesita al menos un «:::step».");
  } else {
    if (typeof renderer.listsOf !== "function") throw new Error("analyzeDocument necesita renderer.listsOf para analizar pruebas de práctica.");
    const quiz = buildQuizModel(result.nodes, { listsOf: renderer.listsOf, languages });
    result.model = { questions: quiz.questions };
    quiz.errors.forEach((e) => error(e.message, e.line));
    if (!quiz.questions.length) error("Una prueba .test.md necesita al menos un «:::question».");
  }
  return result;
}

function allowedAttributes(name, languages) {
  const rule = DIRECTIVE_RULES[name];
  return [...rule.attributes, ...rule.localized.flatMap((key) => languages.map((lang) => `${key}.${lang}`))].join(", ");
}

function validateBody(result, { countTasks, languages, error, warn }) {
  const seen = new Map();
  const strayTasks =
    result.type === "steps"
      ? "Hay casillas «- [ ]» fuera de un «:::step»: no cuentan para el progreso. Muévelas dentro de un paso."
      : "Hay opciones «- [ ]» / «- [x]» fuera de un «:::question». Muévelas dentro de una pregunta.";

  const checkMarkdown = (text, line) => {
    const code = stripCode(text);
    if (/\]\(\s*<?\s*(?:javascript|vbscript|data|file):/i.test(code)) error("Enlace o imagen con un esquema no permitido (javascript:, data:, file:…).", line);
    if (/<\/?[A-Za-z][\w-]*(?:\s[^>]*)?>/.test(code)) warn("Hay HTML crudo: no se ejecuta y se mostrará como texto.", line);
    if (/\]\(\s*\/(?!\/)/.test(code)) warn("Enlace absoluto a la raíz («/…»): no funciona bajo /{repositorio}/. Usa una ruta relativa o {{pages_url}}.", line);
    if (/\{\{\s*title\s*\}\}/.test(text)) warn("«{{ title }}» solo se admite como primera línea («# {{ title }}»).", line);
  };

  const walk = (nodes, parent) => {
    for (const item of groupLanguageBlocks(nodes)) {
      if (item.kind === "markdown") {
        checkMarkdown(item.text, item.line);
        if (!parent && countTasks(item.text)) error(strayTasks, item.line);
        continue;
      }
      if (item.kind === "lang-group") {
        const langs = item.variants.map(languageOf);
        item.variants.forEach((variant, i) => {
          if (Object.keys(variant.attrs).length || variant.args.length > 1) error("«:::lang» solo lleva el idioma, p. ej. «:::lang es».", variant.line);
          if (!langs[i]) error("«:::lang» necesita un idioma, p. ej. «:::lang es».", variant.line);
          else if (!languages.includes(langs[i])) error(`Idioma no soportado «${langs[i]}» (usa: ${languages.join(", ")}).`, variant.line);
          if (langs.indexOf(langs[i]) !== i) warn(`El idioma «${langs[i]}» se repite en el mismo grupo; solo se mostrará el primero.`, variant.line);
          variant.children.filter((c) => c.kind === "markdown").forEach((c) => checkMarkdown(c.text, c.line));
        });
        const missing = languages.filter((lang) => !langs.includes(lang));
        if (missing.length && langs.some(Boolean)) warn(`Bloque de idioma sin variante para: ${missing.join(", ")} (se mostrará otra).`, item.line);
        const counts = item.variants.map((variant) => countTasks(markdownOf(variant.children)));
        if (new Set(counts).size > 1) error(`Las variantes de idioma deben tener el mismo número de casillas «- [ ]» (hay ${counts.join(" / ")}); el progreso y las respuestas no dependen del idioma.`, item.line);
        if (!parent && counts.some(Boolean)) error(strayTasks, item.line);
        continue;
      }

      const node = item;
      if (DIRECTIVE_RULES[node.name]) {
        if (node.args.length) error(`Atributo mal escrito en «:::${node.name}»: «${node.args.join(" ")}». Usa clave="valor", con comillas.`, node.line);
        const unknown = Object.keys(node.attrs).filter((key) => !isKnownAttribute(node.name, key));
        if (unknown.length) {
          const allowed = allowedAttributes(node.name, languages);
          error(`Atributo desconocido en «:::${node.name}»: ${unknown.join(", ")}${allowed ? ` (permitidos: ${allowed})` : " (esta directiva no lleva atributos)"}.`, node.line);
        }
      }

      if (node.name === "step" || node.name === "substep") {
        const id = node.attrs.id;
        if (!id) error(`«:::${node.name}» necesita un atributo id="…".`, node.line);
        else if (!ID_RE.test(id)) error(`id inválido «${id}»: usa letras, números, guiones o guiones bajos.`, node.line);
        else if (seen.has(id)) error(`id duplicado «${id}» (ya usado en la línea ${seen.get(id)}).`, node.line);
        else seen.set(id, node.line);

        const title = localizedAttribute(node.attrs, "title");
        if (!title) error(`«:::${node.name}» necesita un título: title.es="…" y title.en="…".`, node.line);
        else {
          const missing = missingLanguages(title, languages);
          if (missing.length) warn(`El título de «${id || node.name}» no tiene traducción para: ${missing.join(", ")}.`, node.line);
        }
      }
      walk(node.children, node);
    }
  };
  walk(result.nodes, null);
}

/** Slugs repetidos entre todos los documentos analizados. */
export function findDuplicateSlugs(results) {
  const bySlug = new Map();
  for (const result of results) {
    const slug = result.meta && result.meta.slug;
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(result.path);
  }
  return [...bySlug.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([slug, paths]) => ({ slug, paths, message: `slug duplicado «${slug}» en: ${paths.join(", ")}.` }));
}

// ─────────────────────────────── Manifiesto ─────────────────────────────────

/** Entrada de manifiesto a partir de un análisis válido. */
export function buildManifestEntry(result, { hash = "", size = 0, rawUrl = "" } = {}) {
  const meta = result.meta;
  const entry = {
    type: result.type,
    category: result.category,
    slug: meta.slug,
    path: result.path,
    title: meta.title,
    description: meta.description,
    version: String(meta.version),
    author: meta.author || "",
    updated: meta.updated,
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    reset: meta.reset !== false,
  };
  if (meta.duration) entry.duration = meta.duration;
  if (meta.level) entry.level = meta.level;
  if (result.type === "steps") {
    entry.kind = result.category;
    entry.stepCount = result.model.steps.length;
    entry.taskCount = result.model.leaves.length;
  } else {
    const questions = result.model.questions;
    entry.questionCount = questions.length;
    entry.points = questions.reduce((sum, q) => sum + q.points, 0);
    entry.passingScore = Number.isInteger(meta.passingScore) ? meta.passingScore : DEFAULT_PASSING_SCORE;
    entry.feedback = meta.feedback === "end" ? "end" : "immediate";
    entry.questionTypes = QUESTION_TYPES.filter((type) => questions.some((q) => q.type === type));
  }
  entry.hash = hash;
  entry.size = size;
  if (rawUrl) entry.rawUrl = rawUrl;
  entry.searchText = plainText(result.body);
  return entry;
}

/**
 * Entrada para un documento con errores (solo en la lectura en vivo): la
 * portada la muestra en «Documentos con errores de formato».
 */
export function invalidEntry(result, { rawUrl = "" } = {}) {
  const name = basename(result.path);
  const entry = {
    type: result.type || typeFromPath(result.path) || "steps",
    category: result.category || categoryOf({ type: result.type || typeFromPath(result.path) }),
    slug: (result.meta && typeof result.meta.slug === "string" && result.meta.slug) || name.replace(/(\.(steps|test))?\.md$/i, ""),
    path: result.path,
    title: name,
    invalid: true,
    errors: result.errors.map(({ line, message }) => ({ line, message })),
  };
  if (rawUrl) entry.rawUrl = rawUrl;
  return entry;
}

/**
 * @param {{documents:Array, repository?:object|null, mode?:string, generatedAt?:string, generator?:object}} input
 */
export function buildManifest({ documents, repository = null, mode = "all", generatedAt = new Date().toISOString(), generator = {} }) {
  const sorted = sortDocuments(documents);
  const count = (category) => sorted.filter((d) => categoryOf(d) === category).length;
  return {
    schemaVersion: 2,
    generator: {
      name: "docpages",
      author: "Jose Eduardo Romero Jimenez",
      authorUrl: "https://github.com/Edunzz",
      ...generator,
    },
    generatedAt,
    source: "deployment",
    mode: normalizeMode(mode),
    repository,
    counts: { procedures: count("procedure"), labGuides: count("lab-guide"), practiceTests: count("practice-test") },
    documents: sorted,
  };
}
