// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * Pestaña «Validar»: dónde va cada archivo, saltos a línea, plantillas
 * válidas y el validador por consola (opcional, para agentes).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./helpers.mjs";
import { VALID_STEPS, makeSite } from "./fixtures.mjs";
import { destinationPath, lineOffsets, caretPosition } from "../assets/js/validator.js";
import { documentTemplate, TEMPLATE_CATEGORIES, today } from "../assets/js/templates.js";
import { validate, githubAnnotations } from "../scripts/validate-documents.mjs";

test("cada nombre de archivo va a su carpeta", () => {
  assert.equal(destinationPath("mi-guia.procedure.steps.md"), "documents/steps/mi-guia.procedure.steps.md");
  assert.equal(destinationPath("mi-lab.labguide.steps.md"), "documents/steps/mi-lab.labguide.steps.md");
  assert.equal(destinationPath("mi-prueba.test.md"), "documents/tests/mi-prueba.test.md");
  assert.equal(destinationPath("C:\\Users\\yo\\mi-prueba.test.md"), "documents/tests/mi-prueba.test.md", "solo cuenta el nombre");
  assert.equal(destinationPath("sin-tipo.steps.md"), "documents/steps/sin-tipo.steps.md");
  assert.equal(destinationPath("notas.md"), "documents/notas.md");
});

test("posiciones de línea y columna para saltar a un error", () => {
  const text = "uno\ndos\n\ncuatro";
  assert.deepEqual(lineOffsets(text, 1), { start: 0, end: 3 });
  assert.deepEqual(lineOffsets(text, 2), { start: 4, end: 7 });
  assert.deepEqual(lineOffsets(text, 4), { start: 9, end: 15 });
  assert.deepEqual(lineOffsets(text, 99), { start: 9, end: 15 }, "una línea fuera de rango va a la última");
  assert.deepEqual(caretPosition(text, 0), { line: 1, column: 1 });
  assert.deepEqual(caretPosition(text, 6), { line: 2, column: 3 });
  assert.deepEqual(caretPosition(text, 9), { line: 4, column: 1 });
});

test("las plantillas son documentos válidos en ambos idiomas; la de pruebas trae los siete tipos", () => {
  const date = new Date(2026, 9, 4);
  assert.equal(today(date), "2026-10-04");
  for (const lang of ["es", "en"]) {
    for (const category of TEMPLATE_CATEGORIES) {
      const template = documentTemplate(category, lang, date);
      const result = analyze(destinationPath(template.name), template.text);
      assert.deepEqual(result.errors, [], `${lang} ${category}`);
      assert.deepEqual(result.warnings, [], `${lang} ${category}`);
      assert.equal(result.category, category);
      assert.match(template.text, /updated: "2026-10-04"/);
    }
    const quiz = analyze("documents/tests/x.test.md", documentTemplate("practice-test", lang).text);
    assert.deepEqual(quiz.model.questions.map((q) => q.type), ["single", "multiple", "true-false", "text", "number", "order", "match"]);
  }
  assert.equal(documentTemplate("practice-test", "fr").name, "mi-prueba.test.md", "idioma desconocido: español");
});

test("validador por consola: informe y anotaciones de GitHub con archivo y línea", async () => {
  const broken = VALID_STEPS.replace(':::step id="b"', ':::step id="b" titulo="x"');
  const root = await makeSite({ "documents/steps/a.procedure.steps.md": broken, "documents/notas, 50%.md": "# x" });
  const report = await validate({ root });
  assert.equal(report.errors, 2);
  const lines = githubAnnotations(report);
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^::error file=documents\/notas%2C 50%25\.md,title=Documento con errores de formato::El archivo no sigue el formato/);
  assert.match(lines[1], /^::error file=documents\/steps\/a\.procedure\.steps\.md,line=\d+,title=Documento con errores de formato::Atributo desconocido en «:::step»: titulo/);
});
