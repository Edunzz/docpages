// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * tests/fixtures.mjs — Documentos de prueba y sitios temporales.
 */

import { mkdtemp, mkdir, writeFile, cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { ROOT } from "../scripts/lib/docs.mjs";

export const VALID_STEPS = `---
title: { es: "Pasos de prueba", en: "Test steps" }
description: { es: "Descripción", en: "Description" }
slug: "pasos-prueba"
type: "steps"
version: "1.0.0"
author: "Equipo"
updated: "2026-10-03"
tags: [demo]
links:
  - label: { es: "Repositorio", en: "Repository" }
    url: "{{repo_url}}"
    icon: "github"
---

# {{ title }}

Introducción.

:::step id="a" title.es="Paso A" title.en="Step A"
- [ ] tarea 1
- [x] tarea 2

:::substep id="a1" title.es="Sub A1" title.en="Sub A1"
- [ ] subtarea
:::

:::substep id="a2" title.es="Sub A2" title.en="Sub A2"
Sin casillas.
:::
:::

:::step id="b" title.es="Paso B" title.en="Step B"
Solo texto.

\`\`\`markdown
:::step id="no-es-un-paso"
:::
\`\`\`
:::
`;

export const VALID_TEST = `---
title: { es: "Prueba", en: "Test" }
description: { es: "Descripción", en: "Description" }
slug: "prueba-x"
type: "test"
version: "2.1.0"
updated: "2026-10-03"
status: "failed"
executedAt: "2026-10-03T20:00:00-05:00"
environment: { es: "QA", en: "QA" }
summary: { passed: 1, failed: 1, blocked: 1, total: 3 }
---

## Objetivo

Texto.

:::testcase id="c1" title.es="Caso 1" title.en="Case 1" status="passed"
**Esperado:** a

**Obtenido:** a

:::evidence type="link" label.es="Ver" label.en="View"
https://example.com/run/1
:::

:::evidence type="image" label.es="Captura" label.en="Screenshot"
img/c1.png
:::
:::

:::testcase id="c2" title.es="Caso 2" title.en="Case 2" status="failed"
**Esperado:** b
:::

:::testcase id="c3" title.es="Caso 3" title.en="Case 3" status="blocked"
Bloqueado por el entorno.
:::
`;

/** Reemplaza una línea del front matter (`clave: …`) en un documento de ejemplo. */
export function withFrontMatter(source, key, value) {
  const re = new RegExp(`^${key}:.*$`, "m");
  return re.test(source) ? source.replace(re, `${key}: ${value}`) : source.replace(/^---\n/, `---\n${key}: ${value}\n`);
}

/**
 * Crea un sitio temporal con los esquemas y package.json del repositorio y
 * los archivos indicados. `{ copySite: true }` copia además páginas y assets.
 */
export async function makeSite(files = {}, { copySite = false } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "docpages-"));
  await cp(path.join(ROOT, "schemas"), path.join(root, "schemas"), { recursive: true });
  await cp(path.join(ROOT, "package.json"), path.join(root, "package.json"));
  if (copySite) {
    for (const file of ["index.html", "404.html", "manifest.webmanifest"]) await cp(path.join(ROOT, file), path.join(root, file));
    await cp(path.join(ROOT, "assets"), path.join(root, "assets"), { recursive: true });
  }
  for (const [rel, content] of Object.entries(files)) {
    const target = path.join(root, rel);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return root;
}
