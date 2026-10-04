// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * scripts/build-site.mjs — Ensambla el sitio estático en _site/.
 *
 *   node scripts/build-site.mjs [--out _site]
 *
 * Copia solo lo que se publica (lista blanca): páginas, assets, esquemas,
 * diagramas (docs/), manifiestos y las carpetas de /documents habilitadas por
 * el modo. Nada de node_modules, scripts, pruebas ni configuración del
 * repositorio.
 */

import { rm, mkdir, cp, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { enabledTypes, DOCUMENT_TYPES } from "../assets/js/documents.js";
import { ROOT, parseArgs, isMain, DOCUMENTATION_MODE } from "./lib/docs.mjs";

const FILES = ["index.html", "404.html", "manifest.webmanifest", "documents.manifest.json"];
const DIRECTORIES = ["assets", "schemas", "docs"];

export async function buildSite({ root = ROOT, out = "_site", mode = DOCUMENTATION_MODE } = {}) {
  const target = path.resolve(root, out);
  if (target === path.resolve(root)) throw new Error("La carpeta de salida no puede ser la raíz del repositorio.");
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });

  for (const file of FILES) {
    await access(path.join(root, file)).catch(() => {
      throw new Error(`Falta ${file}. ${file === "documents.manifest.json" ? "Ejecuta «npm run manifest»." : ""}`);
    });
    await cp(path.join(root, file), path.join(target, file));
  }
  for (const dir of DIRECTORIES) await cp(path.join(root, dir), path.join(target, dir), { recursive: true });

  const disabled = Object.values(DOCUMENT_TYPES)
    .filter((def) => !enabledTypes(mode).includes(def.type))
    .map((def) => path.join(root, def.folder));
  await cp(path.join(root, "documents"), path.join(target, "documents"), {
    recursive: true,
    filter: (source) => !disabled.some((dir) => source === dir || source.startsWith(dir + path.sep)),
  });

  // Sin Jekyll: si no, GitHub Pages transformaría los .md con front matter.
  await writeFile(path.join(target, ".nojekyll"), "", "utf8");
  return target;
}

if (isMain(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const target = await buildSite({ out: typeof args.out === "string" ? args.out : "_site", mode: args.mode || DOCUMENTATION_MODE });
  console.log(`✔ Sitio estático listo en ${path.relative(ROOT, target) || "."}/`);
}
