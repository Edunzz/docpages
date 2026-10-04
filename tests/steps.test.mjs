// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, memoryStorage } from "./helpers.mjs";
import { VALID_STEPS } from "./fixtures.mjs";
import { computeProgress, setDone, isComplete, leavesOf, restoreStepsState, serializeStepsState, firstIncompleteStep } from "../assets/js/steps.js";
import { createStore, documentStateKey, repositoryScope } from "../assets/js/storage.js";

const model = analyze("documents/steps/pasos-prueba.steps.md", VALID_STEPS).model;

test("hojas: casillas, subpasos sin casillas y pasos sin hijos", () => {
  assert.deepEqual(leavesOf(model, "a"), ["a#0", "a#1", "a1#0", "a2"]);
  assert.deepEqual(leavesOf(model, "a1"), ["a1#0"]);
  assert.deepEqual(leavesOf(model, "a2"), ["a2"]);
  assert.deepEqual(leavesOf(model, "b"), ["b"]);
  assert.deepEqual(leavesOf(model, "a#1"), ["a#1"]);
  assert.deepEqual(leavesOf(model, "desconocido"), []);
});

test("cálculo de progreso en pasos y subpasos (redondeo hacia abajo)", () => {
  let done = new Set();
  assert.deepEqual(pick(computeProgress(model, done)), { done: 0, total: 5, percent: 0, complete: false });

  done = setDone(model, done, "a1", true);
  let progress = computeProgress(model, done);
  assert.equal(progress.percent, 20);
  assert.deepEqual(progress.steps[0].substeps.map((s) => s.complete), [true, false]);
  assert.equal(progress.steps[0].started, true);
  assert.equal(progress.steps[0].complete, false);

  done = setDone(model, done, "a", true);
  assert.equal(isComplete(model, done, "a"), true);
  assert.equal(computeProgress(model, done).percent, 80);
  assert.equal(firstIncompleteStep(model, done), "b");

  done = setDone(model, done, "b", true);
  progress = computeProgress(model, done);
  assert.deepEqual(pick(progress), { done: 5, total: 5, percent: 100, complete: true });

  done = setDone(model, done, "a", false);
  assert.equal(computeProgress(model, done).percent, 20, "desmarcar un paso desmarca todas sus hojas");

  // 2 de 3 = 66 %, no 67 %: el 100 % solo aparece cuando está todo.
  const three = { leaves: ["x", "y", "z"], steps: [] };
  assert.equal(computeProgress(three, new Set(["x", "y"])).percent, 66);
});

test("persistencia y reinicio: claves desconocidas se descartan y el resumen se guarda", () => {
  const store = createStore(memoryStorage());
  const key = documentStateKey({ repository: { owner: "Owner", name: "Repo" }, slug: "pasos-prueba", version: "1.0.0", type: "steps" });
  assert.equal(key, "docpages:owner/repo:pasos-prueba:1.0.0:steps");

  const state = { done: setDone(model, new Set(), "a1", true), current: "a" };
  store.setJSON(key, serializeStepsState(state, model, new Date("2026-10-03T00:00:00Z")));
  const saved = store.getJSON(key);
  assert.deepEqual(saved, { v: 1, done: ["a1#0"], current: "a", updatedAt: "2026-10-03T00:00:00.000Z", summary: { done: 1, total: 5, percent: 20 } });

  const restored = restoreStepsState({ ...saved, done: [...saved.done, "borrado#0"], current: "paso-viejo" }, model);
  assert.deepEqual([...restored.done], ["a1#0"]);
  assert.equal(restored.current, "a", "si el paso actual ya no existe se va al primero incompleto");

  store.remove(key);
  assert.equal(store.getJSON(key), null);
  assert.deepEqual([...restoreStepsState(store.getJSON(key), model).done], []);
});

test("cada versión y cada repositorio tienen su propio estado", () => {
  const base = { slug: "s", type: "steps" };
  const v1 = documentStateKey({ ...base, version: "1.0.0", repository: { owner: "a", name: "r" } });
  const v2 = documentStateKey({ ...base, version: "2.0.0", repository: { owner: "a", name: "r" } });
  const other = documentStateKey({ ...base, version: "1.0.0", repository: { owner: "b", name: "r" } });
  assert.equal(new Set([v1, v2, other]).size, 3);
  assert.equal(repositoryScope(null), "local");
});

function pick({ done, total, percent, complete }) {
  return { done, total, percent, complete };
}
