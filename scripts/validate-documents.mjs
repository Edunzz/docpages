// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * scripts/validate-documents.mjs — Valida /documents con las reglas del sitio.
 *
 *   node scripts/validate-documents.mjs            informe legible
 *   node scripts/validate-documents.mjs --json     informe en JSON (para agentes/CI)
 *   node scripts/validate-documents.mjs --strict   los avisos también fallan
 *   node scripts/validate-documents.mjs --mode steps
 *
 * Sale con código 1 si hay errores (o avisos con --strict).
 */

import { analyzeAll, formatReport, parseArgs, isMain, DOCUMENTATION_MODE } from "./lib/docs.mjs";

export async function validate({ root, mode = DOCUMENTATION_MODE } = {}) {
  const analysis = await analyzeAll({ root, mode });
  const errors = analysis.results.reduce((n, r) => n + r.errors.length, 0);
  const warnings = analysis.results.reduce((n, r) => n + r.warnings.length, 0) + analysis.notes.filter((n) => n.level === "warning").length;
  return { ...analysis, errors, warnings };
}

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const report = await validate({ mode: args.mode || DOCUMENTATION_MODE });
  if (args.json) {
    const plain = {
      mode: report.mode,
      errors: report.errors,
      warnings: report.warnings,
      documents: report.results.map((r) => ({ path: r.path, type: r.type, slug: r.meta && r.meta.slug, errors: r.errors, warnings: r.warnings })),
      notes: report.notes,
    };
    console.log(JSON.stringify(plain, null, 2));
  } else {
    console.log(formatReport(report, { color: process.stdout.isTTY }));
  }
  if (!report.results.length) console.error("\nNo hay documentos que validar en /documents.");
  if (report.errors || (args.strict && report.warnings)) process.exitCode = 1;
}
