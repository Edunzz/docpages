// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { yaml, plainRenderer } from "./helpers.mjs";
import {
  splitFrontMatter,
  parseFrontMatter,
  parseDirectives,
  parseAttributes,
  localizedAttribute,
  groupLanguageBlocks,
  pickLanguageVariant,
  stripTitlePlaceholder,
  expandTokens,
  plainText,
  isKnownAttribute,
} from "../assets/js/markdown.js";

test("front matter: separa YAML y cuerpo e informa la línea de inicio", () => {
  const { raw, body, bodyLine } = splitFrontMatter("﻿---\r\na: 1\r\nb: x\r\n---\r\n# Hola\r\n");
  assert.equal(raw, "a: 1\nb: x");
  assert.equal(body, "# Hola\n");
  assert.equal(bodyLine, 5);
  assert.deepEqual(parseFrontMatter("---\nupdated: 2026-10-03\n---\n", yaml).data, { updated: "2026-10-03" });
});

test("front matter: ausente, inválido o que no es objeto produce error claro", () => {
  assert.match(parseFrontMatter("# Sin front matter", yaml).error, /front matter/);
  assert.match(parseFrontMatter("---\na: [1, 2\n---\n", yaml).error, /YAML inválido/);
  assert.match(parseFrontMatter("---\n- uno\n---\n", yaml).error, /objeto/);
  assert.match(parseFrontMatter('---\na: !!js/function "function(){}"\n---\n', yaml).error, /YAML inválido/);
});

test("atributos: pares clave=valor, comillas simples y argumentos sueltos", () => {
  assert.deepEqual(parseAttributes(` id="a" title.es="Hola mundo" title.en='Hi' es`), { attrs: { id: "a", "title.es": "Hola mundo", "title.en": "Hi" }, args: ["es"] });
  assert.deepEqual(localizedAttribute({ "title.es": "Hola", "title.en": "Hi" }, "title"), { es: "Hola", en: "Hi" });
  assert.equal(localizedAttribute({ title: "Único" }, "title"), "Único");
  assert.equal(localizedAttribute({}, "title"), null);
});

test("directivas: anidamiento con pila, líneas y código cercado ignorado", () => {
  const body = [":::step id=\"s\" title=\"S\"", "texto", ":::substep id=\"t\" title=\"T\"", "- [ ] x", ":::", "```md", ":::step id=\"falso\"", ":::", "```", ":::"].join("\n");
  const { nodes, errors } = parseDirectives(body, { type: "steps", lineOffset: 10 });
  assert.deepEqual(errors, []);
  assert.equal(nodes.length, 1);
  const step = nodes[0];
  assert.equal(step.name, "step");
  assert.equal(step.line, 10);
  assert.equal(step.endLine, 19);
  assert.deepEqual(step.children.map((c) => c.kind === "directive" ? c.name : "md"), ["md", "substep", "md"]);
  assert.match(step.children[2].text, /:::step id="falso"/);
});

test("directivas: errores de cierre, nombre desconocido, tipo y anidamiento", () => {
  const messages = (body, type) => parseDirectives(body, { type }).errors.map((e) => e.message).join(" | ");
  assert.match(messages(":::step id=\"a\"\ntexto", "steps"), /no se cerró/);
  assert.match(messages(":::\n", "steps"), /sin ninguna directiva abierta/);
  assert.match(messages(":::warning\n:::", "steps"), /desconocida/);
  assert.match(messages(":::question type=\"text\"\n:::", "steps"), /no se admite/);
  assert.match(messages(":::testcase id=\"a\"\n:::", "test"), /desconocida/);
  assert.match(messages(":::explanation\n:::", "test"), /debe ir dentro de «:::question»/);
  assert.match(messages(":::substep id=\"a\"\n:::", "steps"), /debe ir dentro de «:::step»/);
  assert.match(messages(":::step id=\"a\"\n:::step id=\"b\"\n:::\n:::", "steps"), /no puede ir dentro de «:::step»/);
  assert.match(messages(":::lang es\n:::step id=\"a\"\n:::\n:::", "steps"), /no puede ir dentro de «:::lang»/);
});

test("bloques :::lang: se agrupan y se elige la variante con respaldo", () => {
  const { nodes } = parseDirectives(":::lang es\nHola\n:::\n\n:::lang en\nHello\n:::\nDespués");
  const items = groupLanguageBlocks(nodes);
  assert.deepEqual(items.map((i) => i.kind), ["lang-group", "markdown"]);
  const group = items[0];
  assert.match(pickLanguageVariant(group, "en").children[0].text, /Hello/);
  assert.match(pickLanguageVariant(group, "fr").children[0].text, /Hola/);
});

test("render: casillas, avisos estilo GitHub y alineación de tablas sin style", () => {
  const html = plainRenderer.renderUnsafe("- [ ] uno\n- [x] dos\n\n> [!WARNING]\n> Cuidado\n\n| a | b |\n|:-:|--:|\n| 1 | 2 |\n");
  assert.equal((html.match(/class="task-marker"/g) || []).length, 2);
  assert.match(html, /data-checked="true"/);
  assert.match(html, /<blockquote class="callout callout--warning" data-callout="warning">/);
  assert.doesNotMatch(html, /\[!WARNING\]/);
  assert.match(html, /class="align-center"/);
  assert.doesNotMatch(html, /style=/);
  assert.equal(plainRenderer.countTasks("- [ ] a\n- [X] b\n* [ ] c\n1. [ ] d\n- [] no\n"), 4);
  assert.equal(plainRenderer.countTasks("```\n- [ ] dentro de código\n```"), 0);
});

test("tokens y título: {{repo_url}}, {{ title }} y tokens desconocidos intactos", () => {
  assert.equal(expandTokens("{{repo_url}}/x {{ Owner }} {{nope}}", { repo_url: "https://github.com/o/r", owner: "o" }), "https://github.com/o/r/x o {{nope}}");
  assert.equal(stripTitlePlaceholder("\n# {{ title }}\n\nTexto"), "\nTexto");
  assert.equal(stripTitlePlaceholder("# Otro título\n"), "# Otro título\n");
});

test("texto plano para búsqueda: incluye títulos de directivas y omite URLs", () => {
  const text = plainText(':::step id="x" title.es="Preparar entorno"\nVer [docs](https://example.com/x) y `npm ci`.\n:::');
  assert.match(text, /Preparar entorno/);
  assert.match(text, /docs/);
  assert.doesNotMatch(text, /example\.com/);
});

test("atributos permitidos por directiva, con variantes de idioma solo donde corresponde", () => {
  assert.equal(isKnownAttribute("step", "title.en"), true);
  assert.equal(isKnownAttribute("step", "answer"), false);
  assert.equal(isKnownAttribute("question", "answer.es"), true);
  assert.equal(isKnownAttribute("question", "points"), true);
  assert.equal(isKnownAttribute("question", "type.es"), false);
  assert.equal(isKnownAttribute("hint", "id"), false);
  assert.equal(isKnownAttribute("inventada", "id"), false);
});

test("listas de nivel superior: rango de líneas, casillas y texto sin viñeta", () => {
  const source = ["¿Pregunta?", "", "- [ ] uno", "- [x] **dos**", "  sigue", "", "```", "- [x] en código", "```", "", "1. a", "2. b :: c", ""].join("\n");
  const { lines, lists } = plainRenderer.listsOf(source);
  assert.equal(lines[0], "¿Pregunta?");
  assert.deepEqual(lists.map((l) => [l.ordered, l.start, l.end]), [[false, 2, 6], [true, 10, 12]], "el rango incluye la línea en blanco final");
  assert.deepEqual(lists[0].items, [{ text: "uno", task: false }, { text: "**dos**\nsigue", task: true }]);
  assert.deepEqual(lists[1].items, [{ text: "a", task: null }, { text: "b :: c", task: null }]);
});
