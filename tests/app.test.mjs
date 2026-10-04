// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * Pruebas de integración: la aplicación completa en jsdom con los documentos
 * de ejemplo reales, incluida una auditoría de accesibilidad con axe-core.
 * Sin manifiesto: en «GitHub Pages» la lista sale del árbol de la API
 * (emulado por siteFetch) y en local, del listado de carpetas del servidor.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { bootApp, siteFetch, memoryStorage, runAxe, tick } from "./helpers.mjs";
import { VALID_STEPS, VALID_TEST, withFrontMatter, makeSite, quizWith } from "./fixtures.mjs";

const STEPS_KEY = "docpages:owner/docpages:publish-github-pages:1.2.0:steps";
const QUIZ_KEY = "docpages:owner/docpages:docpages-basics:1.1.0:test";
const DRAFT_KEY = "docpages:validator";
const LOCAL = "http://localhost:8000/";

const visibleCards = (doc) => [...doc.querySelectorAll(".card")].filter((card) => !card.hidden).map((card) => card.dataset.slug);
const buttonWith = (root, pattern) => [...root.querySelectorAll("button")].find((b) => pattern.test(b.textContent));
const treeCalls = (fetchImpl) => fetchImpl.calls.filter((url) => url.includes("/git/trees/")).length;

/** Atajos para responder preguntas en el DOM. */
function quizHelpers(doc, win) {
  const question = (id) => doc.getElementById(`question-${id}`);
  return {
    question,
    choose(id, text) {
      const label = [...question(id).querySelectorAll("label.choice")].find((l) => l.querySelector(".choice__text").textContent.trim() === text);
      assert.ok(label, `opción «${text}» en ${id}`);
      label.querySelector("input").click();
    },
    type(id, value) {
      const input = question(id).querySelector(".answer-input");
      input.value = value;
      input.dispatchEvent(new win.Event("input"));
    },
    check(id) {
      buttonWith(question(id).querySelector(".question__actions"), /Comprobar|Check/).click();
    },
  };
}

// ─────────────────────────────── Portada ─────────────────────────────────────

test("portada en GitHub Pages: repositorio desde la URL, lista desde la API y tres categorías", async () => {
  const fetchImpl = siteFetch();
  const { doc, app } = await bootApp({ fetchImpl });
  assert.equal(app.repository.fullName, "owner/docpages");
  assert.equal(app.source, "github");
  assert.equal(treeCalls(fetchImpl), 1, "una sola consulta a la API");
  assert.ok(!fetchImpl.calls.some((url) => url.includes("documents.manifest.json")), "no hay manifiesto");

  const chip = doc.getElementById("repo-chip");
  assert.equal(chip.hidden, false);
  assert.equal(chip.getAttribute("href"), "https://github.com/owner/docpages");
  assert.equal(chip.getAttribute("rel"), "noopener noreferrer");

  assert.deepEqual([...doc.querySelectorAll(".doc-section")].map((s) => s.dataset.category), ["procedure", "lab-guide", "practice-test"]);
  assert.deepEqual([...doc.querySelectorAll(".doc-section .section-title")].map((h) => h.textContent.replace(/\d+$/, "")), ["Procedimientos", "Guías de laboratorio", "Pruebas de práctica"]);
  assert.deepEqual(visibleCards(doc), ["publish-github-pages", "first-practice-test-lab", "docpages-basics"]);
  assert.match(doc.querySelector(".card--lab-guide .card__type").textContent, /Guía de laboratorio/);
  assert.match(doc.querySelector(".card--practice-test .card__status-text").textContent, /Sin intentar/);
  assert.match(doc.querySelector(".card--practice-test .card__meta").textContent, /8 preguntas/);
  assert.match(doc.querySelector(".hero__source").textContent, /Documentos del repositorio publicado/);
  assert.equal(doc.querySelector(".invalid-docs"), null);

  doc.querySelector('.segmented__option[data-category="lab-guide"]').click();
  assert.deepEqual(visibleCards(doc), ["first-practice-test-lab"]);
  assert.equal(doc.querySelector(".doc-section--procedure").hidden, true);

  const hrefs = [...doc.querySelectorAll(".hero__actions a")].map((a) => a.getAttribute("href"));
  assert.deepEqual(hrefs, ["https://github.com/owner/docpages", "#/validate"]);
  assert.equal(doc.getElementById("nav-validate").getAttribute("href"), "#/validate");
  assert.match(doc.querySelector(".site-footer__credit").textContent, /Jose Eduardo Romero Jimenez/);
  assert.equal(doc.title, "Documentación");
});

test("portada: ?type= filtra por categoría (también con los nombres antiguos)", async () => {
  const { doc, app } = await bootApp();
  await app.navigate("#/?type=practice-test");
  assert.deepEqual(visibleCards(doc), ["docpages-basics"]);
  await app.navigate("#/?type=steps");
  assert.deepEqual(visibleCards(doc), ["publish-github-pages"]);
});

test("portada: la búsqueda filtra por título, etiqueta y contenido, sin distinguir tildes", async () => {
  const { doc, win } = await bootApp();
  const input = doc.getElementById("search");
  const search = (value) => {
    input.value = value;
    input.dispatchEvent(new win.Event("input"));
    return visibleCards(doc);
  };
  assert.deepEqual(search("quiz"), ["docpages-basics"]);
  assert.deepEqual(search("FUNDAMENTOS practica"), ["docpages-basics"]);
  assert.deepEqual(search("fork"), ["publish-github-pages"]);
  assert.deepEqual(search("a proposito"), ["first-practice-test-lab"]);
  assert.deepEqual(search("zzz-sin-resultados"), []);
  assert.match(doc.getElementById("search-status").textContent, /0 resultados/);
});

test("la lista se guarda 10 minutos y «Actualizar» la vuelve a leer", async () => {
  const storage = memoryStorage();
  const first = siteFetch();
  await bootApp({ storage, fetchImpl: first });
  assert.equal(treeCalls(first), 1);
  const second = siteFetch();
  const { doc } = await bootApp({ storage, fetchImpl: second });
  assert.equal(treeCalls(second), 0, "otra visita usa la lista guardada");
  buttonWith(doc.querySelector(".hero__actions"), /Actualizar/).click();
  await tick(150);
  assert.equal(treeCalls(second), 1);
  assert.match(doc.querySelector(".notice--success").textContent, /Lista actualizada: 3 documentos/);
});

test("API de GitHub con límite: sin lista guardada se informa; con lista guardada se usa", async () => {
  const limited = (storage) => bootApp({ storage, fetchImpl: siteFetch({ routes: { "https://api.github.com/": () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" } }) } }) });
  const empty = await limited(memoryStorage());
  assert.match(empty.doc.querySelector(".notice--error").textContent, /límite de consultas/);
  assert.match(empty.doc.querySelector(".notice--error").textContent, /«Validar»/);
  assert.deepEqual(visibleCards(empty.doc), []);

  const storage = memoryStorage();
  await bootApp({ storage });
  const saved = JSON.parse(storage.getItem("docpages:owner/docpages:catalog"));
  storage.setItem("docpages:owner/docpages:catalog", JSON.stringify({ ...saved, at: saved.at - 11 * 60 * 1000 }));
  const stale = await limited(storage);
  assert.match(stale.doc.querySelector(".notice--warning").textContent, /Se muestra la lista guardada/);
  assert.equal(visibleCards(stale.doc).length, 3);
});

test("documentos que no siguen el formato: se listan con su línea y no se publican", async () => {
  const root = await makeSite(
    {
      "documents/steps/a.procedure.steps.md": VALID_STEPS,
      "documents/tests/roto.test.md": quizWith(':::question type="single"\n¿Cuánto es 2 + 2?\n- [ ] 3\n- [ ] 4\n:::'),
      "documents/notas.md": "# Notas sueltas\n",
      "documents/steps/viejo.steps.md": VALID_STEPS.replace('slug: "pasos-prueba"', 'slug: "viejo"'),
    },
    { copySite: true },
  );
  const { doc, app } = await bootApp({ fetchImpl: siteFetch({ root }) });
  const invalid = doc.querySelector(".invalid-docs");
  assert.ok(invalid, "sección de documentos con errores");
  assert.deepEqual([...invalid.querySelectorAll(".invalid-doc__path code")].map((c) => c.textContent), ["documents/notas.md", "documents/steps/viejo.steps.md", "documents/tests/roto.test.md"]);
  assert.match(invalid.textContent, /El archivo no sigue el formato/);
  assert.match(invalid.textContent, /Indica el tipo en el nombre del archivo/);
  assert.match(invalid.textContent, /línea 10/);
  assert.match(invalid.textContent, /exactamente una opción correcta/);
  assert.equal(invalid.querySelector(".invalid-doc__source").getAttribute("href"), "https://github.com/owner/docpages/blob/HEAD/documents/notas.md");
  assert.deepEqual(visibleCards(doc), ["pasos-prueba"]);
  assert.deepEqual(await runAxe(doc.defaultView), []);

  await app.navigate("#/tests/prueba-y");
  assert.match(doc.querySelector(".message-view h1").textContent, /no tiene el formato correcto/);
  assert.match(doc.querySelector(".message-view .error-list").textContent, /documents\/tests\/roto\.test\.md:10/);
});

// ───────────────────────────── Vista local ───────────────────────────────────

for (const listing of ["python", "serve-index"]) {
  test(`vista local (${listing}): muestra lo que hay en la carpeta, sin repositorio`, async () => {
    const fetchImpl = siteFetch({ base: LOCAL, listing });
    const { doc, app } = await bootApp({ url: LOCAL, fetchImpl });
    assert.equal(app.source, "local");
    assert.equal(app.repository, null);
    assert.equal(treeCalls(fetchImpl), 0, "en local no se usa la API de GitHub");
    assert.deepEqual(visibleCards(doc), ["publish-github-pages", "first-practice-test-lab", "docpages-basics"]);
    assert.match(doc.querySelector(".hero__source").textContent, /Vista local: documentos de tu carpeta/);
    assert.equal(doc.getElementById("repo-chip").hidden, true);
    assert.equal(doc.getElementById("footer-source").textContent, "Vista local");
    await app.navigate("#/steps/publish-github-pages");
    // {{repo_url}} sin resolver: el enlace inicial queda deshabilitado, no roto.
    assert.ok(doc.querySelector(".doc-links .chip--disabled"));
    assert.ok(![...doc.querySelectorAll(".steps-content a")].some((a) => a.getAttribute("href").startsWith("/settings")));
  });
}

test("vista local con .git/config: los enlaces apuntan al repositorio de quien clonó", async () => {
  const gitConfig = '[core]\n\tbare = false\n[remote "origin"]\n\turl = https://github.com/Mi-Usuario/mi-copia.git\n';
  const { doc, app } = await bootApp({ url: LOCAL, fetchImpl: siteFetch({ base: LOCAL, gitConfig }) });
  assert.equal(app.source, "local");
  assert.equal(app.repository.fullName, "Mi-Usuario/mi-copia");
  assert.match(doc.getElementById("footer-source").textContent, /Vista local de Mi-Usuario\/mi-copia/);
  await app.navigate("#/steps/publish-github-pages");
  const links = [...doc.querySelectorAll(".doc-links a")].map((a) => a.getAttribute("href"));
  assert.deepEqual(links.slice(0, 2), ["https://github.com/Mi-Usuario/mi-copia", "https://github.com/Mi-Usuario/mi-copia/settings/pages"]);
});

test("vista local sin listado de carpetas: se explica qué hacer y «Validar» sigue disponible", async () => {
  const { doc, app } = await bootApp({ url: LOCAL, fetchImpl: siteFetch({ base: LOCAL, listing: false }) });
  assert.match(doc.querySelector(".notice--error").textContent, /no muestra el contenido de las carpetas/);
  assert.match(doc.querySelector(".notice--error").textContent, /Live Server/);
  assert.deepEqual(visibleCards(doc), []);
  await app.navigate("#/validate");
  assert.ok(doc.querySelector(".validator"));
});

test("rutas: funciona en la raíz de un sitio de usuario", async () => {
  const userSite = await bootApp({ url: "https://owner.github.io/" });
  assert.equal(userSite.app.repository.fullName, "owner/owner.github.io");
  await userSite.app.navigate("#/steps/publish-github-pages");
  assert.equal(userSite.doc.querySelectorAll(".step").length, 5);
});

// ─────────────────────────────── Idioma ──────────────────────────────────────

test("idioma: el selector cambia la interfaz, <html lang> y persiste la preferencia", async () => {
  const storage = memoryStorage();
  const { doc, win } = await bootApp({ storage });
  assert.equal(doc.documentElement.lang, "es");
  doc.querySelector('[data-lang="en"]').click();
  await tick();
  assert.equal(doc.documentElement.lang, "en");
  assert.equal(storage.getItem("docpages:lang"), "en");
  assert.equal(doc.getElementById("brand-title").textContent, "Documentation");
  assert.equal(doc.querySelector("#nav-validate").textContent.trim(), "Validate");
  assert.match(doc.querySelector("#section-procedure").textContent, /Procedures/);
  assert.match(doc.querySelector("#section-lab-guide").textContent, /Lab guides/);
  assert.match(doc.querySelector("#section-practice-test").textContent, /Practice tests/);
  assert.equal(doc.querySelector('[data-lang="en"]').getAttribute("aria-pressed"), "true");

  const second = await bootApp({ storage, languages: ["es-MX"] });
  assert.equal(second.doc.documentElement.lang, "en");
  assert.match(second.doc.querySelector(".card--procedure .card__link").textContent, /Publish documentation/);
  win.close();
});

test("idioma: sin preferencia se usa el del navegador y, si no está soportado, español", async () => {
  assert.equal((await bootApp({ languages: ["en-GB"] })).doc.documentElement.lang, "en");
  assert.equal((await bootApp({ languages: ["fr-FR", "de"] })).doc.documentElement.lang, "es");
});

// ─────────────────────── Procedimientos y guías ──────────────────────────────

test("procedimiento: pasos, subpasos, progreso persistente y reinicio", async () => {
  const storage = memoryStorage();
  const { doc, app } = await bootApp({ storage });
  await app.navigate("#/steps/publish-github-pages");

  assert.match(doc.querySelector(".doc-header .eyebrow").textContent, /Procedimiento/);
  assert.match(doc.querySelector(".facts").textContent, /15 minutos/);
  assert.match(doc.querySelector(".facts").textContent, /Básico/);
  assert.equal(doc.querySelectorAll(".stepper__item").length, 5);
  assert.equal(doc.querySelectorAll(".step").length, 5);
  assert.equal(doc.querySelectorAll(".substep").length, 4);
  assert.equal(doc.querySelector(".doc-progress__value").textContent.replace(/\s/g, ""), "0%");
  assert.match(doc.querySelector(".doc-progress").textContent, /Progreso del procedimiento/);

  const links = [...doc.querySelectorAll(".doc-links a")].map((a) => a.getAttribute("href"));
  assert.deepEqual(links, ["https://github.com/owner/docpages", "https://github.com/owner/docpages/settings/pages", "https://docs.github.com/pages"]);

  // Una casilla = 1 de 10 hojas.
  doc.querySelector('.task-check[data-key="prepare-branch#0"]').click();
  assert.equal(doc.querySelector(".doc-progress__value").textContent.replace(/\s/g, ""), "10%");
  assert.deepEqual(JSON.parse(storage.getItem(STEPS_KEY)).done, ["prepare-branch#0"]);

  // Completar un paso con subpasos marca todas sus casillas y avanza al siguiente.
  doc.querySelector("#step-prepare .step__actions .btn--primary").click();
  const saved = JSON.parse(storage.getItem(STEPS_KEY));
  assert.deepEqual(saved.done, ["prepare-branch#0", "prepare-branch#1", "prepare-files#0", "prepare-files#1"]);
  assert.equal(saved.summary.percent, 40);
  assert.equal(saved.current, "enable-pages");
  assert.equal(doc.querySelector("#step-prepare").dataset.state, "done");
  assert.equal(doc.querySelector('.stepper__link[data-id="enable-pages"]').getAttribute("aria-current"), "step");

  // Un subpaso sin casillas es una hoja.
  doc.querySelector("#substep-create-file .substep__actions button").click();
  assert.equal(JSON.parse(storage.getItem(STEPS_KEY)).summary.done, 5);

  const again = await bootApp({ storage });
  await again.app.navigate("#/steps/publish-github-pages");
  assert.equal(again.doc.querySelector('.task-check[data-key="prepare-files#1"]').checked, true);
  assert.equal(again.doc.querySelector(".doc-progress__value").textContent.replace(/\s/g, ""), "50%");

  const reset = again.doc.querySelector(".btn--reset");
  reset.click();
  assert.ok(storage.getItem(STEPS_KEY), "el primer clic solo arma el botón");
  reset.click();
  assert.equal(storage.getItem(STEPS_KEY), null);
  assert.equal(again.doc.querySelector('.task-check[data-key="prepare-files#1"]').checked, false);
  assert.equal(again.doc.querySelector(".doc-progress__value").textContent.replace(/\s/g, ""), "0%");
});

test("procedimiento: el bloque :::lang sigue el idioma sin cambiar las claves del progreso", async () => {
  const storage = memoryStorage();
  const { doc, app } = await bootApp({ storage });
  await app.navigate("#/steps/publish-github-pages");
  doc.querySelector('.task-check[data-key="prepare-branch#1"]').click();
  assert.match(doc.querySelector("#substep-prepare-branch").textContent, /Confirma que existe la rama/);
  doc.querySelector('[data-lang="en"]').click();
  await tick();
  const substep = doc.querySelector("#substep-prepare-branch");
  assert.match(substep.textContent, /Confirm that the/);
  assert.equal(substep.querySelector(".lang-block").getAttribute("lang"), "en");
  assert.equal(doc.querySelector('.task-check[data-key="prepare-branch#1"]').checked, true);
});

test("guía de laboratorio: objetivos, requisitos, los siete tipos de pregunta y progreso propio", async () => {
  const storage = memoryStorage();
  const { doc, app } = await bootApp({ storage });
  await app.navigate("#/steps/first-practice-test-lab");

  assert.match(doc.querySelector(".doc-header .eyebrow").textContent, /Guía de laboratorio/);
  assert.ok(doc.querySelector('.breadcrumb a[href="#/?type=lab-guide"]'));
  assert.equal(doc.querySelectorAll(".brief--objectives li").length, 3);
  assert.equal(doc.querySelectorAll(".brief--prerequisites li").length, 2);
  assert.match(doc.querySelector(".facts").textContent, /40 minutos/);
  assert.match(doc.querySelector(".doc-progress").textContent, /Progreso del laboratorio/);
  assert.equal(doc.querySelector(".stepper").getAttribute("aria-label"), "Pasos del laboratorio");
  const types = [...doc.querySelectorAll("#step-questions .substep")].map((s) => s.dataset.id);
  assert.deepEqual(types, ["type-single", "type-multiple", "type-true-false", "type-text", "type-number", "type-order", "type-match"]);

  const quizLink = [...doc.querySelectorAll(".doc-links a")].find((a) => a.textContent.includes("Prueba de ejemplo"));
  assert.equal(quizLink.getAttribute("href"), "#/tests/docpages-basics");

  for (const step of doc.querySelectorAll(".step")) step.querySelector(".step__actions .btn--primary").click();
  assert.equal(doc.querySelector(".completion").hidden, false);
  assert.match(doc.querySelector(".completion__title").textContent, /Laboratorio completado/);
  await app.navigate("#/");
  assert.match(doc.querySelector('.card[data-slug="first-practice-test-lab"] .card__status-text').textContent, /100/);
});

// ───────────────────────────── Pruebas de práctica ───────────────────────────

test("prueba de práctica: responder, comprobar, navegador de preguntas, puntuación y resultado", async () => {
  const storage = memoryStorage();
  const { doc, win, app } = await bootApp({ storage });
  await app.navigate("#/tests/docpages-basics");
  const { question, choose, type, check } = quizHelpers(doc, win);
  const navState = (id) => doc.querySelector(`.quiz-nav__link[data-id="${id}"]`).dataset.state;

  assert.match(doc.querySelector(".doc-header .eyebrow").textContent, /Prueba de práctica/);
  assert.deepEqual([...doc.querySelectorAll(".question")].map((s) => s.dataset.type), ["single", "true-false", "multiple", "text", "number", "order", "match", "single"]);
  assert.equal(doc.querySelectorAll(".quiz-nav__item").length, 8);
  assert.equal(navState("suffix"), "pending");

  check("suffix");
  assert.equal(question("suffix").querySelector(".question__notice").hidden, false);

  choose("suffix", "mi-lab.labguide.steps.md");
  assert.equal(navState("suffix"), "answered");
  check("suffix");
  assert.equal(question("suffix").dataset.result, "correct");
  assert.equal(navState("suffix"), "correct");
  assert.match(question("suffix").querySelector(".question__feedback").textContent, /¡Correcto!/);
  assert.doesNotMatch(question("suffix").querySelector(".question__feedback").textContent, /null|undefined/);
  assert.equal(question("suffix").querySelector(".question__explanation").hidden, false);
  assert.ok(question("suffix").querySelector("input").disabled);

  choose("storage", "Verdadero");
  check("storage");
  assert.equal(question("storage").dataset.result, "incorrect");
  assert.equal(navState("storage"), "incorrect");
  assert.match(question("storage").querySelector(".choice.is-wrong").textContent, /Verdadero.*tu respuesta, incorrecta/);
  assert.match(question("storage").querySelector(".choice.is-correct").textContent, /Falso.*respuesta correcta/);
  buttonWith(question("storage"), /Volver a responder/).click();
  choose("storage", "Falso");
  check("storage");
  assert.equal(question("storage").dataset.result, "correct");

  choose("safe-links", "https://example.com");
  choose("safe-links", "mailto:team@example.com");
  check("safe-links");
  assert.equal(question("safe-links").dataset.result, "correct");

  const hint = buttonWith(question("validate-command"), /Ver pista/);
  hint.click();
  assert.equal(hint.getAttribute("aria-expanded"), "true");
  type("validate-command", "VALIDAR.");
  check("validate-command");
  assert.equal(question("validate-command").dataset.result, "correct");

  type("percent", "67");
  check("percent");
  assert.match(question("percent").querySelector(".question__feedback").textContent, /Respuesta correcta: 66/);

  const order = question("workflow-order");
  const arrangement = () => [...order.querySelectorAll(".order__item")].map((li) => Number(li.dataset.item));
  assert.notDeepEqual(arrangement(), [0, 1, 2, 3], "empieza desordenada");
  for (let guard = 0; guard < 20 && arrangement().some((v, i) => v !== i); guard++) {
    const current = arrangement();
    const i = current.findIndex((v, idx) => idx > 0 && current[idx - 1] > v);
    order.querySelector(`button[data-item="${current[i]}"][data-dir="up"]`).click();
  }
  check("workflow-order");
  assert.equal(order.dataset.result, "correct");

  question("directives").querySelectorAll("select").forEach((select, i) => {
    select.value = String(i);
    select.dispatchEvent(new win.Event("change"));
  });
  check("directives");
  assert.equal(question("directives").dataset.result, "correct");
  assert.equal(JSON.parse(storage.getItem(QUIZ_KEY)).summary.score, 8);

  // El navegador lleva a la pregunta.
  doc.querySelector('.quiz-nav__link[data-id="find-the-error"]').click();
  assert.equal(doc.activeElement, doc.getElementById("question-title-find-the-error"));
  assert.equal(win.location.hash, "#/tests/docpages-basics/find-the-error");

  choose("find-the-error", "No marca la respuesta correcta con [x].");
  check("find-the-error");
  const results = doc.querySelector(".quiz-results");
  assert.equal(results.hidden, false);
  assert.match(results.textContent, /90\s?%/);
  assert.match(results.textContent, /Aprobado/);
  const review = results.querySelector(".quiz-results__review a");
  assert.equal(review.getAttribute("href"), "#/tests/docpages-basics/percent");
  review.click();
  assert.equal(doc.activeElement, doc.getElementById("question-title-percent"));
  const saved = JSON.parse(storage.getItem(QUIZ_KEY));
  assert.deepEqual([saved.attempts, saved.best, saved.summary.passed], [1, 90, true]);

  await app.navigate("#/");
  const card = doc.querySelector('.card[data-slug="docpages-basics"]');
  assert.match(card.textContent, /Aprobado/);
  assert.match(card.textContent, /Último resultado: 90/);

  await app.navigate("#/tests/docpages-basics");
  assert.equal(doc.querySelector(".quiz-results").hidden, false);
  buttonWith(doc.querySelector(".quiz-results"), /Intentar de nuevo/).click();
  const retried = JSON.parse(storage.getItem(QUIZ_KEY));
  assert.deepEqual([retried.answers, retried.best, retried.attempts], [{}, 90, 1]);
  assert.equal(navState("suffix"), "pending");
  assert.match(doc.querySelector(".quiz-score__best").textContent, /Mejor resultado: 90/);

  const reset = doc.querySelector(".btn--reset");
  reset.click();
  reset.click();
  assert.equal(storage.getItem(QUIZ_KEY), null);
});

test("prueba de práctica: el idioma cambia preguntas y opciones sin perder las respuestas", async () => {
  const { doc, win, app } = await bootApp({ storage: memoryStorage() });
  await app.navigate("#/tests/docpages-basics");
  const { question, choose } = quizHelpers(doc, win);
  choose("find-the-error", "No marca la respuesta correcta con [x].");
  doc.querySelector('[data-lang="en"]').click();
  await tick();
  assert.match(question("find-the-error").querySelector(".question__prompt").textContent, /This question fails validation/);
  const chosen = [...question("find-the-error").querySelectorAll("label.choice")].find((l) => l.querySelector("input").checked);
  assert.match(chosen.textContent, /It does not mark the correct answer/);
  assert.match(doc.querySelector(".quiz-nav").getAttribute("aria-label"), /Test questions/);
});

test("prueba con corrección al final: sin «Comprobar»; «Finalizar» pide confirmar si faltan respuestas", async () => {
  const root = await makeSite({ "documents/tests/prueba-x.test.md": withFrontMatter(VALID_TEST, "feedback", '"end"') }, { copySite: true });
  const { doc, win, app } = await bootApp({ fetchImpl: siteFetch({ root }) });
  await app.navigate("#/tests/prueba-x");
  const { question, choose } = quizHelpers(doc, win);

  assert.equal(doc.querySelectorAll(".question__actions .btn--primary").length, 0, "no hay botón «Comprobar»");
  choose("q-single", "Lima");
  assert.match(doc.querySelector(".quiz-score").textContent, /Avance/);
  const finish = doc.querySelector(".quiz-finish button");
  finish.click();
  assert.match(doc.querySelector(".quiz-finish__status").textContent, /Faltan 6 preguntas/);
  assert.equal(doc.querySelector(".quiz-results").hidden, true, "el primer clic solo pide confirmación");
  finish.click();
  assert.equal(doc.querySelector(".quiz-results").hidden, false);
  assert.equal(question("q-single").dataset.result, "correct");
  assert.match(question("q-tf").querySelector(".question__feedback").textContent, /Sin responder/);
  assert.match(question("q-text").querySelector(".question__feedback").textContent, /Respuesta correcta: Lima/);
  assert.match(doc.querySelector(".quiz-results").textContent, /25\s?%/);
  assert.match(doc.querySelector(".quiz-results").textContent, /No aprobado/);
});

// ─────────────────────────────── Validar ─────────────────────────────────────

test("Validar: plantilla válida con vista previa real, error con su línea y salto al pulsarlo", async () => {
  const storage = memoryStorage();
  const { doc, win, app } = await bootApp({ storage });
  await app.navigate("#/validate");
  assert.equal(doc.getElementById("nav-validate").getAttribute("aria-current"), "page");
  assert.equal(doc.querySelector(".validator__empty").hidden, false);
  assert.equal(doc.querySelector(".validator__workspace").hidden, true);

  doc.querySelector('[data-template="practice-test"]').click();
  const status = () => doc.querySelector(".validator__status").textContent;
  assert.equal(doc.getElementById("validator-name").value, "mi-prueba.test.md");
  assert.match(status(), /Formato correcto/);
  assert.match(doc.querySelector(".validator__next").textContent, /documents\/tests\/mi-prueba\.test\.md/);
  assert.equal(doc.querySelectorAll(".validator__preview .question").length, 7, "la vista previa es la prueba real");
  assert.equal(doc.querySelectorAll("#view h1").length, 1, "el título del documento pasa a h2");
  assert.ok(doc.querySelector(".validator__preview h2.doc-title--preview"));

  // Interactuar con la vista previa no cambia la URL ni guarda nada.
  const { choose, check } = quizHelpers(doc, win);
  const first = doc.querySelector(".validator__preview .question").dataset.id;
  choose(first, "443");
  check(first);
  assert.equal(doc.querySelector(`.validator__preview #question-${first}`).dataset.result, "correct");
  assert.equal(win.location.hash, "#/validate");
  assert.ok(!Object.keys(storage.dump()).some((key) => key.endsWith(":test")));

  // Un error: se indica la línea y al pulsarlo se selecciona en el editor.
  const textarea = doc.getElementById("validator-text");
  textarea.value = textarea.value.replace("- [x] 443", "- [ ] 443");
  textarea.dispatchEvent(new win.Event("input"));
  app.view.flush();
  assert.match(status(), /1 error/);
  const issue = doc.querySelector(".issue__button");
  assert.match(issue.textContent, /Línea 11/);
  assert.match(issue.textContent, /exactamente una opción correcta/);
  assert.match(doc.querySelector(".validator__preview").textContent, /cuando el documento no tiene errores/);
  issue.click();
  assert.equal(doc.activeElement, textarea);
  assert.equal(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd), ':::question type="single"');
  assert.match(doc.getElementById("validator-caret").textContent, /Línea 11/);

  // El nombre también se valida.
  const name = doc.getElementById("validator-name");
  name.value = "Mi Prueba.test.md";
  name.dispatchEvent(new win.Event("input"));
  app.view.flush();
  assert.match(doc.querySelector(".validator__issues").textContent, /Nombre de archivo inválido/);

  // El borrador sobrevive a una recarga.
  const again = await bootApp({ storage });
  await again.app.navigate("#/validate");
  assert.equal(again.doc.getElementById("validator-name").value, "Mi Prueba.test.md");
  assert.match(again.doc.querySelector(".validator__status").textContent, /error/);
});

test("Validar: abrir archivos, slug repetido con el sitio, nombre sin tipo y cerrar", async () => {
  const { doc, win, app } = await bootApp({ storage: memoryStorage() });
  await app.navigate("#/validate");
  const input = doc.getElementById("validator-files");
  const files = [
    new win.File([withFrontMatter(VALID_TEST, "slug", '"docpages-basics"')], "otra.test.md", { type: "text/markdown" }),
    new win.File([VALID_STEPS], "viejo.steps.md", { type: "text/markdown" }),
    new win.File(["png"], "foto.png", { type: "image/png" }),
  ];
  Object.defineProperty(input, "files", { value: files, configurable: true });
  input.dispatchEvent(new win.Event("change"));
  await tick(80);
  app.view.flush();

  const names = [...doc.querySelectorAll(".validator__file-name")].map((n) => n.textContent);
  assert.deepEqual(names, ["otra.test.md", "viejo.steps.md"]);
  assert.match(doc.querySelector(".validator__notice").textContent, /foto\.png/);
  assert.match(doc.querySelector(".validator__issues").textContent, /Indica el tipo en el nombre del archivo/);

  doc.querySelector(".validator__file").click();
  assert.match(doc.querySelector(".validator__issues").textContent, /slug «docpages-basics» ya lo usa documents\/tests\/docpages-basics\.test\.md/);

  doc.querySelector(".validator__close").click();
  assert.deepEqual([...doc.querySelectorAll(".validator__file-name")].map((n) => n.textContent), ["viejo.steps.md"]);
  const name = doc.getElementById("validator-name");
  name.value = "viejo.procedure.steps.md";
  name.dispatchEvent(new win.Event("input"));
  app.view.flush();
  assert.match(doc.querySelector(".validator__status").textContent, /Formato correcto/);
  assert.equal(doc.querySelectorAll(".validator__preview .step").length, 2, "vista previa del procedimiento");
});

// ─────────────────────────── Accesibilidad ───────────────────────────────────

test("accesibilidad: sin infracciones de axe-core en todas las vistas (es y en)", async () => {
  const { doc, win, app } = await bootApp({ storage: memoryStorage() });
  for (const lang of ["es", "en"]) {
    if (lang === "en") {
      doc.querySelector('[data-lang="en"]').click();
      await tick();
    }
    for (const route of ["#/", "#/steps/publish-github-pages", "#/steps/first-practice-test-lab", "#/tests/docpages-basics", "#/validate"]) {
      await app.navigate(route);
      const violations = await runAxe(win);
      assert.deepEqual(violations, [], `${lang} ${route}: ${JSON.stringify(violations, null, 2)}`);
    }
  }
  assert.equal(doc.querySelectorAll("#view h1").length, 1);
  assert.ok(doc.querySelector("header.topbar") && doc.querySelector("main#main") && doc.querySelector("footer"));
  assert.equal(doc.querySelector(".skip-link").getAttribute("href"), "#main");
});

test("accesibilidad: Validar con errores y con vista previa, y prueba con resultado final", async () => {
  const { doc, win, app } = await bootApp({ storage: memoryStorage() });
  await app.navigate("#/validate");
  doc.querySelector('[data-template="lab-guide"]').click();
  assert.deepEqual(await runAxe(win), [], "con vista previa de una guía");
  const textarea = doc.getElementById("validator-text");
  textarea.value = textarea.value.replace('title="Preparar el entorno"', 'titulo="x"');
  textarea.dispatchEvent(new win.Event("input"));
  app.view.flush();
  assert.ok(doc.querySelectorAll(".issue").length >= 1);
  assert.deepEqual(await runAxe(win), [], "con errores");

  await app.navigate("#/tests/docpages-basics");
  const { question, choose, check } = quizHelpers(doc, win);
  choose("suffix", "mi-lab.test.md");
  check("suffix");
  buttonWith(question("validate-command"), /Ver pista/).click();
  const finish = doc.querySelector(".quiz-finish button");
  finish.click();
  finish.click();
  assert.equal(doc.activeElement, doc.getElementById("quiz-results-title"), "el foco va al resultado");
  const violations = await runAxe(win);
  assert.deepEqual(violations, [], JSON.stringify(violations, null, 2));
});

// ───────────────────────────── Otros casos ───────────────────────────────────

test("modo steps: procedimientos y guías; la ruta de pruebas queda deshabilitada", async () => {
  const { doc, app } = await bootApp({ mode: "steps" });
  assert.deepEqual([...doc.querySelectorAll(".doc-section")].map((s) => s.dataset.category), ["procedure", "lab-guide"]);
  assert.ok(doc.querySelector(".segmented"), "con dos categorías sigue habiendo filtro");
  await app.navigate("#/tests/docpages-basics");
  assert.match(doc.querySelector(".message-view").textContent, /deshabilitado/);
});

test("modo tests: solo pruebas de práctica", async () => {
  const { doc } = await bootApp({ mode: "tests" });
  assert.deepEqual([...doc.querySelectorAll(".doc-section")].map((s) => s.dataset.category), ["practice-test"]);
  assert.equal(doc.querySelector(".segmented"), null);
  assert.deepEqual(visibleCards(doc), ["docpages-basics"]);
});

test("documento inexistente y anclas a un paso o a una pregunta", async () => {
  const { doc, app } = await bootApp();
  await app.navigate("#/steps/no-existe");
  assert.match(doc.querySelector(".message-view h1").textContent, /Documento no encontrado/);
  await app.navigate("#/steps/publish-github-pages/enable-pages");
  assert.equal(doc.querySelector("#step-enable-pages .step__toggle").getAttribute("aria-expanded"), "true");
  assert.equal(doc.activeElement, doc.querySelector("#step-enable-pages .step__toggle"));
  await app.navigate("#/tests/docpages-basics/percent");
  assert.equal(doc.activeElement, doc.getElementById("question-title-percent"));
});

test("sin almacenamiento disponible la app sigue funcionando", async () => {
  const blocked = {
    getItem() {
      throw new Error("denied");
    },
    setItem() {
      throw new Error("denied");
    },
    removeItem() {
      throw new Error("denied");
    },
  };
  const { doc, win, app } = await bootApp({ storage: blocked, session: blocked });
  await app.navigate("#/steps/publish-github-pages");
  doc.querySelector('.task-check[data-key="prepare-branch#0"]').click();
  assert.equal(doc.querySelector(".doc-progress__value").textContent.replace(/\s/g, ""), "10%");
  await app.navigate("#/tests/docpages-basics");
  const { question, choose, check } = quizHelpers(doc, win);
  choose("suffix", "mi-lab.labguide.steps.md");
  check("suffix");
  assert.equal(question("suffix").dataset.result, "correct");
});
