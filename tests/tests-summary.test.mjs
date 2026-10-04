// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./helpers.mjs";
import { VALID_TEST } from "./fixtures.mjs";
import { summarizeCases, deriveOverallStatus, normalizeStatus, restoreTestState, serializeTestState, TEST_STATUSES } from "../assets/js/tests.js";

const cases = (...statuses) => statuses.map((status, i) => ({ id: `c${i}`, status }));

test("resumen de estados de pruebas", () => {
  assert.deepEqual(summarizeCases(cases("passed", "passed", "failed", "blocked", "partial", "running", "not-run")), {
    passed: 2, failed: 1, blocked: 1, partial: 1, running: 1, "not-run": 1, total: 7,
  });
  assert.deepEqual(summarizeCases([]), { passed: 0, failed: 0, blocked: 0, partial: 0, running: 0, "not-run": 0, total: 0 });
  const local = summarizeCases(cases("passed", "failed"), (c) => (c.id === "c0" ? "failed" : null));
  assert.equal(local.failed, 1);
  assert.equal(local.total, 1, "los casos sin resultado local no cuentan");
});

test("estado global derivado: prioridad failed > blocked > partial > running", () => {
  const derive = (...statuses) => deriveOverallStatus(summarizeCases(cases(...statuses)));
  assert.equal(derive(), "not-run");
  assert.equal(derive("passed", "passed"), "passed");
  assert.equal(derive("passed", "failed", "blocked"), "failed");
  assert.equal(derive("passed", "blocked", "partial"), "blocked");
  assert.equal(derive("passed", "partial", "running"), "partial");
  assert.equal(derive("passed", "running"), "running");
  assert.equal(derive("not-run", "not-run"), "not-run");
  assert.equal(derive("passed", "not-run"), "partial");
});

test("los seis estados permitidos y su normalización", () => {
  assert.deepEqual([...TEST_STATUSES].sort(), ["blocked", "failed", "not-run", "partial", "passed", "running"]);
  assert.equal(normalizeStatus(" Passed "), "passed");
  assert.equal(normalizeStatus("ok"), null);
});

test("estado interactivo local: filtro y re-ejecución, validados al restaurar", () => {
  const model = analyze("documents/tests/prueba-x.test.md", VALID_TEST).model;
  const restored = restoreTestState({ filter: "failed", local: { c1: "passed", c9: "failed", c2: "raro" } }, model);
  assert.deepEqual(restored, { filter: "failed", local: { c1: "passed" } });
  assert.deepEqual(restoreTestState({ filter: "inventado" }, model), { filter: "all", local: {} });
  assert.deepEqual(restoreTestState(null, model), { filter: "all", local: {} });
  const saved = serializeTestState(restored, new Date("2026-10-03T00:00:00Z"));
  assert.deepEqual(saved, { v: 1, filter: "failed", local: { c1: "passed" }, updatedAt: "2026-10-03T00:00:00.000Z" });
});
