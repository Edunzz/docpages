// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * Pruebas de integración: la aplicación completa en jsdom con los documentos
 * de ejemplo reales, incluida una auditoría de accesibilidad con axe-core.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { bootApp, siteFetch, jsonResponse, memoryStorage, runAxe, tick } from "./helpers.mjs";

const STEPS_KEY = "docpages:owner/docpages:publish-github-pages:1.0.0:steps";
const TEST_KEY = "docpages:owner/docpages:site-validation:1.0.0:test";

const visibleCards = (doc) => [...doc.querySelectorAll(".card")].filter((card) => !card.hidden).map((card) => card.dataset.slug);

test("portada: lista procedimientos y pruebas y detecta el repositorio desde la URL de Pages", async () => {
  const { doc, app } = await bootApp();
  assert.equal(app.repository.fullName, "owner/docpages");
  assert.equal(app.repository.source, "location");

  const chip = doc.getElementById("repo-chip");
  assert.equal(chip.hidden, false);
  assert.equal(chip.getAttribute("href"), "https://github.com/owner/docpages");
  assert.equal(chip.getAttribute("rel"), "noopener noreferrer");

  assert.ok(doc.querySelector(".doc-section--steps"), "sección de procedimientos");
  assert.ok(doc.querySelector(".doc-section--test"), "sección de pruebas");
  assert.deepEqual(visibleCards(doc).sort(), ["publish-github-pages", "site-validation"]);
  const viewRepo = [...doc.querySelectorAll(".hero__actions a")].find((a) => a.textContent.includes("Ver repositorio"));
  assert.equal(viewRepo.getAttribute("href"), "https://github.com/owner/docpages");
  assert.match(doc.querySelector(".site-footer__credit").textContent, /Jose Eduardo Romero Jimenez/);
  assert.equal(doc.title, "Documentación");
});

test("portada: la búsqueda filtra por título, etiqueta y contenido, sin distinguir tildes", async () => {
  const { doc, win } = await bootApp();
  const input = doc.getElementById("search");
  const search = (value) => {
    input.value = value;
    input.dispatchEvent(new win.Event("input"));
    return visibleCards(doc);
  };
  assert.deepEqual(search("accessibility"), ["site-validation"]);
  assert.deepEqual(search("Publicar"), ["publish-github-pages"]);
  assert.deepEqual(search("fork"), ["publish-github-pages"]);
  assert.deepEqual(search("CONCLUSION"), ["site-validation"]);
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
  assert.match(doc.querySelector("#section-steps").textContent, /Procedures/);
  assert.equal(doc.querySelector('[data-lang="en"]').getAttribute("aria-pressed"), "true");

  // Una visita nueva respeta la preferencia guardada aunque el navegador esté en español.
  const second = await bootApp({ storage, languages: ["es-MX"] });
  assert.equal(second.doc.documentElement.lang, "en");
  assert.match(second.doc.querySelector(".card--steps .card__link").textContent, /Publish documentation/);
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

  assert.equal(doc.querySelectorAll(".stepper__item").length, 5);
  assert.equal(doc.querySelectorAll(".step").length, 5);
  assert.equal(doc.querySelectorAll(".substep").length, 4);
  assert.equal(doc.querySelector(".doc-progress__value").textContent.replace(/\s/g, ""), "0%");

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

test("prueba: veredicto, resumen, filtro por estado, evidencia y re-ejecución local", async () => {
  const storage = memoryStorage();
  const { doc, win, app } = await bootApp({ storage });
  await app.navigate("#/tests/site-validation");

  assert.match(doc.querySelector(".verdict__value").textContent, /Parcial/);
  const stats = Object.fromEntries([...doc.querySelectorAll(".stat")].map((s) => [s.querySelector(".stat__label").textContent, s.querySelector(".stat__value").textContent]));
  assert.deepEqual(stats, { Aprobados: "4", Fallidos: "0", Bloqueados: "0", Parciales: "0", Total: "5" });
  assert.equal(doc.querySelector(".notice--warning"), null, "el summary declarado coincide con los casos");

  // Evidencia: imagen relativa resuelta contra el documento y enlace con token.
  const img = doc.querySelector(".evidence--image img");
  assert.equal(img.getAttribute("src"), "https://owner.github.io/docpages/documents/tests/evidence/home-overview.svg");
  const pagesLink = doc.querySelector("#case-pages-deploy .evidence__link");
  assert.equal(pagesLink.getAttribute("href"), "https://owner.github.io/docpages/");
  assert.equal(pagesLink.getAttribute("target"), "_blank");

  // Campos Esperado / Obtenido.
  assert.equal(doc.querySelectorAll("#case-home-loads .case__field").length, 2);

  // Filtro.
  doc.querySelector('.chip--filter[data-filter="not-run"]').click();
  const visible = [...doc.querySelectorAll(".case")].filter((c) => !c.hidden).map((c) => c.dataset.id);
  assert.deepEqual(visible, ["pages-deploy"]);
  assert.equal(JSON.parse(storage.getItem(TEST_KEY)).filter, "not-run");

  // Re-ejecución local.
  const select = doc.getElementById("local-pages-deploy");
  select.value = "passed";
  select.dispatchEvent(new win.Event("change"));
  assert.deepEqual(JSON.parse(storage.getItem(TEST_KEY)).local, { "pages-deploy": "passed" });
  assert.match(doc.querySelector(".local-summary").textContent, /1 de 5/);

  // El reinicio solo borra el estado local.
  const reset = doc.querySelector(".btn--reset");
  reset.click();
  reset.click();
  assert.equal(storage.getItem(TEST_KEY), null);
  assert.equal([...doc.querySelectorAll(".case")].filter((c) => !c.hidden).length, 5);
  assert.match(doc.querySelector(".verdict__value").textContent, /Parcial/);
});

test("accesibilidad: sin infracciones de axe-core en portada, procedimiento y prueba (es y en)", async () => {
  const { doc, win, app } = await bootApp();
  for (const lang of ["es", "en"]) {
    if (lang === "en") {
      doc.querySelector('[data-lang="en"]').click();
      await tick();
    }
    for (const route of ["#/", "#/steps/publish-github-pages", "#/tests/site-validation"]) {
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

test("API de GitHub no disponible: se conserva el manifiesto del despliegue y se informa", async () => {
  const fetchImpl = siteFetch({
    routes: {
      "https://api.github.com/": () => {
        throw new TypeError("Failed to fetch");
      },
    },
  });
  const { doc, app } = await bootApp({ fetchImpl });
  const refresh = [...doc.querySelectorAll(".hero__actions button")].find((b) => /Actualizar/.test(b.textContent));
  refresh.click();
  await tick(80);
  assert.match(doc.querySelector(".notice--error").textContent, /No hay conexión con GitHub/);
  assert.equal(app.manifest.source, "deployment");
  assert.equal(visibleCards(doc).length, 2);
});

test("API de GitHub con límite de solicitudes: mensaje específico y fallback", async () => {
  const fetchImpl = siteFetch({
    routes: {
      "https://api.github.com/": () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" } }),
    },
  });
  const { doc, app } = await bootApp({ fetchImpl });
  [...doc.querySelectorAll(".hero__actions button")].find((b) => /Actualizar/.test(b.textContent)).click();
  await tick(80);
  assert.match(doc.querySelector(".notice--error").textContent, /límite de solicitudes/);
  assert.equal(app.manifest.source, "deployment");
});

test("actualización en vivo: lee el árbol público, valida y cambia la fuente durante la sesión", async () => {
  const deployedFetch = siteFetch();
  const session = memoryStorage();
  const fetchImpl = siteFetch({
    routes: {
      "https://api.github.com/repos/owner/docpages/git/trees/": () =>
        jsonResponse({ sha: "abc", truncated: false, tree: [{ path: "documents/steps/example.steps.md", type: "blob" }, { path: "documents/tests/example.test.md", type: "blob" }, { path: "README.md", type: "blob" }] }),
      "https://api.github.com/repos/owner/docpages": () => jsonResponse({ name: "docpages", owner: { login: "Owner" }, private: false, default_branch: "main" }),
      "https://raw.githubusercontent.com/owner/docpages/refs/heads/main/": (url) => deployedFetch(url.href.replace("https://raw.githubusercontent.com/owner/docpages/refs/heads/main/", "https://owner.github.io/docpages/")),
    },
  });
  const { doc, app } = await bootApp({ fetchImpl, session });
  [...doc.querySelectorAll(".hero__actions button")].find((b) => /Actualizar/.test(b.textContent)).click();
  await tick(120);
  assert.match(doc.querySelector(".notice--success").textContent, /Se cargaron 2 documentos/);
  assert.equal(app.manifest.source, "github");
  assert.match(doc.querySelector(".hero__source").textContent, /En vivo desde GitHub/);
  assert.ok(session.getItem("docpages:owner/docpages:live-manifest"));

  await app.navigate("#/steps/publish-github-pages");
  assert.equal(doc.querySelectorAll(".step").length, 5, "el documento se lee desde raw.githubusercontent.com");
  assert.ok(fetchImpl.calls.some((u) => u.startsWith("https://raw.githubusercontent.com/owner/docpages/refs/heads/main/documents/steps/")));
});

test("modo steps: solo procedimientos; la ruta de pruebas queda deshabilitada", async () => {
  const { doc, app } = await bootApp({ mode: "steps" });
  assert.ok(doc.querySelector(".doc-section--steps"));
  assert.equal(doc.querySelector(".doc-section--test"), null);
  assert.equal(doc.querySelector(".segmented"), null);
  await app.navigate("#/tests/site-validation");
  assert.match(doc.querySelector(".message-view").textContent, /deshabilitado/);
});

test("modo tests: solo pruebas", async () => {
  const { doc } = await bootApp({ mode: "tests" });
  assert.equal(doc.querySelector(".doc-section--steps"), null);
  assert.deepEqual(visibleCards(doc), ["site-validation"]);
});

test("rutas: funciona en la raíz de un sitio de usuario y en local sin repositorio", async () => {
  const userSite = await bootApp({ url: "https://owner.github.io/" });
  assert.equal(userSite.app.repository.fullName, "owner/owner.github.io");
  await userSite.app.navigate("#/steps/publish-github-pages");
  assert.equal(userSite.doc.querySelectorAll(".step").length, 5);

  const local = await bootApp({ url: "http://localhost:8080/" });
  assert.equal(local.app.repository, null);
  assert.equal(local.doc.getElementById("repo-chip").hidden, true);
  await local.app.navigate("#/steps/publish-github-pages");
  // {{repo_url}} sin resolver: el enlace inicial queda deshabilitado, no roto.
  assert.ok(local.doc.querySelector(".doc-links .chip--disabled"));
  assert.ok(![...local.doc.querySelectorAll(".steps-content a")].some((a) => a.getAttribute("href").startsWith("/settings")));
});

test("documento inexistente y ancla a un paso", async () => {
  const { doc, app } = await bootApp();
  await app.navigate("#/steps/no-existe");
  assert.match(doc.querySelector(".message-view h1").textContent, /Documento no encontrado/);
  await app.navigate("#/steps/publish-github-pages/enable-pages");
  assert.equal(doc.querySelector("#step-enable-pages .step__toggle").getAttribute("aria-expanded"), "true");
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
  const { doc, app } = await bootApp({ storage: blocked, session: blocked });
  await app.navigate("#/steps/publish-github-pages");
  doc.querySelector('.task-check[data-key="prepare-branch#0"]').click();
  assert.equal(doc.querySelector(".doc-progress__value").textContent.replace(/\s/g, ""), "10%");
});
