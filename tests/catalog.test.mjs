// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * Descubrimiento de documentos sin manifiesto: listado de carpetas en local y
 * árbol de la API de GitHub (con caché de 10 minutos) en Pages.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, siteFetch, memoryStorage } from "./helpers.mjs";
import { VALID_STEPS, VALID_TEST, makeSite } from "./fixtures.mjs";
import { buildCatalog, listFromServer, hrefsOf, CATALOG_TTL_MS } from "../assets/js/catalog.js";
import { isCandidatePath } from "../assets/js/documents.js";
import { createStore } from "../assets/js/storage.js";

const isCandidate = (p) => isCandidatePath(p, "all");
const LOCAL = "http://localhost:8000/";
const FILES = {
  "documents/steps/a.procedure.steps.md": VALID_STEPS,
  "documents/steps/sub/lab.labguide.steps.md": VALID_STEPS.replace('slug: "pasos-prueba"', 'slug: "lab"'),
  "documents/tests/prueba-x.test.md": VALID_TEST,
  "documents/tests/img/foto.png": "png",
};

test("enlaces de un listado HTML con comillas dobles, simples o sin comillas", () => {
  assert.deepEqual(hrefsOf(`<a href="a/">a</a><a href='b.md'>b</a><a href=c.md>c</a><a HREF="?C=N&amp;O=D">x</a>`), ["a/", "b.md", "c.md", "?C=N&O=D"]);
});

for (const style of ["python", "serve-index"]) {
  test(`listado de carpetas al estilo ${style}: recursivo, solo Markdown y sin salir de documents/`, async () => {
    const root = await makeSite(FILES);
    const fetchImpl = siteFetch({ base: LOCAL, root, listing: style });
    const listed = await listFromServer({ baseUrl: LOCAL, fetchImpl, isCandidate });
    assert.deepEqual(listed, { available: true, paths: ["documents/steps/a.procedure.steps.md", "documents/steps/sub/lab.labguide.steps.md", "documents/tests/prueba-x.test.md"] });
    assert.ok(!fetchImpl.calls.some((url) => !url.startsWith(`${LOCAL}documents/`)), "no lee fuera de documents/");
  });
}

test("listado bajo /{repositorio}/ y servidor sin listado de carpetas", async () => {
  const root = await makeSite(FILES);
  const base = "http://localhost:5500/docpages/";
  const listed = await listFromServer({ baseUrl: base, fetchImpl: siteFetch({ base, root, listing: "serve-index" }), isCandidate });
  assert.equal(listed.paths.length, 3);
  assert.deepEqual(await listFromServer({ baseUrl: LOCAL, fetchImpl: siteFetch({ base: LOCAL, root, listing: false }), isCandidate }), { available: false, paths: [] });
});

test("catálogo local: analiza cada archivo y marca los inválidos y los slugs repetidos", async () => {
  const root = await makeSite({
    ...FILES,
    "documents/notas.md": "# Notas sueltas\n",
    "documents/steps/copia.procedure.steps.md": VALID_STEPS,
  });
  const catalog = await buildCatalog({ source: "local", baseUrl: LOCAL, fetchImpl: siteFetch({ base: LOCAL, root }), store: createStore(null), cacheKey: "k", isCandidate, analyze });
  const summary = catalog.documents.map((d) => [d.path, Boolean(d.invalid)]);
  assert.deepEqual(summary, [
    ["documents/notas.md", true],
    ["documents/steps/a.procedure.steps.md", true],
    ["documents/steps/copia.procedure.steps.md", true],
    ["documents/steps/sub/lab.labguide.steps.md", false],
    ["documents/tests/prueba-x.test.md", false],
  ]);
  const duplicate = catalog.documents.find((d) => d.path === "documents/steps/a.procedure.steps.md");
  assert.match(duplicate.errors[0].message, /slug duplicado «pasos-prueba»/);
  assert.equal(duplicate.slug, "pasos-prueba");
  assert.equal(catalog.documents.find((d) => d.path.endsWith("lab.labguide.steps.md")).category, "lab-guide");
  assert.equal(catalog.texts.get("documents/tests/prueba-x.test.md"), VALID_TEST, "el texto queda en memoria para no pedirlo dos veces");
});

test("catálogo de GitHub: guarda la lista 10 minutos y, si la API falla, usa la guardada", async () => {
  const root = await makeSite(FILES);
  const base = "https://owner.github.io/docpages/";
  const store = createStore(memoryStorage());
  let clock = 1_000_000;
  const options = (fetchImpl, extra = {}) => ({ source: "github", repository: { owner: "owner", name: "docpages" }, baseUrl: base, fetchImpl, store, cacheKey: "cache", isCandidate, analyze, now: () => clock, ...extra });
  const treeCalls = (f) => f.calls.filter((u) => u.includes("/git/trees/")).length;

  const first = siteFetch({ base, root });
  const catalog = await buildCatalog(options(first));
  assert.equal(catalog.documents.filter((d) => !d.invalid).length, 3);
  assert.equal(treeCalls(first), 1);
  assert.deepEqual(store.getJSON("cache").paths.length, 3);

  clock += CATALOG_TTL_MS - 1;
  const second = siteFetch({ base, root });
  await buildCatalog(options(second));
  assert.equal(treeCalls(second), 0, "dentro de los 10 minutos no se consulta la API");

  const refreshed = siteFetch({ base, root });
  await buildCatalog(options(refreshed, { refresh: true }));
  assert.equal(treeCalls(refreshed), 1, "«Actualizar» ignora la caché");

  clock += CATALOG_TTL_MS + 1;
  const limited = siteFetch({ base, root, routes: { "https://api.github.com/": () => new Response("{}", { status: 403, headers: { "x-ratelimit-remaining": "0" } }) } });
  const stale = await buildCatalog(options(limited));
  assert.equal(stale.error.code, "rate-limited");
  assert.equal(stale.stale, true);
  assert.equal(stale.documents.filter((d) => !d.invalid).length, 3, "se muestran los documentos de la lista guardada");

  const empty = await buildCatalog(options(limited, { store: createStore(null) }));
  assert.deepEqual([empty.error.code, empty.stale, empty.documents.length], ["rate-limited", false, 0]);
});

test("catálogo de GitHub: un archivo aún no publicado en Pages se lee de raw.githubusercontent.com", async () => {
  const root = await makeSite(FILES);
  const base = "https://owner.github.io/docpages/";
  const fetchImpl = siteFetch({
    base,
    root,
    routes: {
      [`${base}documents/tests/prueba-x.test.md`]: () => new Response("Not found", { status: 404 }),
      "https://raw.githubusercontent.com/owner/docpages/HEAD/documents/tests/prueba-x.test.md": () => new Response(VALID_TEST),
      "https://raw.githubusercontent.com/": () => new Response("Not found", { status: 404 }),
    },
  });
  const catalog = await buildCatalog({ source: "github", repository: { owner: "owner", name: "docpages" }, baseUrl: base, fetchImpl, store: createStore(null), cacheKey: "k", isCandidate, analyze });
  assert.equal(catalog.documents.find((d) => d.path === "documents/tests/prueba-x.test.md").invalid, undefined);

  const missing = siteFetch({ base, root, routes: { [`${base}documents/tests/`]: () => new Response("Not found", { status: 404 }), "https://raw.githubusercontent.com/": () => new Response("Not found", { status: 404 }) } });
  const unreadable = await buildCatalog({ source: "github", repository: { owner: "owner", name: "docpages" }, baseUrl: base, fetchImpl: missing, store: createStore(null), cacheKey: "k", isCandidate, analyze });
  assert.match(unreadable.documents.find((d) => d.path === "documents/tests/prueba-x.test.md").errors[0].message, /No se pudo leer el archivo \(HTTP 404\)/);
});
