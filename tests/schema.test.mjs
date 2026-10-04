// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * El validador propio (assets/js/schema.js) debe coincidir con Ajv, la
 * implementación de referencia de JSON Schema 2020-12.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import Ajv2020 from "ajv/dist/2020.js";
import { validateAgainstSchema } from "../assets/js/schema.js";
import { SCHEMAS } from "./helpers.mjs";

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
const compiled = { steps: ajv.compile(SCHEMAS.steps), test: ajv.compile(SCHEMAS.test) };

const base = { title: { es: "T", en: "T" }, description: "D", slug: "a-b", version: "1.0.0", updated: "2026-10-03" };
const CASES = [
  ["steps", { ...base, type: "steps" }, true],
  ["steps", { ...base, type: "steps", tags: ["a", "b"], links: [{ label: { es: "x" }, url: "{{repo_url}}/x", icon: "github" }], reset: false, author: "A" }, true],
  ["steps", { ...base, type: "steps", tags: ["a", "a"] }, false],
  ["steps", { ...base, type: "steps", tags: ["Mayúscula"] }, false],
  ["steps", { ...base, type: "steps", title: { fr: "x" } }, false],
  ["steps", { ...base, type: "steps", title: {} }, false],
  ["steps", { ...base, type: "steps", title: 3 }, false],
  ["steps", { ...base, type: "steps", links: [{ label: "x", url: "javascript:alert(1)" }] }, false],
  ["steps", { ...base, type: "steps", links: [{ label: "x" }] }, false],
  ["steps", { ...base, type: "steps", status: "passed" }, false],
  ["steps", { ...base, type: "test" }, false],
  ["steps", { ...base, type: "steps", version: "v1" }, false],
  ["test", { ...base, type: "test", status: "partial", executedAt: "2026-10-03T20:00:00-05:00", environment: "QA", summary: { passed: 1, "not-run": 2, total: 3 } }, true],
  ["test", { ...base, type: "test", status: "ok" }, false],
  ["test", { ...base, type: "test", summary: { passed: -1 } }, false],
  ["test", { ...base, type: "test", summary: { extra: 1 } }, false],
  ["test", { ...base, type: "test", summary: { passed: 1.5 } }, false],
];

test("el validador propio coincide con Ajv en documentos válidos e inválidos", () => {
  for (const [type, data, expected] of CASES) {
    const ours = validateAgainstSchema(SCHEMAS[type], data);
    assert.equal(compiled[type](data), expected, `Ajv ${type} ${JSON.stringify(data)}`);
    assert.equal(ours.length === 0, expected, `propio ${type} ${JSON.stringify(data)}: ${JSON.stringify(ours)}`);
  }
});

test("formatos de fecha (Ajv se usa sin formatos; aquí se comprueban los propios)", () => {
  const errors = (data) => validateAgainstSchema(SCHEMAS.test, { ...base, type: "test", ...data }).map((e) => e.path);
  assert.deepEqual(errors({ updated: "2026-02-30" }), ["/updated"]);
  assert.deepEqual(errors({ updated: "2026-10-3" }), ["/updated"]);
  assert.deepEqual(errors({ executedAt: "2026-10-03 20:00" }), ["/executedAt"]);
  assert.deepEqual(errors({ executedAt: "2026-10-03T20:00:00Z" }), []);
});

test("las definiciones comunes son idénticas en ambos esquemas", () => {
  assert.deepEqual(SCHEMAS.steps.$defs, SCHEMAS.test.$defs);
  for (const key of Object.keys(SCHEMAS.steps.properties)) {
    if (key !== "type") assert.deepEqual(SCHEMAS.steps.properties[key], SCHEMAS.test.properties[key], key);
  }
});
