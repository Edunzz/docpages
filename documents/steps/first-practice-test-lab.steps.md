---
title:
  es: "Laboratorio: crea tu primera prueba de práctica"
  en: "Lab: create your first practice test"
description:
  es: "Escribe una prueba con distintos tipos de pregunta, provoca un error de formato a propósito, corrígelo y resuelve tu prueba en el sitio."
  en: "Write a test with different question types, cause a format error on purpose, fix it and take your test on the site."
slug: "first-practice-test-lab"
type: "steps"
kind: "lab-guide"
version: "1.0.0"
author: "Jose Eduardo Romero Jimenez"
updated: "2026-10-04"
tags: [lab, practice-test, getting-started]
duration:
  es: "30 minutos"
  en: "30 minutes"
level: "beginner"
objectives:
  - es: "Crear un archivo .test.md con el front matter correcto."
    en: "Create a .test.md file with the right front matter."
  - es: "Escribir preguntas de opción única, verdadero o falso y respuesta corta."
    en: "Write single-choice, true-or-false and short-answer questions."
  - es: "Leer un error de validación y corregirlo."
    en: "Read a validation error and fix it."
prerequisites:
  - es: "Node.js 22 o superior y Git instalados."
    en: "Node.js 22 or later and Git installed."
  - es: "Una copia de este repositorio en tu equipo."
    en: "A copy of this repository on your computer."
links:
  - label:
      es: "Prueba de ejemplo"
      en: "Example test"
    url: "../tests/docpages-basics.test.md"
    icon: "graduation-cap"
    highlight: true
  - label:
      es: "Repositorio"
      en: "Repository"
    url: "{{repo_url}}"
    icon: "github"
reset: true
---

# {{ title }}

:::lang es
En este laboratorio escribes una prueba de práctica de tres preguntas, ves cómo el validador marca un error y terminas resolviendo tu propia prueba. Marca cada casilla al terminarla: el avance se guarda en este navegador.
:::
:::lang en
In this lab you write a three-question practice test, see how the validator flags an error and finish by taking your own test. Tick each box when you finish it: progress is saved in this browser.
:::

:::step id="setup" title.es="Preparar el entorno" title.en="Set up the environment"
:::lang es
Abre una terminal en la carpeta del repositorio e instala las dependencias.
:::
:::lang en
Open a terminal in the repository folder and install the dependencies.
:::

```bash
npm ci
npm run validate
```

:::lang es
- [ ] `npm ci` terminó sin errores.
- [ ] `npm run validate` muestra «0 error(es)».
:::
:::lang en
- [ ] `npm ci` finished without errors.
- [ ] `npm run validate` shows “0 error(es)”.
:::
:::

:::step id="create-file" title.es="Crear el archivo de la prueba" title.en="Create the test file"
:::lang es
Crea `documents/tests/mi-primera-prueba.test.md` con este contenido. El sufijo `.test.md` indica que es una prueba de práctica.
:::
:::lang en
Create `documents/tests/my-first-test.test.md` with this content. The `.test.md` suffix marks it as a practice test.
:::

```markdown
---
title: { es: "Mi primera prueba", en: "My first test" }
description: { es: "Preguntas de repaso.", en: "Review questions." }
slug: "mi-primera-prueba"
type: "test"
version: "1.0.0"
updated: "2026-10-04"
passingScore: 70
---
```

:::lang es
- [ ] El archivo está en `documents/tests/` y su nombre va en minúsculas con guiones.
- [ ] El `slug` no se repite en ningún otro documento.
:::
:::lang en
- [ ] The file is in `documents/tests/` and its name is lowercase with hyphens.
- [ ] The `slug` is not used by any other document.
:::
:::

:::step id="questions" title.es="Escribir las preguntas" title.en="Write the questions"
:::lang es
Cada pregunta es un bloque `:::question` con su tipo (`type`). Añade estas tres debajo del front matter, en este orden.
:::
:::lang en
Each question is a `:::question` block with its type (`type`). Add these three below the front matter, in this order.
:::

:::substep id="question-single" title.es="Opción única" title.en="Single choice"
:::lang es
Las opciones son casillas: marca la correcta con `[x]`.
:::
:::lang en
The options are checkboxes: mark the correct one with `[x]`.
:::

```markdown
:::question type="single"
¿Qué comando valida los documentos?
- [ ] npm start
- [x] npm run validate
- [ ] npm run deploy
:::
```

:::lang es
- [ ] Añadí la pregunta de opción única.
:::
:::lang en
- [ ] I added the single-choice question.
:::
:::

:::substep id="question-true-false" title.es="Verdadero o falso" title.en="True or false"
:::lang es
La respuesta va en `answer`. `:::explanation` es lo que se muestra al corregir.
:::
:::lang en
The answer goes in `answer`. `:::explanation` is what shows up when the question is graded.
:::

```markdown
:::question type="true-false" answer="false"
El avance de los pasos se guarda en un servidor.
:::explanation
Se guarda solo en tu navegador.
:::
:::
```

:::lang es
- [ ] Añadí la pregunta de verdadero o falso con su explicación.
:::
:::lang en
- [ ] I added the true-or-false question with its explanation.
:::
:::

:::substep id="question-text" title.es="Respuesta corta" title.en="Short answer"
:::lang es
Separa las respuestas aceptadas con `|`. No importan las mayúsculas ni las tildes. `:::hint` es una pista opcional.
:::
:::lang en
Separate accepted answers with `|`. Case and accents do not matter. `:::hint` is an optional hint.
:::

```markdown
:::question type="text" answer="main|master"
¿En qué rama se publica el sitio?
:::hint
Es la rama principal del repositorio.
:::
:::
```

:::lang es
- [ ] Añadí la pregunta de respuesta corta con su pista.
:::
:::lang en
- [ ] I added the short-answer question with its hint.
:::
:::
:::

:::step id="break-it" title.es="Provocar un error a propósito" title.en="Cause an error on purpose"
:::lang es
El sitio no publica nada que no siga el formato. Compruébalo: en la pregunta de opción única cambia `- [x] npm run validate` por `- [ ] npm run validate` (ninguna opción queda marcada) y valida.
:::
:::lang en
The site never publishes anything that is not in the format. Try it: in the single-choice question change `- [x] npm run validate` to `- [ ] npm run validate` (no option is marked) and validate.
:::

```bash
npm run validate
```

:::lang es
Verás el archivo, la línea y qué falta:

```text
✖ documents/tests/mi-primera-prueba.test.md
    error   L11: Pregunta 1: una pregunta «single» necesita exactamente una opción correcta «- [x]» (tiene 0).
```

> [!NOTE]
> En GitHub pasa lo mismo: el workflow se detiene, marca el error sobre esa línea del archivo y el sitio publicado no cambia.

- [ ] Vi el error con la línea exacta.
- [ ] Volví a poner la `[x]` y `npm run validate` pasa sin errores.
:::
:::lang en
You will see the file, the line and what is missing (validator messages are in Spanish):

```text
✖ documents/tests/my-first-test.test.md
    error   L11: Pregunta 1: una pregunta «single» necesita exactamente una opción correcta «- [x]» (tiene 0).
```

> [!NOTE]
> GitHub does the same: the workflow stops, flags the error on that line of the file and the published site does not change.

- [ ] I saw the error with the exact line.
- [ ] I put the `[x]` back and `npm run validate` passes without errors.
:::
:::

:::step id="take-it" title.es="Resolver tu prueba" title.en="Take your test"
:::lang es
Genera el índice y abre la vista previa. Tu prueba aparece en **Pruebas de práctica**.
:::
:::lang en
Generate the index and open the preview. Your test shows up under **Practice tests**.
:::

```bash
npm run manifest
npm run preview
```

:::lang es
Abre <http://localhost:8080/docpages/> en el navegador.

- [ ] Respondí las tres preguntas y pulsé **Comprobar** en cada una.
- [ ] Vi mi puntuación y si aprobé.
- [ ] Probé **Intentar de nuevo**.
:::
:::lang en
Open <http://localhost:8080/docpages/> in the browser.

- [ ] I answered the three questions and pressed **Check** on each one.
- [ ] I saw my score and whether I passed.
- [ ] I tried **Try again**.
:::
:::

:::lang es
¿Terminaste? Pon a prueba lo que sabes con la [prueba de práctica de ejemplo](../tests/docpages-basics.test.md).
:::
:::lang en
Done? Test what you know with the [example practice test](../tests/docpages-basics.test.md).
:::
