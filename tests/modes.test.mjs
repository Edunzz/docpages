// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMode, enabledTypes, enabledCategories, isDocumentPath, isCandidatePath, filterByMode, typeFromPath, categoryFromPath, typeFromRoute, routeFor } from "../assets/js/documents.js";
import { DOCUMENTATION_MODE } from "../assets/js/config.js";
import { analyzeAll } from "../scripts/lib/docs.mjs";
import { VALID_STEPS, VALID_TEST, makeSite } from "./fixtures.mjs";

test("modos all, steps y tests: tipos y categorías", () => {
  assert.equal(DOCUMENTATION_MODE, "all", "el repositorio se publica con todo por defecto");
  assert.deepEqual(enabledTypes("all"), ["steps", "test"]);
  assert.deepEqual(enabledTypes("steps"), ["steps"]);
  assert.deepEqual(enabledTypes("tests"), ["test"]);
  assert.equal(normalizeMode("otro"), "all");
  assert.deepEqual(enabledCategories("all"), ["procedure", "lab-guide", "practice-test"]);
  assert.deepEqual(enabledCategories("steps"), ["procedure", "lab-guide"]);
  assert.deepEqual(enabledCategories("tests"), ["practice-test"]);

  assert.equal(isDocumentPath("documents/steps/a.procedure.steps.md", "all"), true);
  assert.equal(isDocumentPath("documents/steps/sub/a.labguide.steps.md", "steps"), true);
  assert.equal(isDocumentPath("documents/steps/a.steps.md", "all"), false, "sin tipo en el nombre");
  assert.equal(isDocumentPath("documents/tests/a.test.md", "steps"), false);
  assert.equal(isDocumentPath("documents/steps/a.procedure.steps.md", "tests"), false);
  assert.equal(isDocumentPath("documents/tests/a.procedure.steps.md", "all"), false, "carpeta equivocada");
  assert.equal(isDocumentPath("otros/a.procedure.steps.md", "all"), false);

  // Candidatos a revisar: todo Markdown de /documents (los mal nombrados darán error).
  assert.equal(isCandidatePath("documents/notas.md", "all"), true);
  assert.equal(isCandidatePath("documents/steps/x.steps.md", "steps"), true);
  assert.equal(isCandidatePath("documents/tests/a.test.md", "steps"), false, "tipo deshabilitado");
  assert.equal(isCandidatePath("documents/tests/img.png", "all"), false);
  assert.equal(isCandidatePath("README.md", "all"), false);

  const docs = [{ type: "steps" }, { type: "test" }];
  assert.deepEqual(filterByMode(docs, "tests"), [{ type: "test" }]);
});

test("el nombre del archivo decide la categoría", () => {
  assert.equal(categoryFromPath("documents/steps/x.procedure.steps.md"), "procedure");
  assert.equal(categoryFromPath("documents/steps/x.labguide.steps.md"), "lab-guide");
  assert.equal(categoryFromPath("documents/tests/x.test.md"), "practice-test");
  assert.equal(categoryFromPath("documents/steps/x.steps.md"), null);
  assert.equal(typeFromPath("documents/steps/x.labguide.steps.md"), "steps");
  assert.equal(typeFromPath("documents/tests/x.test.md"), "test");
});

test("rutas por tipo de documento", () => {
  assert.equal(typeFromRoute("tests"), "test");
  assert.equal(typeFromRoute("steps"), "steps");
  assert.equal(typeFromRoute("otro"), null);
  assert.equal(routeFor({ type: "test", slug: "x" }, "caso 1"), "#/tests/x/caso%201");
});

test("la validación respeta el modo", async () => {
  const root = await makeSite({ "documents/steps/a.procedure.steps.md": VALID_STEPS, "documents/tests/b.test.md": VALID_TEST });
  const steps = await analyzeAll({ root, mode: "steps" });
  assert.deepEqual(steps.results.map((r) => r.path), ["documents/steps/a.procedure.steps.md"]);
  assert.match(steps.notes[0].message, /modo «steps» no publica/);
  const tests = await analyzeAll({ root, mode: "tests" });
  assert.deepEqual(tests.results.map((r) => r.path), ["documents/tests/b.test.md"]);
  const all = await analyzeAll({ root, mode: "all" });
  assert.equal(all.results.length, 2);
});
