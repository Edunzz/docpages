// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./helpers.mjs";
import { VALID_STEPS, VALID_TEST, withFrontMatter, makeSite } from "./fixtures.mjs";
import { findDuplicateSlugs, buildManifestEntry } from "../assets/js/documents.js";
import { analyzeAll } from "../scripts/lib/docs.mjs";

const errorsOf = (result) => result.errors.map((e) => e.message).join(" | ");
const warningsOf = (result) => result.warnings.map((e) => e.message).join(" | ");

test(".steps.md válido: metadatos, pasos, subpasos y modelo de progreso", () => {
  const result = analyze("documents/steps/pasos-prueba.steps.md", VALID_STEPS);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.equal(result.type, "steps");
  assert.equal(result.meta.slug, "pasos-prueba");
  assert.deepEqual(result.model.steps.map((s) => s.id), ["a", "b"]);
  assert.deepEqual(result.model.leaves, ["a#0", "a#1", "a1#0", "a2", "b"]);
  assert.doesNotMatch(result.body, /\{\{ title \}\}/, "el placeholder del título se consume");
  const entry = buildManifestEntry(result, { hash: "sha256-x", size: 10 });
  assert.equal(entry.stepCount, 2);
  assert.equal(entry.taskCount, 5);
  assert.equal(entry.reset, true);
});

test(".test.md válido: casos, estados, evidencia y resumen", () => {
  const result = analyze("documents/tests/prueba-x.test.md", VALID_TEST);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(result.model.cases.map((c) => [c.id, c.status]), [["c1", "passed"], ["c2", "failed"], ["c3", "blocked"]]);
  assert.deepEqual(result.model.cases[0].evidence.map((e) => [e.type, e.target]), [["link", "https://example.com/run/1"], ["image", "img/c1.png"]]);
  const entry = buildManifestEntry(result, {});
  assert.equal(entry.status, "failed");
  assert.deepEqual(entry.summary, { passed: 1, failed: 1, blocked: 1, partial: 0, running: 0, "not-run": 0, total: 3 });
});

test("rechaza sufijo y tipo incompatibles", () => {
  const asTest = analyze("documents/steps/pasos-prueba.steps.md", withFrontMatter(VALID_STEPS, "type", '"test"'));
  assert.match(errorsOf(asTest), /no coincide con el sufijo del archivo: «\.steps\.md» exige «type: "steps"»/);
  const asSteps = analyze("documents/tests/prueba-x.test.md", withFrontMatter(VALID_TEST, "type", '"steps"'));
  assert.match(errorsOf(asSteps), /«\.test\.md» exige «type: "test"»/);
});

test("rechaza ubicación, nombre de archivo y sufijo desconocido", () => {
  assert.match(errorsOf(analyze("documents/tests/pasos.steps.md", VALID_STEPS)), /deben estar dentro de \/documents\/steps/);
  assert.match(errorsOf(analyze("documents/steps/Mis Pasos.steps.md", VALID_STEPS)), /Nombre de archivo inválido/);
  assert.match(errorsOf(analyze("documents/steps/notas.md", VALID_STEPS)), /debe terminar en/);
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
  source = withFrontMatter(VALID_TEST, "status", '"ok"');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", source)), /\/status: debe ser uno de/);
});

test("detecta ids duplicados, títulos ausentes y estados inválidos en el cuerpo", () => {
  const dupe = VALID_STEPS.replace(':::step id="b"', ':::step id="a"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", dupe)), /id duplicado «a»/);
  const noTitle = VALID_STEPS.replace(':::step id="b" title.es="Paso B" title.en="Step B"', ':::step id="b"');
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", noTitle)), /necesita un título/);
  const badStatus = VALID_TEST.replace('status="blocked"', 'status="ok"');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", badStatus)), /status inválido «ok»/);
  const noSteps = VALID_STEPS.slice(0, VALID_STEPS.indexOf(":::step"));
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", noSteps)), /al menos un «:::step»/);
});

test("detecta slugs duplicados entre documentos", async () => {
  const a = analyze("documents/steps/a.steps.md", VALID_STEPS);
  const b = analyze("documents/steps/b.steps.md", VALID_STEPS);
  assert.deepEqual(findDuplicateSlugs([a, b]).map((d) => d.paths), [["documents/steps/a.steps.md", "documents/steps/b.steps.md"]]);

  const root = await makeSite({ "documents/steps/a.steps.md": VALID_STEPS, "documents/steps/b.steps.md": VALID_STEPS });
  const { results } = await analyzeAll({ root, mode: "all" });
  assert.ok(results.every((r) => /slug duplicado «pasos-prueba»/.test(errorsOf(r))));
});

test("evidencia: solo enlaces http(s)/relativos e imágenes relativas dentro del sitio", () => {
  const bad = (target, type = "image") => errorsOf(analyze("documents/tests/x.test.md", VALID_TEST.replace("img/c1.png", target).replace('type="image"', `type="${type}"`)));
  assert.match(bad("https://example.com/a.png"), /ruta relativa dentro del sitio/);
  assert.match(bad("../../../fuera.png"), /ruta relativa dentro del sitio/);
  assert.match(bad("img/archivo.exe"), /Extensión de imagen no permitida/);
  assert.match(bad("javascript:alert(1)", "link"), /Evidencia de enlace no permitida/);
  assert.match(bad("x", "video"), /type="link" o type="image"/);
});

test("contenido inseguro: enlaces javascript: son error y el HTML crudo es aviso", () => {
  const js = VALID_STEPS.replace("Solo texto.", "[clic](javascript:alert(1))");
  assert.match(errorsOf(analyze("documents/steps/x.steps.md", js)), /esquema no permitido/);
  const html = VALID_STEPS.replace("Solo texto.", '<img src=x onerror="alert(1)">');
  assert.match(warningsOf(analyze("documents/steps/x.steps.md", html)), /HTML crudo/);
  const link = withFrontMatter(VALID_TEST, "links", '[{ label: "x", url: "javascript:alert(1)" }]');
  assert.match(errorsOf(analyze("documents/tests/x.test.md", link)), /\/links\/0\/url: formato inválido/);
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

test("pruebas: avisa si status o summary declarados no coinciden con los casos", () => {
  const result = analyze("documents/tests/x.test.md", withFrontMatter(withFrontMatter(VALID_TEST, "status", '"passed"'), "summary", "{ passed: 3, total: 3 }"));
  assert.deepEqual(result.errors, []);
  assert.match(warningsOf(result), /estado global declarado/);
  assert.match(warningsOf(result), /summary no coincide/);
});
