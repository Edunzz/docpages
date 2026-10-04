// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * Pruebas de integración: la aplicación completa en jsdom con los documentos
 * de ejemplo reales, incluida una auditoría de accesibilidad con axe-core.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT, bootApp, siteFetch, jsonResponse, memoryStorage, runAxe, tick } from "./helpers.mjs";
import { VALID_TEST, withFrontMatter, makeSite, quizWith } from "./fixtures.mjs";
import { generateManifest } from "../scripts/build-manifest.mjs";

const STEPS_KEY = "docpages:owner/docpages:publish-github-pages:1.1.0:steps";
const QUIZ_KEY = "docpages:owner/docpages:docpages-basics:1.0.0:test";
const RAW = "https://raw.githubusercontent.com/owner/docpages/refs/heads/main/";
const PAGES = "https://owner.github.io/docpages/";

const visibleCards = (doc) => [...doc.querySelectorAll(".card")].filter((card) => !card.hidden).map((card) => card.dataset.slug);
const buttonWith = (root, pattern) => [...root.querySelectorAll("button")].find((b) => pattern.test(b.textContent));

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

test("portada: tres categorías y repositorio detectado desde la URL de Pages", async () => {
  const { doc, app } = await bootApp();
  assert.equal(app.repository.fullName, "owner/docpages");
  assert.equal(app.repository.source, "location");

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

  doc.querySelector('.segmented__option[data-category="lab-guide"]').click();
  assert.deepEqual(visibleCards(doc), ["first-practice-test-lab"]);
  assert.equal(doc.querySelector(".doc-section--procedure").hidden, true);

  const viewRepo = [...doc.querySelectorAll(".hero__actions a")].find((a) => a.textContent.includes("Ver repositorio"));
  assert.equal(viewRepo.getAttribute("href"), "https://github.com/owner/docpages");
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
  assert.deepEqual(search("master"), ["first-practice-test-lab"]);
  assert.deepEqual(search("zzz-sin-resultados"), []);
  assert.match(doc.getElementById("search-status").textContent, /0 resultados/);
});

test("idioma: el selector cambia la interfaz, <html lang> y persiste la preferencia", async () => {
  const storage = memoryStorage();
  const { doc, win } = await bootApp({ storage });
  assert.equal(doc.documentElement.lang, "es");
  doc.querySelector('[data-lang="en"]').click();
  await tick();
  assert.equal(doc.documentElement.lang, "en");
  assert.equal(storage.getItem("docpages:lang"), "en");
  assert.equal(doc.getElementById("brand-title").textContent, "Documentation");
  assert.match(doc.querySelector("#section-procedure").textContent, /Procedures/);
  assert.match(doc.querySelector("#section-lab-guide").textContent, /Lab guides/);
  assert.match(doc.querySelector("#section-practice-test").textContent, /Practice tests/);
  assert.equal(doc.querySelector('[data-lang="en"]').getAttribute("aria-pressed"), "true");

  // Una visita nueva respeta la preferencia guardada aunque el navegador esté en español.
  const second = await bootApp({ storage, languages: ["es-MX"] });
  assert.equal(second.doc.documentElement.lang, "en");
  assert.match(second.doc.querySelector(".card--procedure .card__link").textContent, /Publish documentation/);
  win.close();
});

test("idioma: sin preferencia se usa el del navegador y, si no está soportado, español", async () => {
  assert.equal((await bootApp({ languages: ["en-GB"] })).doc.documentElement.lang, "en");
  assert.equal((await bootApp({ languages: ["fr-FR", "de"] })).doc.documentElement.lang, "es");
});

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

  // Enlaces iniciales con tokens resueltos al repositorio detectado.
  const links = [...doc.querySelectorAll(".doc-links a")].map((a) => a.getAttribute("href"));
  assert.deepEqual(links, ["https://github.com/owner/docpages", "https://github.com/owner/docpages/settings/pages", "https://docs.github.com/pages"]);

  // Una casilla = 1 de 10 hojas.
  const first = doc.querySelector('.task-check[data-key="prepare-branch#0"]');
  first.click();
  assert.equal(doc.querySelector(".doc-progress__value").textContent.replace(/\s/g, ""), "10%");
  assert.deepEqual(JSON.parse(storage.getItem(STEPS_KEY)).done, ["prepare-branch#0"]);

  // Completar un paso con subpasos marca todas sus casillas y avanza al siguiente.
  doc.querySelector("#step-prepare .step__actions .btn--primary").click();
  const saved = JSON.parse(storage.getItem(STEPS_KEY));
  assert.deepEqual(saved.done, ["prepare-branch#0", "prepare-branch#1", "prepare-files#0", "prepare-files#1"]);
  assert.equal(saved.summary.percent, 40);
  assert.equal(saved.current, "validate");
  assert.equal(doc.querySelector("#step-prepare").dataset.state, "done");
  assert.equal(doc.querySelector('.stepper__link[data-id="validate"]').getAttribute("aria-current"), "step");

  // Un subpaso sin casillas es una hoja.
  doc.querySelector("#substep-create-file .substep__actions button").click();
  assert.equal(JSON.parse(storage.getItem(STEPS_KEY)).summary.done, 5);

  // Persistencia: una visita nueva restaura el estado.
  const again = await bootApp({ storage });
  await again.app.navigate("#/steps/publish-github-pages");
  assert.equal(again.doc.querySelector('.task-check[data-key="prepare-files#1"]').checked, true);
  assert.equal(again.doc.querySelector(".doc-progress__value").textContent.replace(/\s/g, ""), "50%");

  // Reinicio en dos pasos.
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

test("guía de laboratorio: objetivos, requisitos, duración, nivel y progreso propio", async () => {
  const storage = memoryStorage();
  const { doc, app } = await bootApp({ storage });
  await app.navigate("#/steps/first-practice-test-lab");

  assert.match(doc.querySelector(".doc-header .eyebrow").textContent, /Guía de laboratorio/);
  assert.ok(doc.querySelector('.breadcrumb a[href="#/?type=lab-guide"]'));
  assert.equal(doc.querySelectorAll(".brief--objectives li").length, 3);
  assert.equal(doc.querySelectorAll(".brief--prerequisites li").length, 2);
  assert.match(doc.querySelector(".facts").textContent, /30 minutos/);
  assert.match(doc.querySelector(".doc-progress").textContent, /Progreso del laboratorio/);
  assert.equal(doc.querySelector(".stepper").getAttribute("aria-label"), "Pasos del laboratorio");

  // Un enlace inicial a otro documento se convierte en ruta interna.
  const quizLink = [...doc.querySelectorAll(".doc-links a")].find((a) => a.textContent.includes("Prueba de ejemplo"));
  assert.equal(quizLink.getAttribute("href"), "#/tests/docpages-basics");

  for (const step of doc.querySelectorAll(".step")) step.querySelector(".step__actions .btn--primary").click();
  assert.equal(doc.querySelector(".completion").hidden, false);
  assert.match(doc.querySelector(".completion__title").textContent, /Laboratorio completado/);

  await app.navigate("#/");
  assert.match(doc.querySelector('.card[data-slug="first-practice-test-lab"] .card__status-text').textContent, /100/);
});

test("prueba de práctica: responder, comprobar, pista, explicación, puntuación y resultado", async () => {
  const storage = memoryStorage();
  const { doc, win, app } = await bootApp({ storage });
  await app.navigate("#/tests/docpages-basics");
  const { question, choose, type, check } = quizHelpers(doc, win);

  assert.match(doc.querySelector(".doc-header .eyebrow").textContent, /Prueba de práctica/);
  assert.deepEqual([...doc.querySelectorAll(".question")].map((s) => s.dataset.type), ["single", "true-false", "multiple", "text", "number", "order", "match", "single"]);
  assert.match(doc.querySelector(".facts").textContent, /70\s?%/);

  // Comprobar sin responder: aviso y nada se guarda como comprobado.
  check("suffix");
  assert.equal(question("suffix").querySelector(".question__notice").hidden, false);

  // Opción única correcta: se bloquea y aparece la explicación.
  choose("suffix", ".steps.md");
  check("suffix");
  assert.equal(question("suffix").dataset.result, "correct");
  assert.match(question("suffix").querySelector(".question__feedback").textContent, /¡Correcto!/);
  assert.doesNotMatch(question("suffix").querySelector(".question__feedback").textContent, /null|undefined/);
  assert.equal(question("suffix").querySelector(".question__explanation").hidden, false);
  assert.ok(question("suffix").querySelector("input").disabled);

  // Verdadero o falso incorrecta: se marcan la elegida y la correcta; se puede volver a responder.
  choose("storage", "Verdadero");
  check("storage");
  assert.equal(question("storage").dataset.result, "incorrect");
  assert.match(question("storage").querySelector(".choice.is-wrong").textContent, /Verdadero.*tu respuesta, incorrecta/);
  assert.match(question("storage").querySelector(".choice.is-correct").textContent, /Falso.*respuesta correcta/);
  buttonWith(question("storage"), /Volver a responder/).click();
  choose("storage", "Falso");
  check("storage");
  assert.equal(question("storage").dataset.result, "correct");

  // Opción múltiple.
  choose("safe-links", "https://example.com");
  choose("safe-links", "mailto:team@example.com");
  check("safe-links");
  assert.equal(question("safe-links").dataset.result, "correct");

  // Respuesta corta: sin importar mayúsculas ni el punto final; la pista se despliega.
  const hint = buttonWith(question("validate-command"), /Ver pista/);
  hint.click();
  assert.equal(hint.getAttribute("aria-expanded"), "true");
  assert.equal(question("validate-command").querySelector(".question__hint").hidden, false);
  type("validate-command", "NPM run validate.");
  check("validate-command");
  assert.equal(question("validate-command").dataset.result, "correct");

  // Numérica incorrecta: muestra la respuesta correcta.
  type("percent", "67");
  check("percent");
  assert.equal(question("percent").dataset.result, "incorrect");
  assert.match(question("percent").querySelector(".question__feedback").textContent, /Respuesta correcta: 66/);

  // Ordenar con los botones de subir.
  const order = question("workflow-order");
  const arrangement = () => [...order.querySelectorAll(".order__item")].map((li) => Number(li.dataset.item));
  assert.notDeepEqual(arrangement(), [0, 1, 2, 3], "empieza desordenada");
  for (let guard = 0; guard < 20 && arrangement().some((v, i) => v !== i); guard++) {
    const current = arrangement();
    const i = current.findIndex((v, idx) => idx > 0 && current[idx - 1] > v);
    order.querySelector(`button[data-item="${current[i]}"][data-dir="up"]`).click();
  }
  assert.deepEqual(arrangement(), [0, 1, 2, 3]);
  check("workflow-order");
  assert.equal(order.dataset.result, "correct");

  // Relacionar con las listas desplegables.
  question("directives").querySelectorAll("select").forEach((select, i) => {
    select.value = String(i);
    select.dispatchEvent(new win.Event("change"));
  });
  check("directives");
  assert.equal(question("directives").dataset.result, "correct");
  assert.equal(JSON.parse(storage.getItem(QUIZ_KEY)).summary.score, 8);

  // La última pregunta completa la prueba: aparece el resultado.
  choose("find-the-error", "No marca la respuesta correcta con [x].");
  check("find-the-error");
  const results = doc.querySelector(".quiz-results");
  assert.equal(results.hidden, false);
  assert.match(results.textContent, /90\s?%/);
  assert.match(results.textContent, /Aprobado/);
  assert.deepEqual([...results.querySelectorAll(".quiz-results__review a")].map((a) => a.getAttribute("href")), ["#/tests/docpages-basics/percent"]);
  const saved = JSON.parse(storage.getItem(QUIZ_KEY));
  assert.deepEqual([saved.attempts, saved.best, saved.summary.passed], [1, 90, true]);

  // La portada muestra el último resultado.
  await app.navigate("#/");
  const card = doc.querySelector('.card[data-slug="docpages-basics"]');
  assert.match(card.textContent, /Aprobado/);
  assert.match(card.textContent, /Último resultado: 90/);

  // Al volver se conserva; «Intentar de nuevo» limpia las respuestas y conserva el mejor resultado.
  await app.navigate("#/tests/docpages-basics");
  assert.equal(doc.querySelector(".quiz-results").hidden, false);
  buttonWith(doc.querySelector(".quiz-results"), /Intentar de nuevo/).click();
  const retried = JSON.parse(storage.getItem(QUIZ_KEY));
  assert.deepEqual([retried.answers, retried.best, retried.attempts], [{}, 90, 1]);
  assert.equal(doc.querySelector(".quiz-results").hidden, true);
  assert.equal(question("suffix").querySelector("input").disabled, false);
  assert.match(doc.querySelector(".quiz-score__best").textContent, /Mejor resultado: 90/);

  // «Reiniciar» lo borra todo.
  const reset = doc.querySelector(".btn--reset");
  reset.click();
  reset.click();
  assert.equal(storage.getItem(QUIZ_KEY), null);
});

test("prueba de práctica: el idioma cambia preguntas y opciones sin perder las respuestas", async () => {
  const storage = memoryStorage();
  const { doc, win, app } = await bootApp({ storage });
  await app.navigate("#/tests/docpages-basics");
  const { question, choose } = quizHelpers(doc, win);
  choose("find-the-error", "No marca la respuesta correcta con [x].");
  doc.querySelector('[data-lang="en"]').click();
  await tick();
  assert.match(question("find-the-error").querySelector(".question__prompt").textContent, /This question fails validation/);
  const chosen = [...question("find-the-error").querySelectorAll("label.choice")].find((l) => l.querySelector("input").checked);
  assert.match(chosen.textContent, /It does not mark the correct answer/);
  assert.match(question("storage").textContent, /True/);
});

test("prueba con corrección al final: sin «Comprobar»; «Finalizar» pide confirmar si faltan respuestas", async () => {
  const root = await makeSite({ "documents/tests/prueba-x.test.md": withFrontMatter(VALID_TEST, "feedback", '"end"') }, { copySite: true });
  await writeFile(path.join(root, "documents.manifest.json"), JSON.stringify(await generateManifest({ root, env: {} })));
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

test("accesibilidad: sin infracciones de axe-core en todas las vistas (es y en)", async () => {
  const { doc, win, app } = await bootApp();
  for (const lang of ["es", "en"]) {
    if (lang === "en") {
      doc.querySelector('[data-lang="en"]').click();
      await tick();
    }
    for (const route of ["#/", "#/steps/publish-github-pages", "#/steps/first-practice-test-lab", "#/tests/docpages-basics"]) {
      await app.navigate(route);
      const violations = await runAxe(win);
      assert.deepEqual(violations, [], `${lang} ${route}: ${JSON.stringify(violations, null, 2)}`);
    }
  }
  // Estructura básica: un solo h1 visible por vista, landmarks y enlace de salto.
  assert.equal(doc.querySelectorAll("#view h1").length, 1);
  assert.ok(doc.querySelector("header.topbar") && doc.querySelector("main#main") && doc.querySelector("footer"));
  assert.equal(doc.querySelector(".skip-link").getAttribute("href"), "#main");
});

test("accesibilidad: prueba con preguntas corregidas, pista abierta y resultado final", async () => {
  const { doc, win, app } = await bootApp();
  await app.navigate("#/tests/docpages-basics");
  const { question, choose, check } = quizHelpers(doc, win);
  choose("suffix", ".test.md");
  check("suffix");
  buttonWith(question("validate-command"), /Ver pista/).click();
  const finish = doc.querySelector(".quiz-finish button");
  finish.click();
  assert.deepEqual(await runAxe(win), [], "con confirmación pendiente");
  finish.click();
  assert.equal(doc.querySelector(".quiz-results").hidden, false);
  assert.equal(doc.activeElement, doc.getElementById("quiz-results-title"), "el foco va al resultado");
  const violations = await runAxe(win);
  assert.deepEqual(violations, [], JSON.stringify(violations, null, 2));
});

test("API de GitHub no disponible: se conserva el manifiesto del despliegue y se informa", async () => {
  const fetchImpl = siteFetch({
    routes: {
      "https://api.github.com/": () => {
        throw new TypeError("Failed to fetch");
      },
    },
  });
  const { doc, app } = await bootApp({ fetchImpl });
  buttonWith(doc.querySelector(".hero__actions"), /Actualizar/).click();
  await tick(80);
  assert.match(doc.querySelector(".notice--error").textContent, /No hay conexión con GitHub/);
  assert.equal(app.manifest.source, "deployment");
  assert.equal(visibleCards(doc).length, 3);
});

test("API de GitHub con límite de solicitudes: mensaje específico y fallback", async () => {
  const fetchImpl = siteFetch({
    routes: {
      "https://api.github.com/": () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" } }),
    },
  });
  const { doc, app } = await bootApp({ fetchImpl });
  buttonWith(doc.querySelector(".hero__actions"), /Actualizar/).click();
  await tick(80);
  assert.match(doc.querySelector(".notice--error").textContent, /límite de solicitudes/);
  assert.equal(app.manifest.source, "deployment");
});

const liveTree = (paths) => jsonResponse({ sha: "abc", truncated: false, tree: paths.map((p) => ({ path: p, type: "blob" })) });
const repoInfo = () => jsonResponse({ name: "docpages", owner: { login: "owner" }, private: false, default_branch: "main" });

test("actualización en vivo: lee el árbol público, valida y cambia la fuente durante la sesión", async () => {
  const deployedFetch = siteFetch();
  const session = memoryStorage();
  const fetchImpl = siteFetch({
    routes: {
      "https://api.github.com/repos/owner/docpages/git/trees/": () =>
        liveTree(["documents/steps/publish-github-pages.steps.md", "documents/steps/first-practice-test-lab.steps.md", "documents/tests/docpages-basics.test.md", "README.md"]),
      "https://api.github.com/repos/owner/docpages": repoInfo,
      [RAW]: (url) => deployedFetch(url.href.replace(RAW, PAGES)),
    },
  });
  const { doc, app } = await bootApp({ fetchImpl, session });
  buttonWith(doc.querySelector(".hero__actions"), /Actualizar/).click();
  await tick(150);
  assert.match(doc.querySelector(".notice--success").textContent, /Se cargaron 3 documentos/);
  assert.equal(app.manifest.source, "github");
  assert.match(doc.querySelector(".hero__source").textContent, /En vivo desde GitHub/);
  assert.ok(session.getItem("docpages:owner/docpages:live-manifest"));
  assert.equal(doc.querySelector(".invalid-docs"), null);

  await app.navigate("#/steps/publish-github-pages");
  assert.equal(doc.querySelectorAll(".step").length, 5, "el documento se lee desde raw.githubusercontent.com");
  assert.ok(fetchImpl.calls.some((u) => u.startsWith(`${RAW}documents/steps/`)));
});

test("actualización en vivo: lo que no sigue el formato se muestra con sus errores y su línea", async () => {
  const deployedFetch = siteFetch();
  const broken = quizWith(':::question type="single"\n¿Cuánto es 2 + 2?\n- [ ] 3\n- [ ] 4\n:::');
  const fetchImpl = siteFetch({
    routes: {
      "https://api.github.com/repos/owner/docpages/git/trees/": () => liveTree(["documents/steps/publish-github-pages.steps.md", "documents/tests/roto.test.md", "documents/notas.md", "documents/tests/img/x.png"]),
      "https://api.github.com/repos/owner/docpages": repoInfo,
      [`${RAW}documents/tests/roto.test.md`]: () => new Response(broken),
      [`${RAW}documents/notas.md`]: () => new Response("# Notas sueltas\n"),
      [RAW]: (url) => deployedFetch(url.href.replace(RAW, PAGES)),
    },
  });
  const { doc, app } = await bootApp({ fetchImpl });
  buttonWith(doc.querySelector(".hero__actions"), /Actualizar/).click();
  await tick(150);

  assert.match(doc.querySelector(".notice--error").textContent, /2 documentos no siguen el formato/);
  const invalid = doc.querySelector(".invalid-docs");
  assert.ok(invalid, "sección de documentos con errores");
  assert.deepEqual([...invalid.querySelectorAll(".invalid-doc__path code")].map((c) => c.textContent), ["documents/notas.md", "documents/tests/roto.test.md"]);
  assert.match(invalid.textContent, /El archivo no sigue el formato/);
  assert.match(invalid.textContent, /línea 10/);
  assert.match(invalid.textContent, /exactamente una opción correcta/);
  assert.equal(invalid.querySelector(".invalid-doc__source").getAttribute("href"), "https://github.com/owner/docpages/blob/main/documents/notas.md");
  assert.deepEqual(visibleCards(doc), ["publish-github-pages"], "los documentos con errores no se publican como tarjetas");
  assert.deepEqual(await runAxe(doc.defaultView), []);

  await app.navigate("#/tests/prueba-y");
  assert.match(doc.querySelector(".message-view h1").textContent, /no tiene el formato correcto/);
  assert.match(doc.querySelector(".message-view .error-list").textContent, /documents\/tests\/roto\.test\.md:10/);
});

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

test("rutas: funciona en la raíz de un sitio de usuario y en local sin repositorio", async () => {
  const userSite = await bootApp({ url: "https://owner.github.io/" });
  assert.equal(userSite.app.repository.fullName, "owner/owner.github.io");
  await userSite.app.navigate("#/steps/publish-github-pages");
  assert.equal(userSite.doc.querySelectorAll(".step").length, 5);

  // En el CI el manifiesto se genera con GITHUB_REPOSITORY: aquí se simula uno local (sin repositorio).
  const localManifest = { ...JSON.parse(await readFile(path.join(ROOT, "documents.manifest.json"), "utf8")), repository: null };
  const local = await bootApp({ url: "http://localhost:8080/", fetchImpl: siteFetch({ base: "http://localhost:8080/", routes: { "http://localhost:8080/documents.manifest.json": () => jsonResponse(localManifest) } }) });
  assert.equal(local.app.repository, null);
  assert.equal(local.doc.getElementById("repo-chip").hidden, true);
  await local.app.navigate("#/steps/publish-github-pages");
  // {{repo_url}} sin resolver: el enlace inicial queda deshabilitado, no roto.
  assert.ok(local.doc.querySelector(".doc-links .chip--disabled"));
  assert.ok(![...local.doc.querySelectorAll(".steps-content a")].some((a) => a.getAttribute("href").startsWith("/settings")));
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
  choose("suffix", ".steps.md");
  check("suffix");
  assert.equal(question("suffix").dataset.result, "correct");
});
