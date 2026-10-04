---
name: documentation-pages
description: Crea, valida, migra y publica documentación bilingüe (es/en) en GitHub Pages a partir de Markdown, sin compilar nada, con tres tipos de documento definidos por el nombre del archivo, procedimientos ({titulo}.procedure.steps.md), guías de laboratorio ({titulo}.labguide.steps.md) y pruebas de práctica ({titulo}.test.md, con preguntas de opción única o múltiple, verdadero/falso, respuesta corta, numérica, ordenar y relacionar). Úsalo para convertir preguntas, opciones y respuestas en una prueba de entrenamiento, escribir una guía de laboratorio o un procedimiento, validarlos, cambiar entre los modos all/steps/tests, migrar documentación o diagnosticar el sitio.
---

# documentation-pages

Sitio estático (HTML + CSS + JavaScript, sin backend ni paso de compilación) que publica en GitHub Pages los Markdown de `/documents`. GitHub Pages sirve los archivos tal cual desde la rama `main`; el navegador descubre solo los documentos y el repositorio. Un fork o una plantilla funcionan sin editar nombres ni enlaces.

Tres tipos de documento. **El final del nombre del archivo decide el tipo**:

| Tipo | Archivo | Para qué |
|---|---|---|
| Procedimiento | `documents/steps/**/{titulo}.procedure.steps.md` | Pasos a seguir, con casillas y progreso |
| Guía de laboratorio | `documents/steps/**/{titulo}.labguide.steps.md` | Práctica guiada con objetivos, requisitos, duración y nivel |
| Prueba de práctica | `documents/tests/**/{titulo}.test.md` | Preguntas de entrenamiento con corrección, explicación y puntuación |

**Regla de oro: lo que no sigue el formato es un error.** Todo `.md` dentro de `/documents` se valida: un archivo mal nombrado (también un `.steps.md` sin `procedure` ni `labguide`), un atributo desconocido, una casilla fuera de su bloque o una pregunta sin respuesta correcta aparecen en la portada en «Documentos con errores de formato», con su línea, y no se publican como tarjeta.

## Cuándo activarlo

- El usuario da preguntas, opciones y respuestas (o afirmaciones de verdadero/falso) y quiere una prueba de práctica o de entrenamiento.
- Crear, editar, traducir o revisar un procedimiento, una guía de laboratorio o una prueba.
- Publicar o depurar el sitio en GitHub Pages (rutas bajo `/{repositorio}/`, documentos que no aparecen).
- Habilitar solo procedimientos y guías, solo pruebas o todo.
- Migrar documentación de otro repositorio a este formato o importar el patrón en un repositorio nuevo.
- Revisar seguridad, accesibilidad o la atribución del proyecto.

## Prerrequisitos

- Un repositorio **público** en GitHub con **Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**.
- Nada más para publicar: ni Node, ni npm, ni Actions. Las librerías del navegador ya están en `assets/vendor`.
- Para ver la copia local: cualquier servidor web estático que liste carpetas (VS Code **Live Server**, `python -m http.server 8000`). Abrir `index.html` con doble clic no funciona.
- Opcional, para agentes: Node.js 22 o superior para validar por consola (sin `npm install`).

## Estructura obligatoria

```text
index.html · 404.html · manifest.webmanifest · .nojekyll
assets/css/app.css                   estilos (tokens claro/oscuro, estados accesibles, responsive)
assets/js/config.js                  DOCUMENTATION_MODE y override opcional del repositorio
assets/js/catalog.js                 descubre los documentos (API de GitHub en Pages, listado de carpetas en local)
assets/js/validator.js               pestaña «Validar» (#/validate)
assets/js/steps.js · quiz.js         procedimientos/guías y pruebas de práctica
assets/js/*.js                       app, router, i18n, parser, validación, plantillas (sin globales)
assets/vendor/                       markdown-it, js-yaml, DOMPurify, Prism (versionados, sin CDN)
assets/icons/                        logo.svg y sprite.svg
documents/steps/**/{titulo}.procedure.steps.md
documents/steps/**/{titulo}.labguide.steps.md
documents/tests/**/{titulo}.test.md  (+ imágenes relativas si hacen falta)
schemas/steps.schema.json · test.schema.json   front matter (JSON Schema 2020-12)
scripts/validate-documents.mjs       validación por consola (opcional)
.github/skills/documentation-pages/  este skill
```

`.nojekyll` debe quedarse en la raíz: sin él, GitHub Pages transformaría los `.md` con front matter y el sitio no podría leerlos.

## Front matter común

| Campo | Obligatorio | Regla |
|---|---|---|
| `title` | sí | texto o `{ es, en }` |
| `description` | sí | texto o `{ es, en }` |
| `slug` | sí | kebab-case, único entre todos los documentos y estable (es parte de la URL y de la clave del estado guardado) |
| `type` | sí | `steps` (procedimientos y guías) o `test` (pruebas), igual al sufijo |
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

Solo en `.test.md`: `passingScore` (0–100, por defecto 70), `feedback` (`immediate` | `end`) y `shuffle` (baraja las opciones de `single` y `multiple`). No hay campo `kind`: el tipo lo da el nombre. Cualquier otro campo es un error.

`links[].url` admite `http(s)`, `mailto`, rutas relativas (un `.md` de otro documento se convierte en su ruta interna) y tokens. Iconos: los de `assets/js/icons.js` (por ejemplo `github`, `external-link`, `book-open`, `globe`, `flask-conical`, `graduation-cap`).

Tokens (se resuelven en el navegador con el repositorio detectado): `{{repo_url}}`, `{{pages_url}}`, `{{owner}}`, `{{repo_name}}`, `{{repo}}`, `{{clone_url}}`, `{{branch}}`; además `{{ title }}`, `{{ description }}`, `{{ version }}`, `{{ author }}`, `{{ updated }}`, `{{ slug }}`. La primera línea `# {{ title }}` la consume la cabecera de la página.

## Procedimientos: reglas para crear `.procedure.steps.md`

```markdown
---
title: { es: "Instalar el agente", en: "Install the agent" }
description: { es: "Pasos para instalarlo.", en: "Steps to install it." }
slug: "instalar-agente"
type: "steps"
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
- Progreso por **hojas**: cada casilla (clave `{nodo}#{n}`), cada subpaso sin casillas y cada paso sin subpasos ni casillas. `%` = hojas hechas / total, redondeado hacia abajo. Diagrama: `docs/diagrams/steps-progress-flow.html`.
- Las variantes `:::lang` de un mismo bloque deben tener el mismo número de casillas.
- Estado local: `localStorage` → `docpages:{owner/repo}:{slug}:{version}:steps`.
- Avisos: `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, `[!CAUTION]`. Los bloques de código tienen botón «Copiar».

## Guías de laboratorio

Mismo formato que un procedimiento, con el sufijo `.labguide.steps.md` y, normalmente, `objectives`, `prerequisites`, `duration` y `level` (se muestran en la cabecera). El sitio las lista en su propia sección y usa textos de laboratorio («Progreso del laboratorio», «¡Laboratorio completado!»).

````markdown
---
title: { es: "Laboratorio: primeros pasos con Docker", en: "Lab: getting started with Docker" }
description: { es: "Ejecuta tu primer contenedor.", en: "Run your first container." }
slug: "lab-docker-intro"
type: "steps"
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

Buenas prácticas de laboratorio: un objetivo verificable por paso, comandos copiables en bloques de código, una casilla por resultado observable («La salida muestra…») y un paso final de comprobación. Ejemplo completo (enseña los siete tipos de pregunta): `documents/steps/first-practice-test-lab.labguide.steps.md`.

## Pruebas de práctica: reglas para crear `.test.md`

```markdown
---
title: { es: "Repaso de redes", en: "Networking review" }
description: { es: "Preguntas de práctica.", en: "Practice questions." }
slug: "repaso-redes"
type: "test"
version: "1.0.0"
updated: "2026-10-04"
passingScore: 70
feedback: "immediate"
shuffle: true
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

Cada `:::question` lleva `type` y, opcionalmente, `id` (si falta: `q1`, `q2`…), `points` (entero 1–100, por defecto 1), un `:::hint` (pista que el lector abre si quiere) y un `:::explanation` (se muestra al corregir). Todo lo que no es la lista de respuestas es el enunciado (puede tener código, imágenes, tablas…). `feedback: "immediate"` muestra «Comprobar» en cada pregunta; `"end"` corrige todo al finalizar.

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

Interactivo y local: respuestas, preguntas comprobadas, mejor resultado e intentos. Clave: `docpages:{owner/repo}:{slug}:{version}:test`. Una columna lateral lista las preguntas con su estado. «Intentar de nuevo» baraja de nuevo y conserva el mejor resultado; «Reiniciar» lo borra todo.

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
6. Valida (ver «Validar») y corrige cada error: traen línea y motivo.

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

Ejemplo completo con los siete tipos y ambos idiomas: `documents/tests/docpages-basics.test.md`. La plantilla «Prueba de práctica» de la pestaña Validar también trae los siete.

## Validar

- **Personas:** pestaña **Validar** del sitio (`#/validate`), publicado o local. Abren o arrastran `.md` (o parten de una plantilla), ven cada error con su línea (un clic lleva a ella), la vista previa real cuando no hay errores y el destino (`documents/…`). Pueden descargar o copiar el resultado. Detecta también `slug` repetidos con el sitio. Nada sale del navegador.
- **Portada:** cualquier `.md` de `/documents` con errores aparece en «Documentos con errores de formato», con su línea.
- **Agentes y automatizaciones (opcional):** `node scripts/validate-documents.mjs` (solo Node; las librerías salen de `assets/vendor`, sin `npm install`). `--json` devuelve `{ errors, warnings, documents: [{ path, category, errors: [{ line, message }] }] }` para corregir en bucle; `--strict` falla también con avisos; en GitHub Actions escribe anotaciones `::error file=…,line=…::`.

## Publicar

1. Guarda el archivo en su carpeta (`documents/steps` o `documents/tests`).
2. Súbelo a `main` (*push* o **Add file → Upload files** en GitHub).
3. GitHub Pages lo publica en uno o dos minutos («pages build and deployment» en **Actions**). No hay manifiesto que regenerar: en Pages la lista de documentos sale del árbol público del repositorio (API de GitHub, una consulta guardada 10 minutos en cada navegador; si falla, se usa la última lista guardada).
4. En local, la portada muestra la carpeta `documents/` que sirve tu servidor, y los enlaces `{{repo_url}}` apuntan al remoto `origin` de `.git/config` si el servidor lo sirve.

Con un dominio propio, define `CONFIG.repository = { owner, name }` en `config.js` (la URL ya no dice qué repositorio es).

## Comandos

No hacen falta para usar ni publicar el sitio. Para mantener el código:

```bash
node scripts/validate-documents.mjs   # valida /documents (también: --json, --strict, --mode steps|tests)
npm ci                                # instala las herramientas de desarrollo
npm test                              # node:test + jsdom + axe-core
npm run check:links                   # enlaces internos, imports e iconos
npm run vendor                        # actualiza assets/vendor y el sprite tras cambiar librerías o iconos
python -m http.server 8000            # sirve el sitio en local (o VS Code Live Server)
```

## Modos: qué se publica

En `assets/js/config.js`:

```js
export const DOCUMENTATION_MODE = "all";
// Valores: "all", "steps", "tests"
```

| Modo | Portada y rutas | Validación |
|---|---|---|
| `all` | Procedimientos, guías de laboratorio y pruebas de práctica | todo `/documents` |
| `steps` | Procedimientos y guías; `#/tests/...` muestra «deshabilitado» | ignora `.test.md` |
| `tests` | solo pruebas de práctica | ignora los `.steps.md` |

Cambia el valor y sube el archivo: navegación, validación y portada leen el mismo `config.js`.

## Migrar documentos desde otro repositorio

1. Copia los Markdown fuente a una carpeta temporal **fuera** de `/documents` (dentro, cualquier `.md` que no siga el formato es error).
2. Por cada guía paso a paso crea `documents/steps/{titulo}.procedure.steps.md` (o `.labguide.steps.md` si es un laboratorio):
   - Título H1 → `title`; primer párrafo → `description`; inventa un `slug` estable.
   - Cada sección `##` → `:::step id="…" title.es="…" title.en="…"` … `:::`; cada `###` dentro → `:::substep`.
   - Acciones verificables → casillas `- [ ]`; el resto queda como texto.
   - «Objetivos» y «Requisitos» de un laboratorio → `objectives` y `prerequisites`.
   - URLs del repositorio de origen → tokens (`{{repo_url}}`, `{{clone_url}}`, `{{repo_name}}`, `{{owner}}`, `{{pages_url}}`).
3. Por cada cuestionario, examen o banco de preguntas crea `documents/tests/{titulo}.test.md` siguiendo «Convertir una lista de preguntas».
4. Valida cada archivo (pestaña Validar o `node scripts/validate-documents.mjs`) y corrige los errores.
5. Revisa que no queden nombres, dominios ni rutas fijas del repositorio de origen (`git grep -i <nombre-del-origen>`).

Para **importar el patrón** en un repositorio nuevo: copia todo salvo `documents/*` y `node_modules`; añade tus documentos; habilita Pages desde la rama `main` (raíz) y súbelo.

## Seguridad y sanitización

- markdown-it con `html: false`: el HTML crudo se muestra como texto, nunca se ejecuta (el validador avisa).
- Todo HTML generado pasa por DOMPurify (sin `style`, formularios, iframes, SVG ni MathML) antes de llegar al DOM como `DocumentFragment`. No uses `innerHTML`, `eval` ni `new Function`.
- Enlaces: solo `http(s)`, `mailto`, `tel`, anclas y rutas relativas. Imágenes: solo `https` o relativas. `javascript:`, `data:`, `vbscript:` y `file:` son error, también dentro de opciones y explicaciones.
- Los externos abren en otra pestaña con `rel="noopener noreferrer"`.
- `index.html` declara una CSP estricta (`script-src 'self'`, `style-src 'self'`, `connect-src` limitado a `api.github.com` y `raw.githubusercontent.com`). No añadas scripts ni estilos en línea ni CDNs.
- Sin tokens en el frontend: la API de GitHub se usa sin autenticar (60 solicitudes por hora y por IP; el sitio usa una cada 10 minutos por navegador). No publiques secretos.
- La pestaña Validar trabaja solo en el navegador: no sube archivos a ningún sitio.

## Atribución

Todo archivo de código o script (JS, MJS, CSS, HTML, YAML, SVG) empieza con:

```text
Desarrollado por Jose Eduardo Romero Jimenez
https://github.com/Edunzz
```

con la sintaxis de comentario del lenguaje. Los JSON no admiten comentarios: la autoría va en `$comment` de los esquemas. Las pruebas lo verifican.

## Criterios de aceptación

- [ ] El archivo termina en `.procedure.steps.md`, `.labguide.steps.md` o `.test.md` y está en su carpeta.
- [ ] La pestaña Validar dice «Formato correcto» y la vista previa se ve como se espera.
- [ ] La portada separa procedimientos, guías de laboratorio y pruebas de práctica según el modo, y la búsqueda encuentra por título, descripción, etiqueta y contenido.
- [ ] ES/EN cambia toda la interfaz y los bloques `:::lang`, y la preferencia se recuerda.
- [ ] Procedimientos y guías muestran pasos, subpasos, navegación y un porcentaje que sobrevive a una recarga; «Reiniciar» lo borra.
- [ ] Cada pregunta se corrige, muestra la respuesta correcta y la explicación, y la prueba da puntuación, aprobado/no aprobado y mejor resultado.
- [ ] Un Markdown fuera de formato aparece con su error y su línea, y no se publica como tarjeta.
- [ ] El sitio funciona en la raíz y bajo `/{repositorio}/`, en móvil y en escritorio, y muestra el propietario y el repositorio reales.
- [ ] Ningún nombre, enlace ni ruta fija de otro repositorio; atribución presente en el código nuevo.

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| «Abre el sitio con un servidor web» | se abrió `index.html` con doble clic (`file://`) | VS Code Live Server o `python -m http.server 8000` |
| «Tu servidor no muestra el contenido de las carpetas» | el servidor local no lista carpetas | usa Live Server o `python -m http.server`; o valida archivo por archivo en Validar |
| «El archivo no sigue el formato» / «Indica el tipo en el nombre» | el nombre no termina en `.procedure.steps.md`, `.labguide.steps.md` o `.test.md` | renómbralo o sácalo de `/documents` |
| «kind ya no se usa» | front matter antiguo | borra la línea `kind:`; el tipo lo da el nombre |
| «Atributo desconocido» / «Atributo mal escrito» | errata en la directiva o valor sin comillas | usa solo los atributos permitidos y `clave="valor"` |
| «necesita exactamente una opción correcta» | pregunta `single` sin `[x]` o con varias | marca una sola; si hay varias correctas usa `multiple` |
| «no usa opciones «- [ ]»» | `true-false`, `text` o `number` con lista de casillas | quita la lista y usa `answer="…"` |
| «fuera de un «:::question»» / «fuera de un «:::step»» | casillas sueltas en el documento | muévelas dentro del bloque que corresponda |
| «slug duplicado» / «ya lo usa» | dos documentos con el mismo `slug` | cambia uno; el `slug` es parte de la URL y del estado |
| El documento nuevo no aparece en Pages | Pages aún publica o la lista guardada tiene menos de 10 minutos | espera uno o dos minutos y pulsa «Actualizar» en la portada |
| «límite de consultas a la API» | 60 solicitudes por hora sin token, compartidas por IP | espera la hora indicada; se usa la última lista guardada |
| El avance o las respuestas se perdieron | cambió `version`, `slug` o los `id` | es intencional: cada versión tiene su propio estado |
| Pages muestra los `.md` como HTML | falta `.nojekyll` en la raíz | vuelve a añadir el archivo vacío `.nojekyll` |
| Iconos vacíos | sprite desactualizado | `npm run vendor` (desarrollo) |
