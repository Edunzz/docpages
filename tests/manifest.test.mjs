// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { VALID_STEPS, VALID_TEST, makeSite } from "./fixtures.mjs";
import { generateManifest, ManifestError } from "../scripts/build-manifest.mjs";
import { buildSite } from "../scripts/build-site.mjs";
import { repositoryFromEnv, hashSource } from "../scripts/lib/docs.mjs";

const NOW = new Date("2026-10-03T12:00:00Z");

test("genera el manifiesto: orden determinista, hashes, conteos y autoría", async () => {
  const root = await makeSite({
    "documents/tests/prueba-x.test.md": VALID_TEST,
    "documents/steps/z.steps.md": VALID_STEPS.replace('slug: "pasos-prueba"', 'slug: "zeta"'),
    "documents/steps/a.steps.md": VALID_STEPS,
    "documents/steps/notas.md": "# no es un documento",
  });
  const manifest = await generateManifest({ root, env: {}, now: NOW });
  assert.equal(manifest.generatedAt, "2026-10-03T12:00:00.000Z");
  assert.equal(manifest.mode, "all");
  assert.equal(manifest.repository, null);
  assert.deepEqual(manifest.counts, { steps: 2, tests: 1 });
  assert.deepEqual(manifest.documents.map((d) => d.path), ["documents/steps/a.steps.md", "documents/steps/z.steps.md", "documents/tests/prueba-x.test.md"]);
  assert.equal(manifest.documents[0].hash, hashSource(VALID_STEPS));
  assert.equal(manifest.documents[0].size, Buffer.byteLength(VALID_STEPS));
  assert.deepEqual(manifest.generator, { name: "docpages", author: "Jose Eduardo Romero Jimenez", authorUrl: "https://github.com/Edunzz", version: "1.0.0" });
  assert.equal(manifest.documents[2].status, "failed");

  // Misma entrada → mismo resultado.
  assert.deepEqual(await generateManifest({ root, env: {}, now: NOW }), manifest);
});

test("toma el repositorio de las variables de GitHub Actions", async () => {
  const env = { GITHUB_REPOSITORY: "Mi-Org/mi-repo", GITHUB_SHA: "0123456789abcdef", GITHUB_REF_NAME: "main", PAGES_BASE_URL: "https://docs.example.com" };
  assert.deepEqual(repositoryFromEnv(env), { owner: "Mi-Org", name: "mi-repo", url: "https://github.com/Mi-Org/mi-repo", branch: "main", sha: "0123456789abcdef", pagesUrl: "https://docs.example.com/" });
  assert.equal(repositoryFromEnv({}), null);
  assert.equal(repositoryFromEnv({ GITHUB_REPOSITORY: "sin-barra" }), null);
  const root = await makeSite({ "documents/steps/a.steps.md": VALID_STEPS });
  const manifest = await generateManifest({ root, env, now: NOW });
  assert.equal(manifest.repository.url, "https://github.com/Mi-Org/mi-repo");
});

test("falla con un informe claro si algún documento es inválido", async () => {
  const root = await makeSite({ "documents/steps/a.steps.md": VALID_STEPS.replace('type: "steps"', 'type: "test"') });
  await assert.rejects(generateManifest({ root, env: {}, now: NOW }), (error) => {
    assert.ok(error instanceof ManifestError);
    assert.match(error.report, /✖ documents\/steps\/a\.steps\.md/);
    assert.match(error.report, /no coincide con el sufijo/);
    return true;
  });
});

test("el sitio construido solo incluye archivos publicables y respeta el modo", async () => {
  const root = await makeSite({ "documents/steps/a.steps.md": VALID_STEPS, "documents/tests/b.test.md": VALID_TEST, "documents.manifest.json": "{}", "docs/diagrams/x.html": "<!doctype html>", "scripts/secreto.mjs": "x", "tests/x.test.mjs": "x" }, { copySite: true });
  const out = await buildSite({ root, out: "_site", mode: "steps" });
  const top = (await readdir(out)).sort();
  assert.deepEqual(top, [".nojekyll", "404.html", "assets", "docs", "documents", "documents.manifest.json", "index.html", "manifest.webmanifest", "schemas"]);
  assert.deepEqual(await readdir(path.join(out, "documents")), ["steps"]);
  assert.equal(await readFile(path.join(out, ".nojekyll"), "utf8"), "");
  await assert.rejects(buildSite({ root, out: "." }), /raíz del repositorio/);
});
