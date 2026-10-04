// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import createDOMPurify from "dompurify";
import { markdownit } from "./helpers.mjs";
import { createMarkdownRenderer, isSafeUrl, isSafeImageSrc, isSafeRelativePath, resolveRelativePath } from "../assets/js/markdown.js";

const { window } = new JSDOM("<!doctype html><body></body>", { url: "https://owner.github.io/docpages/" });
const renderer = createMarkdownRenderer({ markdownit, DOMPurify: createDOMPurify(window) });
const html = (md) => renderer.renderHtml(md);

test("el HTML crudo no se ejecuta: se muestra como texto", () => {
  const out = html('<script>alert(1)</script>\n\n<img src=x onerror="alert(1)">\n\n<iframe src="https://evil.example"></iframe>');
  assert.doesNotMatch(out, /<script|<iframe|<img/i);
  assert.match(out, /&lt;script&gt;/);
});

test("enlaces e imágenes con esquemas inseguros se neutralizan", () => {
  const out = html("[a](javascript:alert(1)) [b](JaVaScRiPt:alert(1)) [c](vbscript:x) [d](data:text/html,hi) ![e](data:image/png;base64,AAAA) [f](java\tscript:alert(1))");
  assert.doesNotMatch(out, /href="(?:javascript|vbscript|data)/i);
  assert.doesNotMatch(out, /src="data:/i);
  assert.doesNotMatch(out, /<a /, "ningún enlace inseguro llega a ser <a>");
});

test("DOMPurify elimina atributos de eventos y estilos aunque el HTML venga de otra fuente", () => {
  const out = renderer.sanitize('<p onclick="x()" style="color:red">ok</p><a href="javascript:alert(1)">x</a><form action="/x"><input></form><svg><script>1</script></svg>');
  assert.equal(out, "<p>ok</p><a>x</a>");
});

test("los enlaces externos abren en otra pestaña con rel=noopener noreferrer", () => {
  const fragment = renderer.renderFragment("[externo](https://example.com) [relativo](../tests/x.test.md) [ancla](#y) <https://auto.example>");
  const anchors = [...fragment.querySelectorAll("a")];
  assert.deepEqual(anchors.map((a) => [a.getAttribute("href"), a.getAttribute("target"), a.getAttribute("rel")]), [
    ["https://example.com", "_blank", "noopener noreferrer"],
    ["../tests/x.test.md", null, null],
    ["#y", null, null],
    ["https://auto.example", "_blank", "noopener noreferrer"],
  ]);
});

test("las imágenes https o relativas se conservan con lazy loading y alt", () => {
  const fragment = renderer.renderFragment("![logo](img/logo.png) ![remota](https://example.com/a.png) ![http](http://example.com/a.png)");
  const imgs = [...fragment.querySelectorAll("img")];
  assert.deepEqual(imgs.map((i) => i.getAttribute("src")), ["img/logo.png", "https://example.com/a.png", null]);
  assert.ok(imgs.every((i) => i.getAttribute("loading") === "lazy" && i.hasAttribute("alt")));
});

test("política de URLs", () => {
  for (const ok of ["https://x.y", "http://x.y", "mailto:a@b.c", "tel:+51", "#a", "./a", "../a", "a/b.md", "?q=1"]) assert.equal(isSafeUrl(ok), true, ok);
  for (const bad of ["javascript:alert(1)", " javascript:x", "java\nscript:x", "data:text/html,x", "vbscript:x", "file:///etc/passwd", "//evil.example", "", null]) assert.equal(isSafeUrl(bad), false, String(bad));
  assert.equal(isSafeImageSrc("http://x.y/a.png"), false);
  assert.equal(isSafeImageSrc("https://x.y/a.png"), true);
  assert.equal(isSafeRelativePath("img/a.png"), true);
  assert.equal(isSafeRelativePath("/abs.png"), false);
  assert.equal(isSafeRelativePath("..\\a.png"), false);
  assert.equal(isSafeRelativePath("https://x.y"), false);
});

test("las rutas relativas se resuelven sin salir de la raíz del sitio", () => {
  assert.equal(resolveRelativePath("documents/tests", "evidence/a.png"), "documents/tests/evidence/a.png");
  assert.equal(resolveRelativePath("documents/tests", "../steps/x.steps.md#paso"), "documents/steps/x.steps.md");
  assert.equal(resolveRelativePath("documents/tests", "../../documents.manifest.json"), "documents.manifest.json");
  assert.equal(resolveRelativePath("documents/tests", "../../../fuera.png"), null);
  assert.equal(resolveRelativePath("documents", "/etc/passwd"), null);
});
