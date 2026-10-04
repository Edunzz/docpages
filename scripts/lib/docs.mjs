// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * scripts/lib/docs.mjs — Utilidades compartidas por los scripts de Node.
 *
 * Reutiliza exactamente los módulos del navegador (assets/js/*) para que la
 * validación del CI y la del sitio en vivo sean la misma.
 */

import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import markdownit from "markdown-it";
import * as yaml from "js-yaml";
import { createMarkdownRenderer } from "../../assets/js/markdown.js";
import { analyzeDocument, findDuplicateSlugs, enabledTypes, typeFromPath, normalizeMode } from "../../assets/js/documents.js";
import { CONFIG, DOCUMENTATION_MODE } from "../../assets/js/config.js";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const toPosix = (value) => value.split(path.sep).join("/");
export { yaml, DOCUMENTATION_MODE, CONFIG };

/** Lista recursiva de archivos (rutas absolutas). Un directorio inexistente da []. */
export async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

export async function loadSchemas(root = ROOT) {
  const read = async (name) => JSON.parse(await readFile(path.join(root, "schemas", name), "utf8"));
  return { steps: await read("steps.schema.json"), test: await read("test.schema.json") };
}

export function createRenderer() {
  return createMarkdownRenderer({ markdownit });
}

export function hashSource(text) {
  return "sha256-" + createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Analiza todo /documents según el modo.
 * @returns {Promise<{mode:string, results:Array, notes:Array<{path:string, level:'info'|'warning', message:string}>}>}
 */
export async function analyzeAll({ root = ROOT, mode = DOCUMENTATION_MODE } = {}) {
  const activeMode = normalizeMode(mode);
  const schemas = await loadSchemas(root);
  const renderer = createRenderer();
  const types = enabledTypes(activeMode);
  const files = (await walk(path.join(root, "documents"))).map((abs) => toPosix(path.relative(root, abs))).sort();
  const results = [];
  const notes = [];

  for (const rel of files) {
    if (!rel.toLowerCase().endsWith(".md")) continue;
    const type = typeFromPath(rel);
    if (!type) {
      notes.push({ path: rel, level: "warning", message: "Markdown sin sufijo «.steps.md» ni «.test.md»: no se publica." });
      continue;
    }
    if (!types.includes(type)) {
      notes.push({ path: rel, level: "info", message: `Omitido: el modo «${activeMode}» no publica documentos de tipo «${type}».` });
      continue;
    }
    const source = await readFile(path.join(root, rel), "utf8");
    const result = analyzeDocument({ path: rel, source, yaml, schemas, countTasks: renderer.countTasks, languages: CONFIG.languages });
    result.source = source;
    results.push(result);
  }

  for (const duplicate of findDuplicateSlugs(results)) {
    for (const file of duplicate.paths) results.find((r) => r.path === file).errors.push({ line: null, message: duplicate.message });
  }
  return { mode: activeMode, results, notes };
}

const paint = (enabled) => (code, text) => (enabled ? `\u001b[${code}m${text}\u001b[0m` : text);

/** Informe legible para la terminal. */
export function formatReport({ mode, results, notes }, { color = false } = {}) {
  const c = paint(color);
  const lines = [`Modo de documentación: ${mode}`];
  for (const result of results) {
    const mark = result.errors.length ? c(31, "✖") : result.warnings.length ? c(33, "⚠") : c(32, "✔");
    lines.push(`${mark} ${result.path}`);
    for (const e of result.errors) lines.push(`    ${c(31, "error")}   ${e.line ? `L${e.line}: ` : ""}${e.message}`);
    for (const w of result.warnings) lines.push(`    ${c(33, "aviso")}   ${w.line ? `L${w.line}: ` : ""}${w.message}`);
  }
  for (const note of notes) lines.push(`${note.level === "warning" ? c(33, "⚠") : c(36, "ℹ")} ${note.path}: ${note.message}`);
  const errors = results.reduce((n, r) => n + r.errors.length, 0);
  const warnings = results.reduce((n, r) => n + r.warnings.length, 0) + notes.filter((n) => n.level === "warning").length;
  lines.push("", `${results.length} documento(s) · ${errors} error(es) · ${warnings} aviso(s)`);
  return lines.join("\n");
}

/** Datos del repositorio desde las variables de GitHub Actions. */
export function repositoryFromEnv(env = process.env) {
  const full = String(env.GITHUB_REPOSITORY || "");
  if (!/^[^/\s]+\/[^/\s]+$/.test(full)) return null;
  const [owner, name] = full.split("/");
  const server = String(env.GITHUB_SERVER_URL || "https://github.com").replace(/\/+$/, "");
  const pagesUrl = env.PAGES_BASE_URL ? String(env.PAGES_BASE_URL).replace(/\/?$/, "/") : "";
  return { owner, name, url: `${server}/${owner}/${name}`, branch: env.GITHUB_REF_NAME || "", sha: env.GITHUB_SHA || "", pagesUrl };
}

/** `--clave valor` y `--bandera` → objeto. */
export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next != null && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

/** ¿Se está ejecutando este módulo directamente (no importado por una prueba)? */
export function isMain(importMetaUrl) {
  return Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(importMetaUrl);
}
