// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * scripts/validate-documents.mjs — Valida /documents con las reglas del sitio.
 *
 * Opcional: las personas validan en la pestaña «Validar» del sitio. Este
 * comando es para agentes de IA y automatizaciones; solo necesita Node (no
 * hace falta npm install):
 *
 *   node scripts/validate-documents.mjs            informe legible
 *   node scripts/validate-documents.mjs --json     informe en JSON (para agentes/CI)
 *   node scripts/validate-documents.mjs --strict   los avisos también fallan
 *   node scripts/validate-documents.mjs --mode steps
 *
 * Sale con código 1 si hay errores (o avisos con --strict). En GitHub Actions
 * además escribe cada error como anotación (::error file=…,line=…::), así
 * GitHub lo marca sobre la línea del archivo en el commit o el pull request.
 */

import { analyzeAll, formatReport, parseArgs, isMain, DOCUMENTATION_MODE } from "./lib/docs.mjs";

export async function validate({ root, mode = DOCUMENTATION_MODE } = {}) {
  const analysis = await analyzeAll({ root, mode });
  const errors = analysis.results.reduce((n, r) => n + r.errors.length, 0);
  const warnings = analysis.results.reduce((n, r) => n + r.warnings.length, 0) + analysis.notes.filter((n) => n.level === "warning").length;
  return { ...analysis, errors, warnings };
}

const escapeData = (value) => String(value).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
const escapeProperty = (value) => escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");

/** Comandos de anotación de GitHub Actions para errores y avisos. */
export function githubAnnotations({ results }) {
  const lines = [];
  for (const result of results) {
    const emit = (level, issue) => {
      const props = [`file=${escapeProperty(result.path)}`];
      if (issue.line) props.push(`line=${issue.line}`);
      props.push(`title=${escapeProperty(level === "error" ? "Documento con errores de formato" : "Aviso del documento")}`);
      lines.push(`::${level} ${props.join(",")}::${escapeData(issue.message)}`);
    };
    result.errors.forEach((issue) => emit("error", issue));
    result.warnings.forEach((issue) => emit("warning", issue));
  }
  return lines;
}

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const report = await validate({ mode: args.mode || DOCUMENTATION_MODE });
  if (args.json) {
    const plain = {
      mode: report.mode,
      errors: report.errors,
      warnings: report.warnings,
      documents: report.results.map((r) => ({ path: r.path, type: r.type, category: r.category, slug: r.meta && r.meta.slug, errors: r.errors, warnings: r.warnings })),
      notes: report.notes,
    };
    console.log(JSON.stringify(plain, null, 2));
  } else {
    console.log(formatReport(report, { color: process.stdout.isTTY }));
    if (process.env.GITHUB_ACTIONS === "true") for (const line of githubAnnotations(report)) console.log(line);
  }
  if (!report.results.length) console.error("\nNo hay documentos que validar en /documents.");
  if (report.errors || (args.strict && report.warnings)) process.exitCode = 1;
}
