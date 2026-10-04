---
name: documentation-pages
description: Crea, valida, migra y publica documentación bilingüe (es/en) en GitHub Pages a partir de Markdown con tres tipos de documento, procedimientos y guías de laboratorio en {titulo}.steps.md (pasos, subpasos, casillas y progreso guardado) y pruebas de práctica en {titulo}.test.md (preguntas de opción única o múltiple, verdadero/falso, respuesta corta, numérica, ordenar y relacionar, con corrección y puntuación). Úsalo para convertir preguntas, opciones y respuestas en una prueba de entrenamiento, escribir una guía de laboratorio o un procedimiento, cambiar entre los modos all/steps/tests, migrar documentación o diagnosticar el sitio y su workflow.
---

# documentation-pages

Patrón de sitio estático (HTML + CSS + JavaScript, sin backend) que publica en GitHub Pages los Markdown de `/documents`. El navegador detecta solo el propietario y el repositorio; un fork o una plantilla funcionan sin editar nombres ni enlaces.

Tres tipos de documento:

| Tipo | Archivo | Front matter | Para qué |
|---|---|---|---|
| Procedimiento | `documents/steps/**/{titulo}.steps.md` | `type: "steps"`, `kind: "procedure"` (por defecto) | Pasos a seguir, con casillas y progreso |
| Guía de laboratorio | `documents/steps/**/{titulo}.steps.md` | `type: "steps"`, `kind: "lab-guide"` | Práctica guiada con objetivos, requisitos, duración y nivel |
| Prueba de práctica | `documents/tests/**/{titulo}.test.md` | `type: "test"` | Preguntas de entrenamiento con corrección, explicación y puntuación |

**Regla de oro: lo que no sigue el formato es un error.** Todo `.md` dentro de `/documents` se valida; un archivo mal nombrado, un atributo desconocido, una casilla fuera de su bloque o una pregunta sin respuesta correcta detienen el workflow (el sitio publicado no cambia) y GitHub marca el error sobre la línea del archivo.

## Cuándo activarlo

- El usuario da preguntas, opciones y respuestas (o afirmaciones de verdadero/falso) y quiere una prueba de práctica o de entrenamiento.
- Crear, editar, traducir o revisar un procedimiento, una guía de laboratorio o una prueba.
- Publicar o depurar el sitio en GitHub Pages (workflow, manifiesto, rutas bajo `/{repositorio}/`).
- Habilitar solo procedimientos y guías, solo pruebas o todo.
- Migrar documentación de otro repositorio a este formato o importar el patrón en un repositorio nuevo.
- Revisar seguridad, accesibilidad o la atribución del proyecto.

## Prerrequisitos

- Node.js 22 o superior (el CI usa la versión de `.nvmrc`) y npm.
- Un repositorio público en GitHub (la actualización en vivo usa la API pública sin token).
- En el repositorio: **Settings → Pages → Source: GitHub Actions**.
- No hace falta servidor, base de datos ni CDN: las librerías se empaquetan en `assets/vendor`.

## Estructura obligatoria

```text
.github/workflows/pages.yml          push a main: validar → manifiesto → enlaces → pruebas → build → deploy
.github/workflows/validate.yml       pull requests: validar y probar (solo lectura)
.github/skills/documentation-pages/  este skill
assets/css/app.css                   estilos (tokens claro/oscuro, estados accesibles)
assets/js/config.js                  DOCUMENTATION_MODE y override opcional del repositorio
assets/js/*.js                       app, router, i18n, parser, validación, vistas (sin globales)
assets/js/steps.js · quiz.js         procedimientos/guías y pruebas de práctica
assets/vendor/                       markdown-it, js-yaml, DOMPurify, Prism (npm run vendor)
assets/icons/sprite.svg              iconos Lucide + GitHub (npm run vendor)
documents/steps/**/{titulo}.steps.md procedimientos y guías de laboratorio
documents/tests/**/{titulo}.test.md  pruebas de práctica (+ imágenes relativas si hacen falta)
schemas/steps.schema.json            front matter de .steps.md (JSON Schema 2020-12)
schemas/test.schema.json             front matter de .test.md
scripts/*.mjs                        vendor, validate, manifest, check-links, build-site, serve
documents.manifest.json              índice generado (fuente principal de navegación)
index.html · 404.html · manifest.webmanifest
```

Reglas fijas: el sufijo decide el formato (`.steps.md` → `type: "steps"`, `.test.md` → `type: "test"`); cada formato vive en su carpeta; los nombres de archivo van en kebab-case (`mi-documento.test.md`).

## Front matter común

| Campo | Obligatorio | Regla |
|---|---|---|
| `title` | sí | texto o `{ es, en }` |
| `description` | sí | texto o `{ es, en }` |
| `slug` | sí | kebab-case, único entre todos los documentos y estable (es parte de la URL y de la clave del estado guardado) |
| `type` | sí | `steps` o `test`, igual al sufijo |
| `version` | sí | semántica `MAYOR.MENOR.PARCHE`; súbela al cambiar el contenido: el estado guardado es por versión |
| `updated` | sí | `AAAA-MM-DD` |
| `author` | no | texto |
| `tags` | no | lista en minúsculas con guiones, sin repetidos |
| `duration` | no | texto o `{ es, en }`, p. ej. `{ es: "30 minutos", en: "30 minutes" }` |
| `level` | no | `beginner`, `intermediate` o `advanced` |
| `objectives` | no | lista (1–12) de textos o `{ es, en }` |
| `prerequisites` | no | lista (1–12) de textos o `{ es, en }` |
| `links` | no | `[{ label, url, icon?, highlight? }]`; se muestran antes del contenido |
| `reset` | no | `true` por defecto; `false` oculta «Reiniciar» |

Solo en `.steps.md`: `kind` (`procedure` | `lab-guide`). Solo en `.test.md`: `passingScore` (0–100, por defecto 70), `feedback` (`immediate` | `end`) y `shuffle` (baraja las opciones de `single` y `multiple`). Cualquier otro campo es un error.

`links[].url` admite `http(s)`, `mailto`, rutas relativas (un `.md` de otro documento se convierte en su ruta interna) y tokens. Iconos: los de `assets/js/icons.js` (por ejemplo `github`, `external-link`, `book-open`, `globe`, `flask-conical`, `graduation-cap`).

Tokens (se resuelven en el navegador con el repositorio detectado): `{{repo_url}}`, `{{pages_url}}`, `{{owner}}`, `{{repo_name}}`, `{{repo}}`, `{{clone_url}}`, `{{branch}}`; además `{{ title }}`, `{{ description }}`, `{{ version }}`, `{{ author }}`, `{{ updated }}`, `{{ slug }}`. La primera línea `# {{ title }}` la consume la cabecera de la página.

## Procedimientos: reglas para crear `.steps.md`

```markdown
---
title: { es: "Instalar el agente", en: "Install the agent" }
description: { es: "Pasos para instalarlo.", en: "Steps to install it." }
slug: "instalar-agente"
type: "steps"
kind: "procedure"
version: "1.0.0"
updated: "2026-10-04"
links:
  - label: { es: "Repositorio", en: "Repository" }
    url: "{{repo_url}}"
    icon: "github"
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
- Atributos permitidos: `id` y `title` (o `title.es` / `title.en`), siempre con comillas: `id="x"`. Un atributo desconocido o sin comillas es error.
- Cada `step` y `substep` necesita `id` único (letras, números, `-`, `_`) y título.
- Las casillas `- [ ]` van **dentro** de un paso o subpaso; fuera de ellos son error.
- Progreso por **hojas**: cada casilla (clave `{nodo}#{n}`), cada subpaso sin casillas y cada paso sin subpasos ni casillas. `%` = hojas hechas / total, redondeado hacia abajo. «Marcar como completado» marca todas las hojas del nodo y avanza al siguiente paso. Diagrama: `docs/diagrams/steps-progress-flow.html`.
- Las variantes `:::lang` de un mismo bloque deben tener el mismo número de casillas.
- Estado local: `localStorage` → `docpages:{owner/repo}:{slug}:{version}:steps`.
- Avisos: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`. Los bloques de código tienen botón «Copiar».

## Guías de laboratorio

Mismo formato que un procedimiento, con `kind: "lab-guide"` y, normalmente, `objectives`, `prerequisites`, `duration` y `level` (se muestran en la cabecera). El sitio las lista en su propia sección y usa textos de laboratorio («Progreso del laboratorio», «¡Laboratorio completado!»).

````markdown
---
title: { es: "Laboratorio: primeros pasos con Docker", en: "Lab: getting started with Docker" }
description: { es: "Ejecuta tu primer contenedor.", en: "Run your first container." }
slug: "lab-docker-intro"
type: "steps"
kind: "lab-guide"
version: "1.0.0"
updated: "2026-10-04"
duration: { es: "45 minutos", en: "45 minutes" }
level: "beginner"
objectives:
  - { es: "Descargar una imagen.", en: "Pull an image." }
  - { es: "Ejecutar y detener un contenedor.", en: "Run and stop a container." }
prerequisites:
  - { es: "Docker instalado.", en: "Docker installed." }
---

:::step id="pull" title.es="Descargar la imagen" title.en="Pull the image"
```bash
docker pull hello-world
```
- [ ] La imagen aparece en `docker images`.
:::
````

Buenas prácticas de laboratorio: un objetivo verificable por paso, comandos copiables en bloques de código, una casilla por resultado observable («La salida muestra…») y un paso final de comprobación. Ejemplo completo: `documents/steps/first-practice-test-lab.steps.md`.

## Pruebas de práctica: reglas para crear `.test.md`

```markdown
---
title: { es: "Repaso de redes", en: "Networking review" }
description: { es: "Preguntas de práctica.", en: "Practice questions." }
slug: "repaso-redes"
type: "test"
version: "1.0.0"
updated: "2026-10-04"
passingScore: 70      # % para aprobar (por defecto 70)
feedback: "immediate" # immediate: «Comprobar» en cada pregunta · end: corrección al finalizar
shuffle: true         # baraja las opciones de single y multiple
---

# {{ title }}

:::question type="single"
¿Qué puerto usa HTTPS?
- [ ] 80
- [x] 443
- [ ] 22
:::explanation
HTTPS usa el puerto 443 por defecto.
:::
:::
```

Cada `:::question` lleva `type` y, opcionalmente, `id` (si falta: `q1`, `q2`…), `points` (entero 1–100, por defecto 1), un `:::hint` (pista que el lector abre si quiere) y un `:::explanation` (se muestra al corregir). Todo lo que no es la lista de respuestas es el enunciado (puede tener código, imágenes, tablas…).

### Tipos de pregunta

| Tipo | Cómo se escribe la respuesta | Se corrige como correcta si… |
|---|---|---|
| `type="single"` | lista `- [ ]` con exactamente una `- [x]` | elige esa opción |
| `type="multiple"` | lista `- [ ]` con una o más `- [x]` | elige exactamente todas las `[x]` |
| `type="true-false"` | `answer="true"` o `answer="false"` (también `verdadero`/`falso`) | elige el valor correcto |
| `type="text"` | `answer="valor\|alternativa"` (o `answer.es` / `answer.en`) | escribe una alternativa; no importan mayúsculas, tildes, comillas ni el punto final |
| `type="number"` | `answer="42"` y opcional `tolerance="0.5"` | escribe un número a esa distancia o menos (acepta coma decimal) |
| `type="order"` | lista numerada `1. 2. 3.` en el orden correcto (la última lista de la pregunta) | deja los elementos en ese orden (se muestran desordenados) |
| `type="match"` | lista con líneas `elemento :: pareja` (la última lista de la pregunta) | elige la pareja correcta de cada elemento |

```markdown
:::question type="multiple" points="2"
¿Qué protocolos son de capa de transporte?
- [x] TCP
- [x] UDP
- [ ] HTTP
:::

:::question type="true-false" answer="false"
UDP garantiza la entrega de los paquetes.
:::explanation
UDP no confirma la entrega; TCP sí.
:::
:::

:::question type="text" answer="DNS|Domain Name System"
¿Qué servicio traduce nombres de dominio a direcciones IP?
:::hint
Tiene tres letras.
:::
:::

:::question type="number" answer="255" tolerance="0"
¿Cuál es el valor máximo de un octeto?
:::

:::question type="order"
Ordena las capas del modelo TCP/IP de abajo hacia arriba:

1. Acceso a la red
2. Internet
3. Transporte
4. Aplicación
:::

:::question type="match"
Relaciona cada protocolo con su puerto:

- HTTP :: 80
- HTTPS :: 443
- SSH :: 22
:::
```

Reglas de validación de las preguntas (todas son **error**):

- `type` obligatorio y uno de los siete; `points` entero de 1 a 100; `id` válido y único.
- `single`: al menos 2 opciones y exactamente una `[x]`. `multiple`: al menos 2 opciones y al menos una `[x]`. Una sola lista de opciones; todas sus líneas con `[ ]` o `[x]`.
- `true-false`, `text` y `number` no llevan opciones `- [ ]`; necesitan `answer`. `tolerance` solo en `number`.
- `single`, `multiple`, `order` y `match` no llevan `answer`.
- `order` y `match`: al menos 2 elementos, sin repetidos; en `match`, cada línea con ` :: ` y parejas distintas.
- Siempre debe quedar enunciado; como mucho un `:::hint` y un `:::explanation`.
- Opciones `- [ ]` fuera de un `:::question` son error.
- En bilingüe, las variantes `:::lang` deben tener el mismo número de opciones y las mismas `[x]` en las mismas posiciones. Si las opciones no necesitan traducción (código, números), déjalas fuera de los bloques `:::lang` y traduce solo el enunciado.

Interactivo y local: respuestas, preguntas comprobadas, mejor resultado e intentos. Clave: `docpages:{owner/repo}:{slug}:{version}:test`. «Intentar de nuevo» baraja de nuevo y conserva el mejor resultado; «Reiniciar» lo borra todo.

> Las respuestas correctas están en el Markdown, que es público: sirve para practicar, no para exámenes con nota oficial.

## Convertir una lista de preguntas en una prueba de práctica

Cuando el usuario pase preguntas (en cualquier formato: lista numerada, tabla, «a) b) c)», texto libre):

1. Elige `slug` (kebab-case) y el archivo `documents/tests/{slug}.test.md`. Front matter con `title`, `description`, `slug`, `type: "test"`, `version: "1.0.0"`, `updated` (fecha de hoy), `passingScore` (70 si no se indica) y `feedback: "immediate"`.
2. Por cada pregunta elige el tipo:
   - opciones con **una** correcta → `single`; con **varias** correctas → `multiple`;
   - afirmación que se responde verdadero/falso → `true-false` con `answer`;
   - respuesta de una palabra o frase → `text` con todas las variantes aceptables separadas por `|`;
   - respuesta numérica → `number` (añade `tolerance` si hay decimales o redondeo);
   - «ordena los pasos…» → `order` con la lista en el orden correcto;
   - «relaciona…» / columnas → `match` con `izquierda :: derecha`.
3. Marca la correcta con `[x]` (o pon `answer`). Si el usuario no indicó la respuesta correcta, **pregúntasela**: no la inventes.
4. Si el usuario dio una justificación, ponla en `:::explanation`; si dio pistas, en `:::hint`. Usa `points="2"` para las que valgan más.
5. Si pide bilingüe: traduce `title`/`description` con `{ es, en }` y envuelve enunciado, opciones y explicación en `:::lang es` / `:::lang en` (mismas opciones, mismas `[x]`).
6. Ejecuta `npm run validate` y corrige cada error (trae archivo, línea y motivo). Después `npm run manifest`, `npm run check:links` y `npm test`.

Ejemplo de conversión. Entrada del usuario: «1) ¿Capital de Francia? a) Lyon b) París c) Niza (respuesta b). 2) Verdadero o falso: el Sol es una estrella (V).» Salida:

```markdown
:::question type="single"
¿Capital de Francia?
- [ ] Lyon
- [x] París
- [ ] Niza
:::

:::question type="true-false" answer="true"
El Sol es una estrella.
:::
```

Ejemplo completo con los siete tipos y ambos idiomas: `documents/tests/docpages-basics.test.md`.

## Comandos

```bash
npm ci                    # instala exactamente lo del package-lock.json
npm run vendor            # copia librerías a assets/vendor y genera el sprite
npm run validate          # valida /documents (--json, --strict, --mode steps|tests)
npm run manifest          # genera documents.manifest.json (falla si hay errores)
npm run check:links       # enlaces internos, imports e iconos
npm test                  # node:test + jsdom + axe-core
npm run build             # vendor + validate + manifest + check:links + _site/
npm run serve             # sirve la raíz en http://localhost:8080/
npm run preview           # build y sirve _site/ bajo /docpages/ (como Pages)
```

`npm run validate -- --json` devuelve `{ errors, warnings, documents: [{ path, category, errors: [{ line, message }] }] }` para que un agente corrija en bucle. En GitHub Actions, el mismo comando escribe anotaciones `::error file=…,line=…::`.

En Git Bash para Windows usa `MSYS_NO_PATHCONV=1` antes de `node scripts/serve.mjs --base /mi-repo/`, porque MSYS convierte las rutas que empiezan con `/`.

## Modos: qué se publica

En `assets/js/config.js`:

```js
export const DOCUMENTATION_MODE = "all";
// Valores: "all", "steps", "tests"
```

| Modo | Portada y rutas | Validación y manifiesto | Sitio construido |
|---|---|---|---|
| `all` | Procedimientos, guías de laboratorio y pruebas de práctica | todo `/documents` | `documents/steps` y `documents/tests` |
| `steps` | Procedimientos y guías; `#/tests/...` muestra «deshabilitado» | ignora `.test.md` (nota informativa) | sin `documents/tests` |
| `tests` | solo pruebas de práctica | ignora `.steps.md` | sin `documents/steps` |

Procedimiento: cambia el valor, ejecuta `npm run build && npm test` y publica. No hay que tocar navegación, validación ni manifiesto: los tres leen el mismo `config.js`.

## Migrar documentos desde otro repositorio

1. Copia los Markdown fuente a una carpeta temporal **fuera** de `/documents` (dentro, cualquier `.md` que no siga el formato es error).
2. Por cada guía paso a paso crea `documents/steps/{titulo}.steps.md` (`kind: "procedure"` o `"lab-guide"` si es un laboratorio):
   - Título H1 → `title`; primer párrafo → `description`; inventa un `slug` estable.
   - Cada sección `##` → `:::step id="…" title.es="…" title.en="…"` … `:::`; cada `###` dentro → `:::substep`.
   - Acciones verificables → casillas `- [ ]`; el resto queda como texto.
   - «Objetivos» y «Requisitos» de un laboratorio → `objectives` y `prerequisites`.
   - URLs del repositorio de origen → tokens (`{{repo_url}}`, `{{clone_url}}`, `{{repo_name}}`, `{{owner}}`, `{{pages_url}}`).
3. Por cada cuestionario, examen o banco de preguntas crea `documents/tests/{titulo}.test.md` siguiendo «Convertir una lista de preguntas».
4. Ejecuta `npm run validate` y corrige cada error. Luego `npm run manifest`, `npm run check:links` y `npm test`.
5. Revisa que no queden nombres, dominios ni rutas fijas del repositorio de origen (`git grep -i <nombre-del-origen>`).

Para **importar el patrón** en un repositorio nuevo: copia todo salvo `documents/*`, `documents.manifest.json`, `node_modules` y `_site`; añade tus documentos; ejecuta `npm ci && npm run build && npm test`; habilita Pages con Actions y haz push a `main`.

## Seguridad y sanitización

- markdown-it con `html: false`: el HTML crudo se muestra como texto, nunca se ejecuta (el validador avisa).
- Todo HTML generado pasa por DOMPurify (sin `style`, formularios, iframes, SVG ni MathML) antes de llegar al DOM como `DocumentFragment`. No uses `innerHTML`, `eval` ni `new Function`.
- Enlaces: solo `http(s)`, `mailto`, `tel`, anclas y rutas relativas. Imágenes: solo `https` o relativas. `javascript:`, `data:`, `vbscript:` y `file:` son error, también dentro de opciones y explicaciones.
- Los externos abren en otra pestaña con `rel="noopener noreferrer"`.
- `index.html` declara una CSP estricta (`script-src 'self'`, `style-src 'self'`, `connect-src` limitado a `api.github.com` y `raw.githubusercontent.com`). No añadas scripts ni estilos en línea.
- Sin tokens en el frontend: la API de GitHub se usa sin autenticar (60 solicitudes por hora y por IP). No publiques secretos.
- Workflows con permisos mínimos (Pages: `contents: read`, `pages: write`, `id-token: write`; pull requests: solo `contents: read`), acciones fijadas por SHA, `npm ci` con lockfile y Dependabot.

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
- [ ] La portada separa procedimientos, guías de laboratorio y pruebas de práctica según el modo, y la búsqueda encuentra por título, descripción, etiqueta y contenido.
- [ ] ES/EN cambia toda la interfaz y los bloques `:::lang`, y la preferencia se recuerda.
- [ ] Procedimientos y guías muestran pasos, subpasos, navegación y un porcentaje que sobrevive a una recarga; «Reiniciar» lo borra.
- [ ] Cada pregunta de una prueba se corrige, muestra la respuesta correcta y la explicación, y la prueba da puntuación, aprobado/no aprobado y mejor resultado.
- [ ] Un Markdown fuera de formato hace fallar `npm run validate` con archivo, línea y motivo.
- [ ] El sitio funciona en la raíz y bajo `/{repositorio}/`, y muestra el propietario y el repositorio reales tras desplegar.
- [ ] Ningún nombre, enlace ni ruta fija de otro repositorio.
- [ ] Atribución presente en el código nuevo.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| «No se pudo cargar el índice de documentos» | falta `documents.manifest.json` o se abrió con `file://` | `npm run manifest` y sirve con `npm run serve` |
| «El archivo no sigue el formato» | un `.md` en `/documents` sin sufijo `.steps.md` / `.test.md` | renómbralo o sácalo de `/documents` |
| «Atributo desconocido» / «Atributo mal escrito» | errata en la directiva o valor sin comillas | usa solo los atributos permitidos y `clave="valor"` |
| «necesita exactamente una opción correcta» | pregunta `single` sin `[x]` o con varias | marca una sola; si hay varias correctas usa `multiple` |
| «no usa opciones «- [ ]»» | `true-false`, `text` o `number` con lista de casillas | quita la lista y usa `answer="…"` |
| «fuera de un «:::question»» / «fuera de un «:::step»» | casillas sueltas en el documento | muévelas dentro del bloque que corresponda |
| «no coincide con el sufijo del archivo» | `type` distinto del sufijo | `.steps.md` ↔ `type: "steps"`, `.test.md` ↔ `type: "test"` |
| «slug duplicado» | dos documentos con el mismo `slug` | cambia uno; el `slug` es parte de la URL y del estado |
| El avance o las respuestas se perdieron | cambió `version`, `slug` o los `id` | es intencional: cada versión tiene su propio estado |
| «mismo número de casillas» | variantes `:::lang` con distinta cantidad de `- [ ]` | iguala las casillas/opciones entre idiomas |
| La portada muestra «Documentos con errores de formato» | se actualizó en vivo desde GitHub y algún archivo no es válido | corrige las líneas indicadas y vuelve a actualizar |
| «límite de solicitudes» al actualizar | 60 solicitudes por hora sin token | espera la hora indicada; el sitio sigue con el contenido desplegado |
| El workflow falla en «Configurar GitHub Pages» | Pages no está habilitado con Actions | Settings → Pages → Source: GitHub Actions |
| Iconos vacíos | sprite desactualizado | `npm run vendor` |
