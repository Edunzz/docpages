---
name: documentation-pages
description: Crea, valida, migra y publica documentación bilingüe (es/en) en GitHub Pages a partir de Markdown con dos formatos, procedimientos {titulo}.steps.md (pasos, subpasos, casillas y progreso persistente) y pruebas {titulo}.test.md (casos, estados, evidencia y resumen). Úsalo para añadir o editar documentos en /documents, reproducir este patrón en otro repositorio, cambiar entre los modos all/steps/tests o diagnosticar el sitio y su workflow.
---

# documentation-pages

Patrón de sitio estático (HTML + CSS + JavaScript, sin backend) que publica en GitHub Pages los Markdown de `/documents`. El navegador detecta solo el propietario y el repositorio; un fork o una plantilla funcionan sin editar nombres ni enlaces.

## Cuándo activarlo

- Crear, editar, traducir o revisar un documento `*.steps.md` o `*.test.md`.
- Publicar o depurar el sitio en GitHub Pages (workflow, manifiesto, rutas bajo `/{repositorio}/`).
- Habilitar solo procedimientos, solo pruebas o ambos.
- Migrar documentación de otro repositorio a este formato, o importar el patrón en un repositorio nuevo.
- Revisar seguridad, accesibilidad o la atribución del proyecto.

## Prerrequisitos

- Node.js 22 o superior (el CI usa la versión de `.nvmrc`) y npm.
- Un repositorio público en GitHub (la actualización en vivo usa la API pública sin token).
- En el repositorio: **Settings → Pages → Source: GitHub Actions**.
- No hace falta servidor, base de datos ni CDN: las librerías se empaquetan en `assets/vendor`.

## Estructura obligatoria

```text
.github/workflows/pages.yml          validar → manifiesto → enlaces → pruebas → build → deploy
.github/skills/documentation-pages/  este skill
assets/css/app.css                   estilos (tokens claro/oscuro, estados accesibles)
assets/js/config.js                  DOCUMENTATION_MODE y override opcional del repositorio
assets/js/*.js                       app, router, i18n, parser, validación, vistas (sin globales)
assets/vendor/                       markdown-it, js-yaml, DOMPurify, Prism (npm run vendor)
assets/icons/sprite.svg              iconos Lucide + GitHub (npm run vendor)
documents/steps/**/{titulo}.steps.md procedimientos
documents/tests/**/{titulo}.test.md  pruebas (+ imágenes de evidencia relativas)
schemas/steps.schema.json            front matter de procedimientos (JSON Schema 2020-12)
schemas/test.schema.json             front matter de pruebas
scripts/*.mjs                        vendor, validate, manifest, check-links, build-site, serve
documents.manifest.json              índice generado (fuente principal de navegación)
index.html · 404.html · manifest.webmanifest
```

Reglas fijas: el sufijo decide el tipo (`.steps.md` → `type: "steps"`, `.test.md` → `type: "test"`); cada tipo vive en su carpeta; los nombres de archivo van en kebab-case.

## Front matter común

| Campo | Obligatorio | Regla |
|---|---|---|
| `title` | sí | texto o `{ es, en }` |
| `description` | sí | texto o `{ es, en }` |
| `slug` | sí | kebab-case, único entre todos los documentos y estable (es parte de la URL y de la clave de progreso) |
| `type` | sí | `steps` o `test`, igual al sufijo |
| `version` | sí | semántica `MAYOR.MENOR.PARCHE`; súbela al cambiar el contenido: el progreso guardado es por versión |
| `updated` | sí | `AAAA-MM-DD` |
| `author` | no | texto |
| `tags` | no | lista en minúsculas con guiones, sin repetidos |
| `links` | no | `[{ label, url, icon?, highlight? }]`; se muestran antes del contenido |
| `reset` | no | `true` por defecto; `false` oculta «Reiniciar» |

`links[].url` admite `http(s)`, `mailto`, rutas relativas y tokens. Iconos disponibles: los de `assets/js/icons.js` (por ejemplo `github`, `external-link`, `book-open`, `globe`).

Tokens (se resuelven en el navegador con el repositorio detectado): `{{repo_url}}`, `{{pages_url}}`, `{{owner}}`, `{{repo_name}}`, `{{repo}}`, `{{clone_url}}`, `{{branch}}`; además `{{ title }}`, `{{ description }}`, `{{ version }}`, `{{ author }}`, `{{ updated }}`, `{{ slug }}`. La primera línea `# {{ title }}` la consume la cabecera de la página.

## Reglas para crear `.steps.md`

```markdown
---
title: { es: "Instalar el agente", en: "Install the agent" }
description: { es: "Pasos para instalarlo.", en: "Steps to install it." }
slug: "instalar-agente"
type: "steps"
version: "1.0.0"
author: "Equipo"
updated: "2026-10-03"
tags: [instalacion]
links:
  - label: { es: "Repositorio", en: "Repository" }
    url: "{{repo_url}}"
    icon: "github"
reset: true
---

# {{ title }}

:::step id="preparar" title.es="Preparar" title.en="Prepare"
:::lang es
Texto en español.
- [ ] Tarea comprobable.
:::
:::lang en
English text.
- [ ] Verifiable task.
:::

:::substep id="preparar-red" title.es="Revisar la red" title.en="Check the network"
- [ ] Puerto 443 abierto.
:::
:::

:::step id="verificar" title.es="Verificar" title.en="Verify"
> [!NOTE]
> Sin casillas, el paso completo es una sola unidad de progreso.
:::
```

- Directivas: `:::step` (nivel superior), `:::substep` (solo dentro de un paso), `:::lang es|en` (dentro de cualquiera). Cada una cierra con `:::` en su propia línea; dentro de bloques de código no cuentan.
- Cada `step` y `substep` necesita `id` único (letras, números, `-`, `_`) y título (`title.es` + `title.en`, o `title`).
- Progreso por **hojas**: cada casilla `- [ ]` (clave `{nodo}#{n}`), cada subpaso sin casillas y cada paso sin subpasos ni casillas. `%` = hojas hechas / total, redondeado hacia abajo. «Marcar como completado» marca todas las hojas del nodo y avanza al siguiente paso. Diagrama: `docs/diagrams/steps-progress-flow.html`.
- Las variantes `:::lang` de un mismo bloque deben tener el mismo número de casillas (el progreso no depende del idioma).
- Estado local: `localStorage` → `docpages:{owner/repo}:{slug}:{version}:steps`.
- Avisos: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`. Los bloques de código tienen botón «Copiar».

## Reglas para crear `.test.md`

```markdown
---
title: { es: "Prueba de humo", en: "Smoke test" }
description: { es: "Comprueba el despliegue.", en: "Checks the deployment." }
slug: "prueba-humo"
type: "test"
version: "1.0.0"
updated: "2026-10-03"
status: "partial"                       # opcional; si falta se deriva de los casos
executedAt: "2026-10-03T20:00:00-05:00" # ISO 8601 con zona horaria
environment: { es: "QA", en: "QA" }
summary: { passed: 1, not-run: 1, total: 2 }  # opcional; se avisa si no coincide
---

:::testcase id="portada" title.es="Carga la portada" title.en="Home loads" status="passed"
:::lang es
**Esperado:** responde 200.

**Obtenido:** respondió 200.
:::
:::lang en
**Expected:** responds 200.

**Actual:** responded 200.
:::

:::evidence type="image" label.es="Captura" label.en="Screenshot"
evidence/portada.png
:::
:::

:::testcase id="despliegue" title.es="Despliega" title.en="Deploys" status="not-run"
:::evidence type="link" label.es="Sitio" label.en="Site"
{{pages_url}}
:::
:::
```

- Estados permitidos: `not-run`, `running`, `passed`, `failed`, `blocked`, `partial`.
- Estado global derivado: `failed` > `blocked` > `partial` > `running` > todo `not-run` → `not-run` > algún `not-run` → `partial` > `passed`. El validador avisa si `status` o `summary` declarados no coinciden.
- `:::evidence` solo dentro de `:::testcase`; la primera línea no vacía es el destino. `type="link"`: http(s) o ruta relativa. `type="image"`: ruta **relativa** dentro del sitio, extensión png, jpg, jpeg, gif, webp, avif o svg.
- Los párrafos que empiezan con `**Esperado:**`/`**Expected:**` y `**Obtenido:**`/`**Actual:**` se muestran como campos.
- Interactivo y local (lo borra «Reiniciar»): filtro por estado y «re-ejecución local». Clave: `docpages:{owner/repo}:{slug}:{version}:test`.

## Comandos

```bash
npm ci                    # instala exactamente lo del package-lock.json
npm run vendor            # copia librerías a assets/vendor y genera el sprite
npm run validate          # valida /documents (--json, --strict, --mode steps|tests)
npm run manifest          # genera documents.manifest.json (falla si hay errores)
npm run check:links       # enlaces internos, imports, iconos y evidencias
npm test                  # node:test + jsdom + axe-core
npm run build             # vendor + validate + manifest + check:links + _site/
npm run serve             # sirve la raíz en http://localhost:8080/
npm run preview           # build y sirve _site/ bajo /docpages/ (como Pages)
```

En Git Bash para Windows usa `MSYS_NO_PATHCONV=1` antes de `node scripts/serve.mjs --base /mi-repo/`, porque MSYS convierte las rutas que empiezan con `/`.

## Modos: solo Steps, solo Tests o ambos

En `assets/js/config.js`:

```js
export const DOCUMENTATION_MODE = "all";
// Valores: "all", "steps", "tests"
```

| Modo | Portada y rutas | Validación y manifiesto | Sitio construido |
|---|---|---|---|
| `all` | Procedimientos y pruebas | ambos tipos | `documents/steps` y `documents/tests` |
| `steps` | solo `#/steps/...`; `#/tests/...` muestra «deshabilitado» | ignora `.test.md` (nota informativa) | sin `documents/tests` |
| `tests` | solo `#/tests/...` | ignora `.steps.md` | sin `documents/steps` |

Procedimiento: cambia el valor, ejecuta `npm run build && npm test` y publica. No hay que tocar navegación, validación ni manifiesto: los tres leen el mismo `config.js`. La carpeta del tipo deshabilitado puede quedarse o borrarse.

## Migrar documentos desde otro repositorio

1. Copia los Markdown fuente a una carpeta temporal fuera de `/documents`.
2. Por cada guía paso a paso crea `documents/steps/{titulo}.steps.md`:
   - Título H1 → `title`; primer párrafo → `description`; inventa un `slug` estable.
   - Cada sección `##` → `:::step id="…" title.es="…" title.en="…"` … `:::`.
   - Cada `###` dentro de una sección → `:::substep`.
   - Acciones verificables → casillas `- [ ]`; el resto queda como texto.
   - Una sección «Links/Enlaces» → `links` del front matter.
   - URLs del repositorio de origen → tokens (`{{repo_url}}`, `{{clone_url}}`, `{{repo_name}}`, `{{owner}}`, `{{pages_url}}`).
   - Texto en un solo idioma: déjalo tal cual (se muestra en ambos) o envuélvelo en `:::lang es` y añade `:::lang en`.
3. Por cada informe de prueba crea `documents/tests/{titulo}.test.md` con un `:::testcase` por verificación y su `status`; mueve las capturas junto al documento y referéncialas con `:::evidence type="image"`.
4. Ejecuta `npm run validate` y corrige cada error (trae línea y motivo). Luego `npm run manifest`, `npm run check:links` y `npm test`.
5. Revisa que no queden nombres, dominios ni rutas fijas del repositorio de origen (`git grep -i <nombre-del-origen>`).

Para **importar el patrón** en un repositorio nuevo: copia todo salvo `documents/*`, `documents.manifest.json`, `node_modules` y `_site`; añade tus documentos; ejecuta `npm ci && npm run build && npm test`; habilita Pages con Actions y haz push a `main`.

## Seguridad y sanitización

- markdown-it con `html: false`: el HTML crudo se muestra como texto, nunca se ejecuta.
- Todo HTML generado pasa por DOMPurify (sin `style`, formularios, iframes, SVG ni MathML) antes de llegar al DOM como `DocumentFragment`. No uses `innerHTML`, `eval` ni `new Function`.
- Enlaces: solo `http(s)`, `mailto`, `tel`, anclas y rutas relativas. Imágenes: solo `https` o relativas. `javascript:`, `data:`, `vbscript:` y `file:` se bloquean (el validador lo marca como error).
- Los externos abren en otra pestaña con `rel="noopener noreferrer"`.
- `index.html` declara una CSP estricta (`script-src 'self'`, `style-src 'self'`, `connect-src` limitado a `api.github.com` y `raw.githubusercontent.com`). No añadas scripts ni estilos en línea.
- Sin tokens en el frontend: la API de GitHub se usa sin autenticar (60 solicitudes por hora y por IP). No publiques secretos ni evidencia privada.
- Workflow con permisos mínimos (`contents: read`, `pages: write`, `id-token: write`), acciones fijadas por SHA, `npm ci` con lockfile y Dependabot.

## Atribución

Todo archivo de código o script (JS, MJS, CSS, HTML, YAML, SVG) empieza con:

```text
Desarrollado por Jose Eduardo Romero Jimenez
https://github.com/Edunzz
```

con la sintaxis de comentario del lenguaje. Los JSON no admiten comentarios: la autoría va en `generator` del manifiesto y en `$comment` de los esquemas. Las pruebas lo verifican.

## Criterios de aceptación

- [ ] `npm run validate` sin errores y `npm test` en verde.
- [ ] `npm run check:links` sin enlaces rotos.
- [ ] La portada lista lo que corresponde al modo y la búsqueda encuentra por título, descripción, etiqueta y contenido.
- [ ] ES/EN cambia toda la interfaz y los bloques `:::lang`, y la preferencia se recuerda.
- [ ] Los procedimientos muestran pasos, subpasos, navegación, porcentaje y progreso que sobrevive a una recarga; «Reiniciar» lo borra.
- [ ] Las pruebas muestran veredicto, resumen, filtro, evidencia y re-ejecución local.
- [ ] El sitio funciona en la raíz y bajo `/{repositorio}/`, y muestra el propietario y el repositorio reales tras desplegar.
- [ ] Ningún nombre, enlace ni ruta fija de otro repositorio.
- [ ] Atribución presente en el código nuevo.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| «No se pudo cargar el índice de documentos» | falta `documents.manifest.json` o se abrió con `file://` | `npm run manifest` y sirve con `npm run serve` |
| El documento nuevo no aparece | manifiesto viejo, sufijo o carpeta incorrectos, o modo que lo excluye | `npm run validate` y `npm run manifest`; revisa `DOCUMENTATION_MODE` |
| «no coincide con el sufijo del archivo» | `type` distinto del sufijo | `.steps.md` ↔ `type: "steps"`, `.test.md` ↔ `type: "test"` |
| «slug duplicado» | dos documentos con el mismo `slug` | cambia uno; el `slug` es parte de la URL y del progreso |
| El progreso se perdió | cambió `version`, `slug` o los `id` | es intencional: cada versión tiene su propio estado |
| «mismo número de casillas» | variantes `:::lang` con distinta cantidad de `- [ ]` | iguala las casillas entre idiomas |
| El enlace inicial aparece atenuado | token de repositorio sin resolver (vista local) | normal en local; se resuelve en GitHub Pages |
| «límite de solicitudes» al actualizar | 60 solicitudes por hora sin token | espera la hora indicada; el sitio sigue con el contenido desplegado |
| Pages publica los `.md` como HTML | Jekyll activo al publicar desde una rama | conserva el archivo `.nojekyll` en la raíz |
| El workflow falla en «Configurar GitHub Pages» | Pages no está habilitado con Actions | Settings → Pages → Source: GitHub Actions |
| Iconos vacíos | sprite desactualizado | `npm run vendor` |
