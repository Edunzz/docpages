// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * scripts/check-links.mjs — Comprueba los enlaces internos del sitio.
 *
 *   node scripts/check-links.mjs
 *
 * Verifica que existan los archivos referenciados por:
 *  - index.html y 404.html (href/src relativos);
 *  - assets/css/*.css (url(...));
 *  - los imports relativos de assets/js/*.js;
 *  - manifest.webmanifest (iconos);
 *  - los enlaces e imágenes relativos de cada documento (también los de las
 *    opciones y explicaciones de las preguntas);
 *  - el sprite: cada icono del catálogo debe tener su <symbol>.
 * Los enlaces absolutos (http/https) no se comprueban: requieren red.
 */

import { readFile, access } from "node:fs/promises";
import path from "node:path";
import { ROOT, walk, toPosix, analyzeAll, createRenderer, isMain, DOCUMENTATION_MODE } from "./lib/docs.mjs";
import { resolveRelativePath, dirname, urlScheme } from "../assets/js/markdown.js";
import { ICON_NAMES } from "../assets/js/icons.js";

const exists = (file) => access(file).then(() => true, () => false);
const decoded = (url) => {
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
};
// Los tokens ({{repo_url}}…) se resuelven en el navegador a URLs absolutas; markdown-it los codifica como %7B%7B.
const isLocal = (url) => Boolean(url) && !urlScheme(url) && !url.startsWith("#") && !url.startsWith("//") && !decoded(url).includes("{{");
const clean = (url) => decodeURIComponent(url.split(/[?#]/)[0]);

export async function checkLinks({ root = ROOT, mode = DOCUMENTATION_MODE } = {}) {
  const problems = [];
  const check = async (from, target, resolved) => {
    if (resolved == null) problems.push({ from, target, message: "la ruta sale de la raíz del sitio" });
    else if (!(await exists(path.join(root, resolved)))) problems.push({ from, target, message: `no existe ${resolved}` });
  };

  // 1. HTML
  for (const file of ["index.html", "404.html"]) {
    const html = await readFile(path.join(root, file), "utf8");
    for (const match of html.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const url = match[1];
      if (!isLocal(url) || url.startsWith("/")) continue;
      await check(file, url, resolveRelativePath("", clean(url)));
    }
  }

  // 2. CSS
  for (const abs of (await walk(path.join(root, "assets", "css"))).filter((f) => f.endsWith(".css"))) {
    const rel = toPosix(path.relative(root, abs));
    const css = await readFile(abs, "utf8");
    for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
      if (isLocal(match[1]) && !match[1].startsWith("data:")) await check(rel, match[1], resolveRelativePath(dirname(rel), clean(match[1])));
    }
  }

  // 3. Imports de los módulos del navegador
  for (const abs of (await walk(path.join(root, "assets", "js"))).filter((f) => f.endsWith(".js"))) {
    const rel = toPosix(path.relative(root, abs));
    const js = await readFile(abs, "utf8");
    for (const match of js.matchAll(/(?:^|\n)\s*(?:import|export)\s[^;]*?from\s+"(\.[^"]+)"/g)) {
      await check(rel, match[1], resolveRelativePath(dirname(rel), match[1]));
    }
  }

  // 4. Manifiesto web
  const webmanifest = JSON.parse(await readFile(path.join(root, "manifest.webmanifest"), "utf8"));
  for (const iconEntry of webmanifest.icons || []) await check("manifest.webmanifest", iconEntry.src, resolveRelativePath("", iconEntry.src));

  // 5. Documentos
  const renderer = createRenderer();
  const { results } = await analyzeAll({ root, mode });
  for (const result of results) {
    const dir = dirname(result.path);
    for (const link of renderer.collectLinks(result.body)) {
      if (isLocal(link.url)) await check(result.path, link.url, resolveRelativePath(dir, clean(link.url)));
    }
  }

  // 6. Sprite de iconos
  const sprite = await readFile(path.join(root, "assets", "icons", "sprite.svg"), "utf8").catch(() => "");
  for (const name of ICON_NAMES) {
    if (!sprite.includes(`<symbol id="${name}"`)) problems.push({ from: "assets/icons/sprite.svg", target: name, message: "falta el icono: ejecuta «npm run vendor»" });
  }

  return problems;
}

if (isMain(import.meta.url)) {
  const problems = await checkLinks();
  if (!problems.length) {
    console.log("✔ Enlaces internos correctos.");
  } else {
    for (const p of problems) console.error(`✖ ${p.from} → ${p.target}: ${p.message}`);
    console.error(`\n${problems.length} enlace(s) roto(s).`);
    process.exitCode = 1;
  }
}
