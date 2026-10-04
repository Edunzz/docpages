---
title:
  es: "Validación del sitio de documentación"
  en: "Documentation site validation"
description:
  es: "Comprueba la generación del manifiesto, la portada, el cambio de idioma, el progreso y la publicación en GitHub Pages."
  en: "Checks manifest generation, the home page, language switching, progress and publishing on GitHub Pages."
slug: "site-validation"
type: "test"
version: "1.0.0"
author: "Jose Eduardo Romero Jimenez"
updated: "2026-10-03"
tags: [test, github-pages, accessibility]
status: "partial"
executedAt: "2026-10-03T23:30:00-05:00"
environment:
  es: "Local: Node.js 24 + jsdom (npm test)"
  en: "Local: Node.js 24 + jsdom (npm test)"
links:
  - label:
      es: "Sitio publicado"
      en: "Published site"
    url: "{{pages_url}}"
    icon: "globe"
    highlight: true
  - label:
      es: "Workflow de Pages"
      en: "Pages workflow"
    url: "{{repo_url}}/actions/workflows/pages.yml"
    icon: "external-link"
reset: true
summary:
  passed: 4
  failed: 0
  blocked: 0
  partial: 0
  not-run: 1
  total: 5
---

# {{ title }}

## Objetivo | Objective

:::lang es
Validar que el sitio se construye, que la documentación es navegable y accesible, y que el estado local se comporta como se espera. La publicación en GitHub Pages queda pendiente hasta el primer despliegue.
:::
:::lang en
Validate that the site builds, that the documentation is navigable and accessible, and that local state behaves as expected. Publishing on GitHub Pages stays pending until the first deployment.
:::

## Precondiciones | Preconditions

:::lang es
- Dependencias instaladas con `npm ci`.
- Documentos válidos según `npm run validate`.
:::
:::lang en
- Dependencies installed with `npm ci`.
- Documents valid according to `npm run validate`.
:::

:::testcase id="manifest-build" title.es="Genera el manifiesto" title.en="Builds the manifest" status="passed"
:::lang es
**Esperado:** `npm run manifest` lista un procedimiento y una prueba, ordenados y con su hash.

**Obtenido:** se generó `documents.manifest.json` con ambos documentos.
:::
:::lang en
**Expected:** `npm run manifest` lists one procedure and one test, sorted and hashed.

**Actual:** `documents.manifest.json` was generated with both documents.
:::

:::evidence type="link" label.es="Abrir el manifiesto" label.en="Open the manifest"
../../documents.manifest.json
:::
:::

:::testcase id="home-loads" title.es="Carga la portada y lista los documentos" title.en="Home page loads and lists documents" status="passed"
:::lang es
**Esperado:** la portada separa Procedimientos y Pruebas, busca por título, etiqueta y contenido, y no tiene infracciones de accesibilidad de axe-core.

**Obtenido:** la prueba `tests/app.test.mjs` renderizó la portada en jsdom sin infracciones.
:::
:::lang en
**Expected:** the home page separates Procedures and Tests, searches by title, tag and content, and has no axe-core accessibility violations.

**Actual:** `tests/app.test.mjs` rendered the home page in jsdom with no violations.
:::

:::evidence type="image" label.es="Ilustración de la portada (no es una captura)" label.en="Home page illustration (not a screenshot)"
evidence/home-overview.svg
:::
:::

:::testcase id="language-switch" title.es="Cambia entre español e inglés" title.en="Switches between Spanish and English" status="passed"
:::lang es
**Esperado:** el selector cambia toda la interfaz, actualiza `<html lang>` y recuerda la preferencia.

**Obtenido:** la interfaz y los bloques `:::lang` cambiaron y la preferencia quedó en `localStorage`.
:::
:::lang en
**Expected:** the selector switches the whole interface, updates `<html lang>` and remembers the preference.

**Actual:** the interface and the `:::lang` blocks switched and the preference was stored in `localStorage`.
:::
:::

:::testcase id="progress-persistence" title.es="Persiste y reinicia el progreso" title.en="Persists and resets progress" status="passed"
:::lang es
**Esperado:** marcar pasos, subpasos y casillas actualiza el porcentaje, sobrevive a una recarga y «Reiniciar» lo borra.

**Obtenido:** el porcentaje, la persistencia por versión y el reinicio se comportaron como se esperaba.
:::
:::lang en
**Expected:** marking steps, substeps and checkboxes updates the percentage, survives a reload, and “Reset” clears it.

**Actual:** the percentage, per-version persistence and reset behaved as expected.
:::
:::

:::testcase id="pages-deploy" title.es="Publica en GitHub Pages" title.en="Publishes on GitHub Pages" status="not-run"
:::lang es
**Esperado:** el workflow despliega y el sitio muestra el propietario y el repositorio reales.

**Obtenido:** pendiente; se ejecuta tras el primer *push* a `main`.
:::
:::lang en
**Expected:** the workflow deploys and the site shows the real owner and repository.

**Actual:** pending; it runs after the first push to `main`.
:::

:::evidence type="link" label.es="Abrir el sitio publicado" label.en="Open the published site"
{{pages_url}}
:::
:::

## Conclusión | Conclusion

:::lang es
La validación local es satisfactoria. Falta confirmar la publicación en GitHub Pages; cuando ocurra, actualiza `status`, `summary` y el caso `pages-deploy`.
:::
:::lang en
Local validation is successful. Publishing on GitHub Pages still needs confirmation; when it happens, update `status`, `summary` and the `pages-deploy` case.
:::
