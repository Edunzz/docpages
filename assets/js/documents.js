// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * documents.js — Reconocimiento, validación y metadatos de los documentos.
 *
 * Lo usan los scripts de Node (validate-documents, build-manifest) y el
 * navegador («Actualizar desde el repositorio»), así que las reglas son las
 * mismas en el CI y en vivo:
 *
 *   documents/steps/**\/{titulo}.steps.md  → type: "steps"
 *   documents/tests/**\/{titulo}.test.md   → type: "test"
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
  isSafeRelativePath,
  resolveRelativePath,
  dirname,
  plainText,
  stripTitlePlaceholder,
} from "./markdown.js";
import { validateAgainstSchema } from "./schema.js";
import { ICON_NAMES } from "./icons.js";
import { buildStepsModel } from "./steps.js";
import { buildTestModel, summarizeCases, deriveOverallStatus, TEST_STATUSES, SUMMARY_KEYS } from "./tests.js";

export const DOCUMENT_TYPES = Object.freeze({
  steps: Object.freeze({ type: "steps", suffix: ".steps.md", folder: "documents/steps", route: "steps", mode: "steps" }),
  test: Object.freeze({ type: "test", suffix: ".test.md", folder: "documents/tests", route: "tests", mode: "tests" }),
});

export const MODES = Object.freeze(["all", "steps", "tests"]);
export const FILE_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.(?:steps|test)\.md$/;
export const ID_RE = /^[A-Za-z0-9][\w-]*$/;
export const IMAGE_EXTENSIONS = Object.freeze(["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"]);
export const EVIDENCE_TYPES = Object.freeze(["link", "image"]);

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

export function typeFromRoute(route) {
  return Object.values(DOCUMENT_TYPES).find((def) => def.route === route)?.type || null;
}

export function routeFor(entry, anchor = "") {
  const base = `#/${DOCUMENT_TYPES[entry.type].route}/${encodeURIComponent(entry.slug)}`;
  return anchor ? `${base}/${encodeURIComponent(anchor)}` : base;
}

/** Orden determinista: procedimientos primero y después por ruta. */
export function sortDocuments(documents) {
  const order = { steps: 0, test: 1 };
  return [...documents].sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || String(a.path).localeCompare(String(b.path)));
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

/**
 * Analiza un documento completo.
 * @param {{path:string, source:string, yaml:{load:Function}, schemas:{steps:object,test:object},
 *          countTasks?:(text:string)=>number, languages?:string[]}} input
 * @returns {{path, type, meta, body, bodyLine, nodes, model, errors:Array, warnings:Array}}
 */
export function analyzeDocument({ path, source, yaml, schemas, countTasks = () => 0, languages = ["es", "en"] }) {
  const result = { path, type: null, meta: null, body: "", bodyLine: 1, nodes: [], model: null, errors: [], warnings: [] };
  const error = (message, line = null) => result.errors.push({ line, message });
  const warn = (message, line = null) => result.warnings.push({ line, message });

  // 1. Nombre y ubicación.
  const type = typeFromPath(path);
  if (!type) {
    error("El nombre del archivo debe terminar en «.steps.md» o «.test.md».");
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
  for (const key of ["title", "description", "environment"]) {
    const missing = missingLanguages(meta[key], languages);
    if (missing.length) warn(`«${key}» no tiene traducción para: ${missing.join(", ")} (se mostrará otro idioma).`, lineOfKey(raw, key));
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
    result.model = buildTestModel(result.nodes);
    if (!result.model.cases.length) error("Un documento .test.md necesita al menos un «:::testcase».");
    const summary = summarizeCases(result.model.cases);
    const derived = deriveOverallStatus(summary);
    if (meta.status && TEST_STATUSES.includes(meta.status) && meta.status !== derived) {
      warn(`El estado global declarado («${meta.status}») no coincide con el calculado a partir de los casos («${derived}»).`, lineOfKey(raw, "status"));
    }
    if (meta.summary && typeof meta.summary === "object") {
      const mismatched = SUMMARY_KEYS.filter((key) => meta.summary[key] != null && meta.summary[key] !== summary[key]);
      if (mismatched.length) warn(`summary no coincide con los casos en: ${mismatched.map((k) => `${k} (${meta.summary[k]} ≠ ${summary[k]})`).join(", ")}.`, lineOfKey(raw, "summary"));
    }
  }
  return result;
}

function validateBody(result, { countTasks, languages, error, warn }) {
  const seen = new Map();
  const docDir = dirname(result.path);

  const checkMarkdown = (text, line) => {
    const code = stripCode(text);
    if (/\]\(\s*<?\s*(?:javascript|vbscript|data|file):/i.test(code)) error("Enlace o imagen con un esquema no permitido (javascript:, data:, file:…).", line);
    if (/<\/?[A-Za-z][\w-]*(?:\s[^>]*)?>/.test(code)) warn("Hay HTML crudo: no se ejecuta y se mostrará como texto.", line);
    if (/\]\(\s*\/(?!\/)/.test(code)) warn("Enlace absoluto a la raíz («/…»): no funciona bajo /{repositorio}/. Usa una ruta relativa o {{pages_url}}.", line);
    if (/\{\{\s*title\s*\}\}/.test(text)) warn("«{{ title }}» solo se admite como primera línea («# {{ title }}»).", line);
  };

  const walk = (nodes) => {
    for (const item of groupLanguageBlocks(nodes)) {
      if (item.kind === "markdown") {
        checkMarkdown(item.text, item.line);
        continue;
      }
      if (item.kind === "lang-group") {
        const langs = item.variants.map(languageOf);
        item.variants.forEach((variant, i) => {
          if (!langs[i]) error("«:::lang» necesita un idioma, p. ej. «:::lang es».", variant.line);
          else if (!languages.includes(langs[i])) error(`Idioma no soportado «${langs[i]}» (usa: ${languages.join(", ")}).`, variant.line);
          if (langs.indexOf(langs[i]) !== i) warn(`El idioma «${langs[i]}» se repite en el mismo grupo; solo se mostrará el primero.`, variant.line);
          variant.children.filter((c) => c.kind === "markdown").forEach((c) => checkMarkdown(c.text, c.line));
        });
        const missing = languages.filter((lang) => !langs.includes(lang));
        if (missing.length && langs.some(Boolean)) warn(`Bloque de idioma sin variante para: ${missing.join(", ")} (se mostrará otra).`, item.line);
        const counts = item.variants.map((variant) => countTasks(markdownOf(variant.children)));
        if (new Set(counts).size > 1) error(`Las variantes de idioma deben tener el mismo número de casillas «- [ ]» (hay ${counts.join(" / ")}); el progreso no depende del idioma.`, item.line);
        continue;
      }

      const node = item;
      if (node.args.length && node.name !== "lang") warn(`Atributo sin comillas ignorado en «:::${node.name}»: ${node.args.join(" ")} (usa clave="valor").`, node.line);

      if (["step", "substep", "testcase"].includes(node.name)) {
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

      if (node.name === "testcase") {
        const status = String(node.attrs.status || "").toLowerCase();
        if (!status) warn(`El caso «${node.attrs.id || "?"}» no declara status; se mostrará como «not-run».`, node.line);
        else if (!TEST_STATUSES.includes(status)) error(`status inválido «${node.attrs.status}» (usa: ${TEST_STATUSES.join(", ")}).`, node.line);
      }

      if (node.name === "evidence") validateEvidence(node, { docDir, error, warn });
      walk(node.name === "evidence" ? [] : node.children);
    }
  };
  walk(result.nodes);
}

function validateEvidence(node, { docDir, error, warn }) {
  const type = String(node.attrs.type || "").toLowerCase();
  const lines = markdownOf(node.children)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const target = lines[0] || "";
  if (!EVIDENCE_TYPES.includes(type)) error(`«:::evidence» necesita type="link" o type="image" (recibido «${node.attrs.type || ""}»).`, node.line);
  if (!localizedAttribute(node.attrs, "label")) warn("La evidencia no tiene etiqueta (label.es / label.en).", node.line);
  if (lines.length > 1) warn("La evidencia solo usa la primera línea no vacía; el resto se ignora.", node.line);
  if (!target) {
    error("La evidencia está vacía: escribe la URL o la ruta en la primera línea.", node.line);
    return;
  }
  const expanded = expandTokens(target, SAMPLE_TOKENS);
  if (type === "link" && !(isSafeUrl(expanded, { schemes: ["http", "https"] }) && (/^https?:\/\//i.test(expanded) || isSafeRelativePath(expanded)))) {
    error(`Evidencia de enlace no permitida «${target}»: usa http(s) o una ruta relativa.`, node.line);
  }
  if (type === "image") {
    const ext = expanded.split(/[?#]/)[0].split(".").pop().toLowerCase();
    if (!isSafeRelativePath(expanded) || resolveRelativePath(docDir, expanded) == null) {
      error(`La imagen de evidencia debe ser una ruta relativa dentro del sitio (recibido «${target}»).`, node.line);
    } else if (!IMAGE_EXTENSIONS.includes(ext)) {
      error(`Extensión de imagen no permitida «.${ext}» (usa: ${IMAGE_EXTENSIONS.join(", ")}).`, node.line);
    }
  }
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
  if (result.type === "steps") {
    entry.stepCount = result.model.steps.length;
    entry.taskCount = result.model.leaves.length;
  } else {
    const summary = summarizeCases(result.model.cases);
    entry.status = meta.status || deriveOverallStatus(summary);
    entry.executedAt = meta.executedAt || "";
    entry.environment = meta.environment || "";
    entry.summary = summary;
  }
  entry.hash = hash;
  entry.size = size;
  if (rawUrl) entry.rawUrl = rawUrl;
  entry.searchText = plainText(result.body);
  return entry;
}

/**
 * @param {{documents:Array, repository?:object|null, mode?:string, generatedAt?:string, generator?:object}} input
 */
export function buildManifest({ documents, repository = null, mode = "all", generatedAt = new Date().toISOString(), generator = {} }) {
  const sorted = sortDocuments(documents);
  return {
    schemaVersion: 1,
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
    counts: {
      steps: sorted.filter((d) => d.type === "steps").length,
      tests: sorted.filter((d) => d.type === "test").length,
    },
    documents: sorted,
  };
}
