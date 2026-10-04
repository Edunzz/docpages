// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./helpers.mjs";
import { VALID_STEPS, VALID_TEST, withFrontMatter, makeSite, quizWith } from "./fixtures.mjs";
import { findDuplicateSlugs, buildManifestEntry, categoryOf, normalizeCategory, invalidEntry } from "../assets/js/documents.js";
import { analyzeAll } from "../scripts/lib/docs.mjs";

const errorsOf = (result) => result.errors.map((e) => e.message).join(" | ");
const warningsOf = (result) => result.warnings.map((e) => e.message).join(" | ");

test(".steps.md válido: metadatos, pasos, subpasos y modelo de progreso", () => {
  const result = analyze("documents/steps/pasos-prueba.steps.md", VALID_STEPS);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.type, "steps");
  assert.equal(result.category, "procedure", "sin kind es un procedimiento");
  assert.equal(result.meta.slug, "pasos-prueba");
  assert.deepEqual(result.model.steps.map((s) => s.id), ["a", "b"]);
  assert.deepEqual(result.model.leaves, ["a#0", "a#1", "a1#0", "a2", "b"]);
  assert.doesNotMatch(result.body, /\{\{ title \}\}/, "el placeholder del título se consume");
  const entry = buildManifestEntry(result, { hash: "sha256-x", size: 10 });
  assert.equal(entry.category, "procedure");
  assert.equal(entry.kind, "procedure");
  assert.equal(entry.stepCount, 2);
  assert.equal(entry.taskCount, 5);
  assert.equal(entry.reset, true);
});

test("guía de laboratorio: kind, duración, nivel, objetivos y requisitos", () => {
  const lab = [
    ["kind", '"lab-guide"'],
    ["duration", '{ es: "20 minutos", en: "20 minutes" }'],
    ["level", '"intermediate"'],
    ["objectives", '[{ es: "Aprender", en: "Learn" }]'],
    ["prerequisites", '["Node.js 22"]'],
  ].reduce((source, [key, value]) => withFrontMatter(source, key, value), VALID_STEPS);
  const result = analyze("documents/steps/lab.steps.md", lab);
  assert.deepEqual(result.errors, []);
  assert.equal(result.category, "lab-guide");
  const entry = buildManifestEntry(result, {});
  assert.equal(entry.category, "lab-guide");
  assert.deepEqual(entry.duration, { es: "20 minutos", en: "20 minutes" });
  assert.equal(entry.level, "intermediate");
  assert.equal(categoryOf(entry), "lab-guide");

  assert.match(errorsOf(analyze("documents/steps/x.steps.md", withFrontMatter(VALID_STEPS, "kind", '"lab"'))), /\/kind: debe ser uno de: "procedure", "lab-guide"/);
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", withFrontMatter(VALID_STEPS, "level", '"experto"'))), /\/level: debe ser uno de/);
  assert.match(warningsOf(analyze("documents/steps/x.steps.md", withFrontMatter(VALID_STEPS, "objectives", '[{ es: "Solo español" }]'))), /«objectives» tiene elementos sin traducción para: en/);
  assert.match(errorsOf(analyze("documents/tests/x.test.md", withFrontMatter(VALID_TEST, "kind", '"lab-guide"'))), /\/kind: propiedad desconocida/, "kind solo existe en .steps.md");
});

test(".test.md válido: preguntas y entrada de manifiesto", () => {
  const result = analyze("documents/tests/prueba-x.test.md", VALID_TEST);
  assert.deepEqual(result.errors, []);
  assert.equal(result.category, "practice-test");
  const entry = buildManifestEntry(result, {});
  assert.equal(entry.questionCount, 7);
  assert.equal(entry.points, 8);
  assert.equal(entry.passingScore, 60);
  assert.equal(entry.feedback, "immediate");
  assert.deepEqual(entry.questionTypes, ["single", "multiple", "true-false", "text", "number", "order", "match"]);
  assert.equal(entry.status, undefined, "las pruebas de práctica ya no tienen estado de ejecución");
});

test("categorías: orden, nombres antiguos y entrada inválida", () => {
  assert.equal(normalizeCategory("lab-guide"), "lab-guide");
  assert.equal(normalizeCategory("steps"), "procedure");
  assert.equal(normalizeCategory("tests"), "practice-test");
  assert.equal(normalizeCategory("otra"), null);
  const broken = analyze("documents/tests/roto.test.md", quizWith(':::question type="single"\n¿P?\n- [ ] a\n- [ ] b\n:::'));
  const entry = invalidEntry(broken, { rawUrl: "https://raw.example/roto.test.md" });
  assert.equal(entry.invalid, true);
  assert.equal(entry.slug, "prueba-y");
  assert.equal(entry.category, "practice-test");
  assert.equal(entry.errors[0].line, 10);
  assert.equal(invalidEntry({ path: "documents/steps/notas.md", errors: [{ line: null, message: "x" }] }).slug, "notas");
});

test("rechaza sufijo y tipo incompatibles", () => {
  const asTest = analyze("documents/steps/pasos-prueba.steps.md", withFrontMatter(VALID_STEPS, "type", '"test"'));
  assert.match(errorsOf(asTest), /no coincide con el sufijo del archivo: «\.steps\.md» exige «type: "steps"»/);
  const asSteps = analyze("documents/tests/prueba-x.test.md", withFrontMatter(VALID_TEST, "type", '"steps"'));
  assert.match(errorsOf(asSteps), /«\.test\.md» exige «type: "test"»/);
});

test("un Markdown que no sigue el formato es un error, no se ignora", async () => {
  assert.match(errorsOf(analyze("documents/tests/pasos.steps.md", VALID_STEPS)), /deben estar dentro de \/documents\/steps/);
  assert.match(errorsOf(analyze("documents/steps/Mis Pasos.steps.md", VALID_STEPS)), /Nombre de archivo inválido/);
  assert.match(errorsOf(analyze("documents/steps/notas.md", VALID_STEPS)), /El archivo no sigue el formato: .*\{titulo\}\.steps\.md.*\{titulo\}\.test\.md/);
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", "# Solo un título\n\n- [ ] tarea\n")), /front matter YAML/);

  const root = await makeSite({ "documents/steps/a.steps.md": VALID_STEPS, "documents/notas.md": "# Notas sueltas\n", "documents/tests/img/foto.png": "png" });
  const { results } = await analyzeAll({ root, mode: "all" });
  assert.deepEqual(results.map((r) => [r.path, r.errors.length > 0]), [["documents/notas.md", true], ["documents/steps/a.steps.md", false]], "los archivos que no son Markdown se ignoran");
});

test("valida el front matter con el esquema: obligatorios, formatos y propiedades desconocidas", () => {
  let source = VALID_STEPS.replace(/^slug:.*\n/m, "");
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", source)), /\/slug: es obligatorio/);
  source = withFrontMatter(VALID_STEPS, "updated", '"03/10/2026"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", source)), /AAAA-MM-DD/);
  source = withFrontMatter(VALID_STEPS, "version", '"1.0"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", source)), /versión semántica/);
  source = withFrontMatter(VALID_STEPS, "slug", '"Con Espacios"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", source)), /kebab-case/);
  source = withFrontMatter(VALID_STEPS, "colour", '"red"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", source)), /\/colour: propiedad desconocida/);
  source = withFrontMatter(VALID_STEPS, "reset", '"sí"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", source)), /\/reset: debe ser booleano/);
  source = withFrontMatter(VALID_TEST, "passingScore", "120");
  assert.match(errorsOf(analyze("documents/tests/x.test.md", source)), /\/passingScore: debe ser ≤ 100/);
  source = withFrontMatter(VALID_TEST, "feedback", '"later"');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", source)), /\/feedback: debe ser uno de: "immediate", "end"/);
  source = withFrontMatter(VALID_TEST, "status", '"passed"');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", source)), /\/status: propiedad desconocida/);
});

test("detecta ids duplicados y títulos ausentes en los pasos", () => {
  const dupe = VALID_STEPS.replace(':::step id="b"', ':::step id="a"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", dupe)), /id duplicado «a»/);
  const noTitle = VALID_STEPS.replace(':::step id="b" title.es="Paso B" title.en="Step B"', ':::step id="b"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", noTitle)), /necesita un título/);
  const noSteps = VALID_STEPS.slice(0, VALID_STEPS.indexOf(":::step"));
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", noSteps)), /al menos un «:::step»/);
});

test("atributos estrictos: desconocidos, sin comillas o en :::lang son error", () => {
  const typo = VALID_STEPS.replace(':::step id="b" title.es="Paso B"', ':::step id="b" titulo="x" title.es="Paso B"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", typo)), /Atributo desconocido en «:::step»: titulo \(permitidos: id, title, title\.es, title\.en\)/);
  const unquoted = VALID_STEPS.replace(':::step id="b"', ":::step id=b");
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", unquoted)), /Atributo mal escrito en «:::step»: «id=b»/);
  const question = quizWith(':::question type="text" answr="a"\n¿P?\n:::');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", question)), /Atributo desconocido en «:::question»: answr/);
  const explanation = quizWith(':::question type="text" answer="a"\n¿P?\n:::explanation id="e"\nX\n:::\n:::');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", explanation)), /«:::explanation»: id \(esta directiva no lleva atributos\)/);
  const lang = VALID_STEPS.replace("Solo texto.", ':::lang es extra\nHola\n:::');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", lang)), /«:::lang» solo lleva el idioma/);
});

test("casillas u opciones fuera de su bloque son error", () => {
  const strayTask = VALID_STEPS.replace("Introducción.", "Introducción.\n\n- [ ] tarea suelta");
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", strayTask)), /fuera de un «:::step»/);
  const strayOption = VALID_TEST.replace("Texto.", "Texto.\n\n- [x] opción suelta\n- [ ] otra");
  assert.match(errorsOf(analyze("documents/tests/x.test.md", strayOption)), /fuera de un «:::question»/);
  const strayLang = VALID_STEPS.replace("Introducción.", ":::lang es\n- [ ] tarea\n:::\n:::lang en\n- [ ] task\n:::");
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", strayLang)), /fuera de un «:::step»/);
});

test("directivas de un tipo no se admiten en el otro", () => {
  const questionInSteps = VALID_STEPS.replace("Solo texto.", ':::question type="text" answer="a"\n¿P?\n:::');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", questionInSteps)), /«:::question» no se admite en documentos de tipo «steps»/);
  const stepInTest = VALID_TEST.replace("Texto.", ':::step id="s" title="S"\nx\n:::');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", stepInTest)), /«:::step» no se admite en documentos de tipo «test»/);
  const oldFormat = quizWith(':::testcase id="c1" title="Caso" status="passed"\nTexto\n:::');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", oldFormat)), /Directiva desconocida «:::testcase»/);
});

test("detecta slugs duplicados entre documentos", async () => {
  const a = analyze("documents/steps/a.steps.md", VALID_STEPS);
  const b = analyze("documents/steps/b.steps.md", VALID_STEPS);
  assert.deepEqual(findDuplicateSlugs([a, b]).map((d) => d.paths), [["documents/steps/a.steps.md", "documents/steps/b.steps.md"]]);

  const root = await makeSite({ "documents/steps/a.steps.md": VALID_STEPS, "documents/steps/b.steps.md": VALID_STEPS });
  const { results } = await analyzeAll({ root, mode: "all" });
  assert.ok(results.every((r) => /slug duplicado «pasos-prueba»/.test(errorsOf(r))));
});

test("contenido inseguro: enlaces javascript: son error y el HTML crudo es aviso", () => {
  const js = VALID_STEPS.replace("Solo texto.", "[clic](javascript:alert(1))");
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", js)), /esquema no permitido/);
  const html = VALID_STEPS.replace("Solo texto.", '<img src=x onerror="alert(1)">');
  assert.match(warningsOf(analyze("documents/steps/x.steps.md", html)), /HTML crudo/);
  const link = withFrontMatter(VALID_TEST, "links", '[{ label: "x", url: "javascript:alert(1)" }]');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", link)), /\/links\/0\/url: formato inválido/);
  const option = quizWith(':::question type="single"\n¿P?\n- [x] [a](javascript:alert(1))\n- [ ] b\n:::');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", option)), /esquema no permitido/, "también dentro de las opciones");
});

test("idiomas: variantes :::lang con distinto número de casillas son error; traducción ausente es aviso", () => {
  const mismatch = VALID_STEPS.replace("Solo texto.", ":::lang es\n- [ ] uno\n- [ ] dos\n:::\n:::lang en\n- [ ] one\n:::");
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", mismatch)), /mismo número de casillas/);
  const onlyEs = VALID_STEPS.replace('title.es="Paso B" title.en="Step B"', 'title.es="Paso B"');
  assert.match(warningsOf(analyze("documents/steps/x.steps.md", onlyEs)), /no tiene traducción para: en/);
  const unsupported = VALID_STEPS.replace("Solo texto.", ":::lang fr\nBonjour\n:::");
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", unsupported)), /Idioma no soportado «fr»/);
});

test("avisa si un enlace inicial usa un icono inexistente", () => {
  const source = withFrontMatter(VALID_TEST, "links", '[{ label: "x", url: "https://example.com", icon: "no-existe" }]');
  assert.match(warningsOf(analyze("documents/tests/x.test.md", source)), /icon «no-existe» no existe en el sprite/);
});
