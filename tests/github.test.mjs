// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { basePathFromPathname, parsePagesLocation, resolveRepository, repositoryTokens, parseGitConfig, listRepositoryDocuments, GitHubError, defaultPagesUrl } from "../assets/js/github.js";
import { isCandidatePath } from "../assets/js/documents.js";
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

test("el remoto de .git/config: https, ssh y preferencia por origin", () => {
  const config = `[core]\n\tbare = false\n[remote "upstream"]\n\turl = https://github.com/Original/docpages.git\n[remote "origin"]\n\turl = git@github.com:Mi-Usuario/mi-copia.git\n\tfetch = +refs/heads/*:refs/remotes/origin/*\n[branch "main"]\n\tremote = origin\n`;
  assert.deepEqual(parseGitConfig(config), { owner: "Mi-Usuario", name: "mi-copia" });
  assert.deepEqual(parseGitConfig('[remote "origin"]\n  url = https://github.com/o/r\n'), { owner: "o", name: "r" });
  assert.deepEqual(parseGitConfig('[remote "origin"]\n  url = ssh://git@github.com/o/r.git/\n'), { owner: "o", name: "r" });
  assert.equal(parseGitConfig('[remote "origin"]\n  url = https://gitlab.com/o/r.git\n'), null, "solo GitHub");
  assert.equal(parseGitConfig(""), null);
  assert.equal(parseGitConfig("<html>404</html>"), null);
});

test("prioridad del repositorio: config > URL de Pages > .git/config local > nada", () => {
  const location = { hostname: "fork-owner.github.io", pathname: "/docpages/" };
  const gitRepository = { owner: "Local", name: "copia" };
  assert.equal(resolveRepository({ location, override: { owner: "cfg", name: "repo" }, gitRepository }).fullName, "cfg/repo");
  const pages = resolveRepository({ location, gitRepository });
  assert.deepEqual([pages.fullName, pages.source], ["fork-owner/docpages", "location"]);
  const local = resolveRepository({ location: { hostname: "localhost", pathname: "/" }, gitRepository });
  assert.deepEqual([local.fullName, local.source, local.url], ["Local/copia", "git", "https://github.com/Local/copia"]);
  assert.equal(resolveRepository({ location: { hostname: "localhost", pathname: "/" } }), null);
  assert.equal(resolveRepository({ override: { owner: "", name: "" }, location: { hostname: "localhost", pathname: "/" } }), null);
});

test("tokens del repositorio vacíos si no se conoce", () => {
  const repo = resolveRepository({ location: { hostname: "owner.github.io", pathname: "/r/" } });
  assert.equal(repositoryTokens(repo).repo_url, "https://github.com/owner/r");
  assert.equal(repositoryTokens(repo).pages_url, "https://owner.github.io/r/");
  assert.equal(repositoryTokens(repo).branch, "main");
  assert.equal(repositoryTokens(null).repo_url, "");
});

const api = "https://api.github.com/repos/o/r";
function fakeFetch(routes) {
  const calls = [];
  const impl = async (url) => {
    calls.push(String(url));
    for (const [prefix, handler] of routes) if (String(url).startsWith(prefix)) return handler(url);
    return new Response("nope", { status: 404 });
  };
  impl.calls = calls;
  return impl;
}
const options = (fetchImpl, extra = {}) => ({ repository: { owner: "o", name: "r" }, fetchImpl, isCandidate: (p) => isCandidatePath(p, "all"), ...extra });

test("lista de documentos: un único árbol de la rama por defecto, filtrado y ordenado", async () => {
  const fetchImpl = fakeFetch([
    [`${api}/git/trees/HEAD?recursive=1`, () => jsonResponse({ truncated: true, tree: [
      { type: "blob", path: "documents/tests/b.test.md" },
      { type: "blob", path: "documents/steps/a.procedure.steps.md" },
      { type: "blob", path: "documents/notas.md" },
      { type: "blob", path: "documents/tests/img/x.png" },
      { type: "tree", path: "documents" },
      { type: "blob", path: "README.md" },
    ] })],
  ]);
  const listed = await listRepositoryDocuments(options(fetchImpl));
  assert.deepEqual(listed, { paths: ["documents/notas.md", "documents/steps/a.procedure.steps.md", "documents/tests/b.test.md"], truncated: true });
  assert.deepEqual(fetchImpl.calls, [`${api}/git/trees/HEAD?recursive=1`], "una sola llamada a la API");
});

test("errores de la API pública: offline, inexistente o privado, límite, tiempo agotado y respuesta inválida", async () => {
  const codeOf = async (fetchImpl, extra = {}) => {
    try {
      await listRepositoryDocuments(options(fetchImpl, extra));
      return "ok";
    } catch (error) {
      assert.ok(error instanceof GitHubError);
      return error.code;
    }
  };
  assert.equal(await codeOf(async () => { throw new TypeError("Failed to fetch"); }), "offline");
  assert.equal(await codeOf(fakeFetch([])), "not-found");
  assert.equal(await codeOf(fakeFetch([[api, () => new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" } })]])), "rate-limited");
  assert.equal(await codeOf(fakeFetch([[api, () => new Response("", { status: 429 })]])), "rate-limited");
  assert.equal(await codeOf(fakeFetch([[api, () => new Response("", { status: 500 })]])), "http");
  assert.equal(await codeOf(fakeFetch([[api, () => new Response("<html>", { status: 200 })]])), "invalid");
  assert.equal(await codeOf(fakeFetch([[api, () => jsonResponse({ message: "x" })]])), "invalid");
  const slow = (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }))));
  assert.equal(await codeOf(slow, { timeoutMs: 20 }), "timeout");
  assert.equal(await codeOf(async () => jsonResponse({}), { repository: { owner: "", name: "" } }), "no-repo");

  const limited = fakeFetch([[api, () => new Response("", { status: 403, headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": "1900000000" } })]]);
  await assert.rejects(listRepositoryDocuments(options(limited)), (error) => error.resetAt.toISOString() === "2030-03-17T17:46:40.000Z");
});
