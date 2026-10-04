// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * scripts/build-manifest.mjs — Genera documents.manifest.json.
 *
 *   node scripts/build-manifest.mjs
 *   node scripts/build-manifest.mjs --out _site/documents.manifest.json
 *   node scripts/build-manifest.mjs --repository owner/name   (solo para pruebas locales)
 *
 * - Recorre documents/steps/**\/*.steps.md y documents/tests/**\/*.test.md
 *   (según DOCUMENTATION_MODE en assets/js/config.js).
 * - Valida cada documento y los slugs; si algo falla, no escribe nada y
 *   termina con código 1.
 * - En GitHub Actions toma el repositorio de GITHUB_REPOSITORY, GITHUB_SHA y
 *   GITHUB_REF_NAME (y la URL de Pages de PAGES_BASE_URL). En local deja
 *   `repository: null`: el navegador lo deduce de la URL.
 * - JSON no admite comentarios: la autoría va en el campo `generator`.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { buildManifestEntry, buildManifest } from "../assets/js/documents.js";
import { analyzeAll, formatReport, hashSource, repositoryFromEnv, parseArgs, isMain, ROOT, DOCUMENTATION_MODE } from "./lib/docs.mjs";

export class ManifestError extends Error {
  constructor(message, report) {
    super(message);
    this.name = "ManifestError";
    this.report = report;
  }
}

/**
 * @param {{root?:string, mode?:string, env?:object, now?:Date}} options
 * @returns {Promise<object>} el manifiesto
 */
export async function generateManifest({ root = ROOT, mode = DOCUMENTATION_MODE, env = process.env, now = new Date() } = {}) {
  const analysis = await analyzeAll({ root, mode });
  if (analysis.results.some((r) => r.errors.length)) throw new ManifestError("Hay documentos inválidos; no se generó el manifiesto.", formatReport(analysis));
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8").catch(() => "{}"));
  const documents = analysis.results.map((result) => buildManifestEntry(result, { hash: hashSource(result.source), size: Buffer.byteLength(result.source, "utf8") }));
  return buildManifest({
    documents,
    repository: repositoryFromEnv(env),
    mode: analysis.mode,
    generatedAt: now.toISOString(),
    generator: { version: pkg.version || "0.0.0" },
  });
}

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const env = { ...process.env };
  if (typeof args.repository === "string") env.GITHUB_REPOSITORY = args.repository;
  try {
    const manifest = await generateManifest({ mode: args.mode || DOCUMENTATION_MODE, env });
    const out = path.resolve(ROOT, typeof args.out === "string" ? args.out : "documents.manifest.json");
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, JSON.stringify(manifest, null, 2) + "\n", "utf8");
    const repo = manifest.repository ? `${manifest.repository.owner}/${manifest.repository.name}` : "sin repositorio (se detecta en el navegador)";
    console.log(`✔ ${path.relative(ROOT, out)} · modo ${manifest.mode} · ${manifest.counts.steps} procedimiento(s), ${manifest.counts.tests} prueba(s) · ${repo}`);
  } catch (error) {
    if (error instanceof ManifestError) {
      console.error(error.report);
      console.error(`\n✖ ${error.message}`);
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  }
}
