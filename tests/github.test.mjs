// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { basePathFromPathname, parsePagesLocation, resolveRepository, repositoryTokens, fetchLiveDocuments, refreshFromGitHub, GitHubError, defaultPagesUrl } from "../assets/js/github.js";
import { jsonResponse } from "./helpers.mjs";

test("resolución de rutas bajo /{repositorio}/ y en la raíz", () => {
  assert.equal(basePathFromPathname("/docpages/"), "/docpages/");
  assert.equal(basePathFromPathname("/docpages/index.html"), "/docpages/");
  assert.equal(basePathFromPathname("/docpages"), "/docpages/");
  assert.equal(basePathFromPathname("/"), "/");
  assert.equal(basePathFromPathname("/index.html"), "/");
  assert.equal(basePathFromPathname(""), "/");

  assert.deepEqual(parsePagesLocation({ hostname: "Owner.github.io", pathname: "/mi-repo/index.html" }), { owner: "owner", name: "mi-repo", isUserSite: false, basePath: "/mi-repo/" });
  assert.deepEqual(parsePagesLocation({ hostname: "owner.github.io", pathname: "/" }), { owner: "owner", name: "owner.github.io", isUserSite: true, basePath: "/" });
  assert.equal(parsePagesLocation({ hostname: "docs.example.com", pathname: "/" }), null);
  assert.equal(parsePagesLocation({ hostname: "localhost", pathname: "/docpages/" }), null);
  assert.equal(defaultPagesUrl("Owner", "owner.github.io"), "https://owner.github.io/");
  assert.equal(defaultPagesUrl("Owner", "repo"), "https://owner.github.io/repo/");
});

test("prioridad del repositorio: config > URL de Pages > manifiesto > nada", () => {
  const location = { hostname: "fork-owner.github.io", pathname: "/docpages/" };
  const manifestRepository = { owner: "Original", name: "docpages", branch: "main" };

  assert.equal(resolveRepository({ location, override: { owner: "cfg", name: "repo" }, manifestRepository }).fullName, "cfg/repo");
  // Un fork que publica desde una rama con el manifiesto del original: manda la URL.
  const fork = resolveRepository({ location, manifestRepository });
  assert.equal(fork.fullName, "fork-owner/docpages");
  assert.equal(fork.source, "location");
  // Mismo repositorio: se aprovechan las mayúsculas y la rama del manifiesto.
  const same = resolveRepository({ location: { hostname: "original.github.io", pathname: "/docpages/" }, manifestRepository });
  assert.deepEqual([same.fullName, same.branch, same.source], ["Original/docpages", "main", "manifest"]);
  // Dominio propio: solo el manifiesto lo sabe.
  assert.equal(resolveRepository({ location: { hostname: "docs.example.com", pathname: "/" }, manifestRepository: { ...manifestRepository, pagesUrl: "https://docs.example.com/" } }).pagesUrl, "https://docs.example.com/");
  assert.equal(resolveRepository({ location: { hostname: "localhost", pathname: "/" } }), null);
  assert.equal(resolveRepository({ override: { owner: "", name: "" }, location: { hostname: "localhost", pathname: "/" } }), null);
});

test("tokens del repositorio vacíos si no se conoce", () => {
  const repo = resolveRepository({ location: { hostname: "owner.github.io", pathname: "/r/" } });
  assert.equal(repositoryTokens(repo).repo_url, "https://github.com/owner/r");
  assert.equal(repositoryTokens(repo).pages_url, "https://owner.github.io/r/");
  assert.equal(repositoryTokens(null).repo_url, "");
});

const api = "https://api.github.com/repos/o/r";
function fakeFetch(routes) {
  return async (url) => {
    for (const [prefix, handler] of routes) if (String(url).startsWith(prefix)) return handler(url);
    return new Response("nope", { status: 404 });
  };
}
const baseOptions = (fetchImpl) => ({
  repository: { owner: "o", name: "r" },
  fetchImpl,
  isDocumentPath: (p) => /^documents\/(steps|tests)\/.+\.(steps|test)\.md$/.test(p),
  analyze: async ({ path, rawUrl }) => ({ type: path.includes("/steps/") ? "steps" : "test", path, slug: path, rawUrl }),
});

test("lectura en vivo: metadatos, árbol filtrado y raw por rama", async () => {
  const fetchImpl = fakeFetch([
    [`${api}/git/trees/develop`, () => jsonResponse({ truncated: true, tree: [{ type: "blob", path: "documents/tests/b.test.md" }, { type: "blob", path: "documents/steps/a.steps.md" }, { type: "tree", path: "documents" }, { type: "blob", path: "README.md" }] })],
    [api, () => jsonResponse({ name: "r", owner: { login: "O" }, private: false, default_branch: "develop" })],
    ["https://raw.githubusercontent.com/o/r/refs/heads/develop/", () => new Response("---\n---\n")],
  ]);
  const live = await fetchLiveDocuments(baseOptions(fetchImpl));
  assert.deepEqual(live.repository, { owner: "O", name: "r", branch: "develop" });
  assert.equal(live.truncated, true);
  assert.deepEqual(live.documents.map((d) => d.path), ["documents/steps/a.steps.md", "documents/tests/b.test.md"]);
  assert.equal(live.documents[0].rawUrl, "https://raw.githubusercontent.com/o/r/refs/heads/develop/documents/steps/a.steps.md");
});

test("errores de la API pública: offline, privado, inexistente, límite y tiempo agotado", async () => {
  const codeOf = async (fetchImpl, extra = {}) => {
    try {
      await fetchLiveDocuments({ ...baseOptions(fetchImpl), ...extra });
      return "ok";
    } catch (error) {
      assert.ok(error instanceof GitHubError);
      return error.code;
    }
  };
  assert.equal(await codeOf(async () => { throw new TypeError("Failed to fetch"); }), "offline");
  assert.equal(await codeOf(fakeFetch([[api, () => jsonResponse({ private: true })]])), "private");
  assert.equal(await codeOf(fakeFetch([])), "not-found");
  assert.equal(await codeOf(fakeFetch([[api, () => new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" } })]])), "rate-limited");
  assert.equal(await codeOf(fakeFetch([[api, () => new Response("", { status: 429 })]])), "rate-limited");
  assert.equal(await codeOf(fakeFetch([[api, () => new Response("", { status: 500 })]])), "http");
  assert.equal(await codeOf(fakeFetch([[api, () => new Response("<html>", { status: 200 })]])), "invalid");
  const slow = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  assert.equal(await codeOf(slow, { timeoutMs: 20 }), "timeout");
  assert.equal(await codeOf(async () => jsonResponse({}), { repository: { owner: "", name: "" } }), "no-repo");
});

test("fallback: refreshFromGitHub nunca lanza y conserva el manifiesto del despliegue", async () => {
  const deployed = { source: "deployment", documents: [{ slug: "x" }], repository: { owner: "o", name: "r", sha: "abc" } };
  const failed = await refreshFromGitHub({ deployed, ...baseOptions(async () => { throw new TypeError("offline"); }) });
  assert.equal(failed.ok, false);
  assert.equal(failed.manifest, deployed);
  assert.equal(failed.error.code, "offline");

  const rateLimited = await refreshFromGitHub({ deployed, ...baseOptions(fakeFetch([[api, () => new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" } })]])) });
  assert.equal(rateLimited.error.code, "rate-limited");
  assert.equal(rateLimited.error.resetAt.toISOString(), "2030-03-17T17:46:40.000Z");

  const ok = await refreshFromGitHub({
    deployed,
    now: () => new Date("2026-10-03T00:00:00Z"),
    ...baseOptions(fakeFetch([[`${api}/git/trees/main`, () => jsonResponse({ tree: [] })], [api, () => jsonResponse({ default_branch: "main" })]])),
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.manifest.source, "github");
  assert.equal(ok.manifest.generatedAt, "2026-10-03T00:00:00.000Z");
  assert.equal(ok.manifest.repository.sha, "", "un manifiesto en vivo no apunta a un commit concreto");
});
