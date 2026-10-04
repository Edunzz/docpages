// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeMode, enabledTypes, isDocumentPath, filterByMode, typeFromPath, typeFromRoute, routeFor } from "../assets/js/documents.js";
import { DOCUMENTATION_MODE } from "../assets/js/config.js";
import { analyzeAll } from "../scripts/lib/docs.mjs";
import { generateManifest } from "../scripts/build-manifest.mjs";
import { VALID_STEPS, VALID_TEST, makeSite } from "./fixtures.mjs";

test("modos all, steps y tests", () => {
  assert.equal(DOCUMENTATION_MODE, "all", "el repositorio se publica con ambos tipos por defecto");
  assert.deepEqual(enabledTypes("all"), ["steps", "test"]);
  assert.deepEqual(enabledTypes("steps"), ["steps"]);
  assert.deepEqual(enabledTypes("tests"), ["test"]);
  assert.equal(normalizeMode("otro"), "all");

  assert.equal(isDocumentPath("documents/steps/a.steps.md", "all"), true);
  assert.equal(isDocumentPath("documents/steps/sub/a.steps.md", "steps"), true);
  assert.equal(isDocumentPath("documents/tests/a.test.md", "steps"), false);
  assert.equal(isDocumentPath("documents/steps/a.steps.md", "tests"), false);
  assert.equal(isDocumentPath("documents/tests/a.steps.md", "all"), false, "carpeta equivocada");
  assert.equal(isDocumentPath("otros/a.steps.md", "all"), false);

  const docs = [{ type: "steps" }, { type: "test" }];
  assert.deepEqual(filterByMode(docs, "tests"), [{ type: "test" }]);
});

test("rutas por tipo de documento", () => {
  assert.equal(typeFromPath("documents/tests/x.test.md"), "test");
  assert.equal(typeFromRoute("tests"), "test");
  assert.equal(typeFromRoute("steps"), "steps");
  assert.equal(typeFromRoute("otro"), null);
  assert.equal(routeFor({ type: "test", slug: "x" }, "caso 1"), "#/tests/x/caso%201");
});

test("validación y manifiesto respetan el modo", async () => {
  const root = await makeSite({ "documents/steps/a.steps.md": VALID_STEPS, "documents/tests/b.test.md": VALID_TEST });
  const steps = await analyzeAll({ root, mode: "steps" });
  assert.deepEqual(steps.results.map((r) => r.path), ["documents/steps/a.steps.md"]);
  assert.match(steps.notes[0].message, /modo «steps» no publica/);

  const tests = await generateManifest({ root, mode: "tests", env: {} });
  assert.equal(tests.mode, "tests");
  assert.deepEqual(tests.documents.map((d) => d.type), ["test"]);
  assert.deepEqual(tests.counts, { steps: 0, tests: 1 });

  const all = await generateManifest({ root, mode: "all", env: {} });
  assert.deepEqual(all.counts, { steps: 1, tests: 1 });
});
