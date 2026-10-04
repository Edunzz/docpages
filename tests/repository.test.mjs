// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * Comprobaciones del repositorio: enlaces internos, atribución, ausencia de
 * referencias al repositorio de inspiración, workflow y skill.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { ROOT, walk, toPosix } from "../scripts/lib/docs.mjs";
import { checkLinks } from "../scripts/check-links.mjs";
import { VALID_STEPS, makeSite } from "./fixtures.mjs";

const ATTRIBUTION = ["Desarrollado por Jose Eduardo Romero Jimenez", "https://github.com/Edunzz"];
const IGNORED = /^(node_modules|\.git|assets\/vendor)\//;
const read = (rel) => readFile(path.join(ROOT, rel), "utf8");
const repoFiles = async () => (await walk(ROOT)).map((abs) => toPosix(path.relative(ROOT, abs))).filter((rel) => !IGNORED.test(rel));

test("los enlaces internos del repositorio son válidos", async () => {
  assert.deepEqual(await checkLinks(), []);
});

test("el verificador detecta enlaces e imágenes rotos", async () => {
  const doc = VALID_STEPS.replace("Solo texto.", "[otro](../tests/no-existe.test.md) ![img](img/falta.png)");
  const root = await makeSite({ "documents/steps/a.procedure.steps.md": doc }, { copySite: true });
  const problems = await checkLinks({ root });
  assert.deepEqual(problems.map((p) => p.target).sort(), ["../tests/no-existe.test.md", "img/falta.png"]);
});

test("todos los archivos de código y scripts incluyen la atribución", async () => {
  const code = (await repoFiles()).filter((rel) => /\.(m?js|css|html|ya?ml|svg)$/.test(rel) && !rel.startsWith("documents.manifest"));
  assert.ok(code.length > 20, `se esperaban muchos archivos de código, hay ${code.length}`);
  const missing = [];
  for (const rel of code) {
    const text = await read(rel);
    if (!ATTRIBUTION.every((line) => text.includes(line))) missing.push(rel);
  }
  assert.deepEqual(missing, []);
});

test("todos los iconos usados por la interfaz existen en el catálogo del sprite", async () => {
  const { ICON_NAMES, CATEGORY_ICONS, QUESTION_TYPE_ICONS, CALLOUT_ICONS } = await import("../assets/js/icons.js");
  const used = new Set([...Object.values(CATEGORY_ICONS), ...Object.values(QUESTION_TYPE_ICONS), ...Object.values(CALLOUT_ICONS)]);
  for (const rel of (await repoFiles()).filter((f) => /^assets\/js\/.+\.js$/.test(f))) {
    const source = await read(rel);
    // icon(doc, "x"), icon(doc, cond ? "x" : "y"), setIcon(el, cond ? "x" : "y") y hechos ["x", t(...)].
    for (const m of source.matchAll(/(?:icon\(doc, |setIcon\([^,]+, )([^,)]*)/g)) for (const name of m[1].matchAll(/(?:^|[?:])\s*"([a-z0-9-]+)"/g)) used.add(name[1]);
    for (const m of source.matchAll(/\["([a-z][a-z0-9-]+)", t\(/g)) used.add(m[1]);
  }
  for (const m of (await read("index.html")).matchAll(/sprite\.svg#([a-z0-9-]+)/g)) used.add(m[1]);
  assert.ok(used.size > 30, `se esperaban muchos iconos, hay ${used.size}`);
  assert.deepEqual([...used].filter((name) => !ICON_NAMES.includes(name)).sort(), []);
});

test("no queda ninguna referencia al repositorio de inspiración", async () => {
  const forbidden = ["lima", "2026"].join("_");
  const offenders = [];
  for (const rel of await repoFiles()) {
    if (!/\.(m?js|css|html|json|md|ya?ml|svg|webmanifest)$/.test(rel)) continue;
    if ((await read(rel)).toLowerCase().includes(forbidden)) offenders.push(rel);
  }
  assert.deepEqual(offenders, []);
});

test("se publica tal cual desde la rama: sin compilación, manifiesto ni workflows", async () => {
  const exists = (rel) => access(path.join(ROOT, rel)).then(() => true, () => false);
  for (const rel of ["documents.manifest.json", ".github/workflows/pages.yml", ".github/workflows/validate.yml", "scripts/build-manifest.mjs", "scripts/build-site.mjs"]) {
    assert.equal(await exists(rel), false, `${rel} no debería existir`);
  }
  assert.equal(await exists(".nojekyll"), true, "sin .nojekyll, GitHub Pages transformaría los .md");
  for (const rel of ["index.html", "assets/vendor/markdown-it.mjs", "assets/vendor/js-yaml.mjs", "assets/vendor/purify.mjs", "assets/vendor/prism.js", "assets/icons/sprite.svg", "schemas/steps.schema.json", "schemas/test.schema.json"]) {
    assert.equal(await exists(rel), true, `${rel} debe estar versionado para publicar sin compilar`);
  }
  const index = await read("index.html");
  assert.doesNotMatch(index, /https?:\/\/(?:cdn|unpkg)/, "sin CDN");
});

test("el skill reutilizable existe y cubre las secciones y los formatos", async () => {
  const skill = await read(".github/skills/documentation-pages/SKILL.md");
  assert.match(skill, /^---\nname: documentation-pages\ndescription: .+\n---/);
  for (const section of ["Cuándo activarlo", "Prerrequisitos", "Estructura", ".procedure.steps.md", ".labguide.steps.md", ".test.md", "Guías de laboratorio", "Pruebas de práctica", "Convertir una lista de preguntas", "Validar", "Publicar", "Modos", "Migrar", "Seguridad", "Criterios de aceptación", "Solución de problemas", 'DOCUMENTATION_MODE = "all"']) {
    assert.ok(skill.includes(section), `falta «${section}»`);
  }
  for (const type of ["single", "multiple", "true-false", "text", "number", "order", "match"]) assert.match(skill, new RegExp(`type="${type}"`), type);
});

test("README en inglés y en español, enlazados entre sí y con los tres tipos de documento", async () => {
  const en = await read("README.md");
  const es = await read("README.es.md");
  assert.match(en, /\(README\.es\.md\)/);
  assert.match(es, /\(README\.md\)/);
  for (const words of [["Procedure", "Lab guide", "Practice test"], ["Procedimiento", "Guía de laboratorio", "Prueba de práctica"]]) {
    const text = words[0] === "Procedure" ? en : es;
    for (const word of words) assert.ok(text.includes(word), word);
  }
  for (const type of ["single", "multiple", "true-false", "text", "number", "order", "match"]) {
    assert.ok(en.includes(`\`${type}\``), `README.md: ${type}`);
    assert.ok(es.includes(`\`${type}\``), `README.es.md: ${type}`);
  }
  for (const [text, tab] of [[en, "Validate"], [es, "Validar"]]) {
    for (const suffix of [".procedure.steps.md", ".labguide.steps.md", ".test.md"]) assert.ok(text.includes(suffix), suffix);
    assert.ok(text.includes(tab), tab);
    // Las personas no necesitan npm: solo aparece en la sección para desarrolladores.
    const users = text.slice(0, text.indexOf("<details>"));
    assert.doesNotMatch(users, /\bnpm\b/, "npm fuera de la sección para desarrolladores");
  }
});

/** Bloques ```markdown de un texto (admite cercas de 3 o 4 acentos graves). */
function markdownExamples(text) {
  return [...text.matchAll(/^(`{3,4})markdown\n([\s\S]*?)\n\1$/gm)].map((m) => m[2]);
}

// Un fragmento suelto (p. ej. solo bloques :::lang) se completa con un paso mínimo.
const STEPS_WRAPPER = (body) => `---\ntitle: "Ejemplo"\ndescription: "Ejemplo"\nslug: "ejemplo"\ntype: "steps"\nversion: "1.0.0"\nupdated: "2026-10-04"\n---\n\n${body}\n\n:::step id="zz-ejemplo" title="Ejemplo"\nTexto.\n:::\n`;

test("los ejemplos de Markdown del skill y de los README son documentos válidos", async () => {
  const { analyze } = await import("./helpers.mjs");
  const { quizWith } = await import("./fixtures.mjs");
  for (const file of [".github/skills/documentation-pages/SKILL.md", "README.md", "README.es.md"]) {
    const examples = markdownExamples(await read(file));
    assert.ok(examples.length >= 3, `${file}: se esperaban ejemplos`);
    for (const example of examples) {
      let source = example;
      const type = /^type: "test"$/m.test(example) || example.startsWith(":::question") ? "test" : "steps";
      if (example.startsWith(":::question")) source = quizWith(example);
      else if (example.startsWith(":::")) source = STEPS_WRAPPER(example);
      else if (!example.startsWith("---")) continue;
      const result = analyze(type === "test" ? "documents/tests/ejemplo.test.md" : "documents/steps/ejemplo.procedure.steps.md", source);
      assert.deepEqual(result.errors, [], `${file}:\n${example.slice(0, 200)}`);
    }
  }
});
