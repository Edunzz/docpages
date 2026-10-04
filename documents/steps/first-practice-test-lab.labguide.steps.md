---
title:
  es: "Laboratorio: crea tu primera prueba de práctica"
  en: "Lab: create your first practice test"
description:
  es: "Escribe una prueba con los siete tipos de pregunta, provoca un error a propósito, corrígelo en «Validar» y publícala."
  en: "Write a test with all seven question types, cause an error on purpose, fix it in “Validate” and publish it."
slug: "first-practice-test-lab"
type: "steps"
version: "1.1.0"
author: "Jose Eduardo Romero Jimenez"
updated: "2026-10-04"
tags: [lab, practice-test, getting-started]
duration:
  es: "40 minutos"
  en: "40 minutes"
level: "beginner"
objectives:
  - es: "Crear un archivo .test.md con el front matter correcto."
    en: "Create a .test.md file with the right front matter."
  - es: "Escribir los siete tipos de pregunta: opción única, opción múltiple, verdadero o falso, respuesta corta, numérica, ordenar y relacionar."
    en: "Write the seven question types: single choice, multiple choice, true or false, short answer, numeric, ordering and matching."
  - es: "Leer un error de formato en «Validar» y corregirlo."
    en: "Read a format error in “Validate” and fix it."
prerequisites:
  - es: "Un navegador. Nada más: el validador funciona en el sitio publicado."
    en: "A browser. Nothing else: the validator works on the published site."
  - es: "Para publicar: acceso de escritura al repositorio."
    en: "To publish: write access to the repository."
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
En este laboratorio escribes una prueba de práctica con una pregunta de cada tipo, ves cómo se marca un error y terminas publicándola. Todo se hace en la pestaña **Validar** del sitio: escribes a la izquierda, ves los errores y la vista previa a la derecha. Marca cada casilla al terminarla: el avance se guarda en este navegador.
:::
:::lang en
In this lab you write a practice test with one question of each type, see how an error gets flagged and finish by publishing it. Everything happens in the site's **Validate** tab: you type on the left and see the errors and the preview on the right. Tick each box when you finish it: progress is saved in this browser.
:::

:::step id="setup" title.es="Crear el archivo" title.en="Create the file"
:::lang es
1. Abre la pestaña **Validar** (arriba a la derecha).
2. Pulsa la plantilla **Prueba de práctica**. Trae un ejemplo de cada tipo de pregunta; en este laboratorio vas a escribir los tuyos.
3. Cambia el nombre del archivo a `mi-primera-prueba.test.md` y deja solo este front matter (borra las preguntas de la plantilla):
:::
:::lang en
1. Open the **Validate** tab (top right).
2. Pick the **Practice test** template. It has an example of each question type; in this lab you will write your own.
3. Rename the file to `my-first-test.test.md` and keep only this front matter (delete the template questions):
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
- [ ] El nombre termina en `.test.md` y usa minúsculas con guiones.
- [ ] El `slug` no lo usa otro documento (si lo usa, el validador te avisa).
:::
:::lang en
- [ ] The name ends in `.test.md` and uses lowercase letters with hyphens.
- [ ] No other document uses the `slug` (if one does, the validator tells you).
:::
:::

:::step id="questions" title.es="Escribir una pregunta de cada tipo" title.en="Write one question of each type"
:::lang es
Cada pregunta es un bloque `:::question` con su tipo (`type`) y se cierra con `:::`. Añade estas siete debajo del front matter, **en este orden**, y comprueba que el validador siga diciendo **Formato correcto** después de cada una.
:::
:::lang en
Each question is a `:::question` block with its type (`type`) and closes with `:::`. Add these seven below the front matter, **in this order**, and check that the validator still says **Format is correct** after each one.
:::

:::substep id="type-single" title.es="1. Opción única (single)" title.en="1. Single choice (single)"
:::lang es
Las opciones son casillas; marca **una sola** correcta con `[x]`.
:::
:::lang en
The options are checkboxes; mark **only one** correct option with `[x]`.
:::

```markdown
:::question type="single"
¿Qué puerto usa HTTPS?
- [ ] 80
- [x] 443
- [ ] 22
:::
```

:::lang es
- [ ] Añadí la pregunta de opción única.
:::
:::lang en
- [ ] I added the single-choice question.
:::
:::

:::substep id="type-multiple" title.es="2. Opción múltiple (multiple)" title.en="2. Multiple choice (multiple)"
:::lang es
Marca con `[x]` **todas** las correctas. Se acierta solo si se eligen exactamente esas.
:::
:::lang en
Mark **every** correct option with `[x]`. It is correct only if exactly those are chosen.
:::

```markdown
:::question type="multiple"
¿Cuáles son protocolos de transporte?
- [x] TCP
- [x] UDP
- [ ] HTTP
:::
```

:::lang es
- [ ] Añadí la pregunta de opción múltiple.
:::
:::lang en
- [ ] I added the multiple-choice question.
:::
:::

:::substep id="type-true-false" title.es="3. Verdadero o falso (true-false)" title.en="3. True or false (true-false)"
:::lang es
Sin opciones: la respuesta va en `answer="true"` o `answer="false"`.
:::
:::lang en
No options: the answer goes in `answer="true"` or `answer="false"`.
:::

```markdown
:::question type="true-false" answer="false"
UDP garantiza que los paquetes lleguen.
:::
```

:::lang es
- [ ] Añadí la pregunta de verdadero o falso.
:::
:::lang en
- [ ] I added the true-or-false question.
:::
:::

:::substep id="type-text" title.es="4. Respuesta corta (text)" title.en="4. Short answer (text)"
:::lang es
Escribe las respuestas aceptadas separadas por `|`. No importan mayúsculas, tildes ni el punto final.
:::
:::lang en
Write the accepted answers separated by `|`. Case, accents and a final period do not matter.
:::

```markdown
:::question type="text" answer="DNS|Domain Name System"
¿Qué servicio traduce nombres de dominio a direcciones IP?
:::
```

:::lang es
- [ ] Añadí la pregunta de respuesta corta.
:::
:::lang en
- [ ] I added the short-answer question.
:::
:::

:::substep id="type-number" title.es="5. Respuesta numérica (number)" title.en="5. Numeric answer (number)"
:::lang es
`answer` es el número; `tolerance` (opcional) es cuánto puede desviarse. Se acepta coma o punto decimal.
:::
:::lang en
`answer` is the number; `tolerance` (optional) is how far it may be off. A decimal comma or dot is accepted.
:::

```markdown
:::question type="number" answer="3.14" tolerance="0.01"
¿Cuánto vale pi con dos decimales?
:::
```

:::lang es
- [ ] Añadí la pregunta numérica.
:::
:::lang en
- [ ] I added the numeric question.
:::
:::

:::substep id="type-order" title.es="6. Ordenar (order)" title.en="6. Ordering (order)"
:::lang es
Escribe la lista numerada **en el orden correcto**: el sitio la muestra desordenada y el lector la ordena con flechas.
:::
:::lang en
Write the numbered list **in the right order**: the site shows it shuffled and the reader sorts it with arrows.
:::

```markdown
:::question type="order"
Ordena las capas del modelo TCP/IP de abajo hacia arriba:

1. Acceso a la red
2. Internet
3. Transporte
4. Aplicación
:::
```

:::lang es
- [ ] Añadí la pregunta de ordenar.
:::
:::lang en
- [ ] I added the ordering question.
:::
:::

:::substep id="type-match" title.es="7. Relacionar (match)" title.en="7. Matching (match)"
:::lang es
Cada línea es `elemento :: pareja`. El lector elige la pareja de cada elemento en una lista desplegable.
:::
:::lang en
Each line is `item :: match`. The reader picks each item's match from a drop-down list.
:::

```markdown
:::question type="match"
Relaciona cada protocolo con su puerto:

- HTTP :: 80
- HTTPS :: 443
- SSH :: 22
:::
```

:::lang es
- [ ] Añadí la pregunta de relacionar.
:::
:::lang en
- [ ] I added the matching question.
:::
:::
:::

:::step id="extras" title.es="Añadir pistas, explicaciones y puntos" title.en="Add hints, explanations and points"
:::lang es
Dentro de una pregunta, `:::hint` es una pista que el lector abre si quiere y `:::explanation` aparece al corregir. `points="2"` hace que la pregunta valga el doble (por defecto vale 1).
:::
:::lang en
Inside a question, `:::hint` is a hint the reader opens if they want and `:::explanation` shows up when grading. `points="2"` makes the question worth double (the default is 1).
:::

```markdown
:::question type="single" points="2"
¿Qué puerto usa HTTPS?
- [ ] 80
- [x] 443
- [ ] 22
:::hint
Es el puerto de HTTP más algo.
:::
:::explanation
HTTPS usa el puerto 443 por defecto; HTTP usa el 80.
:::
:::
```

:::lang es
- [ ] Una pregunta tiene pista y explicación.
- [ ] Una pregunta vale 2 puntos.
:::
:::lang en
- [ ] One question has a hint and an explanation.
- [ ] One question is worth 2 points.
:::
:::

:::step id="break-it" title.es="Provocar un error a propósito" title.en="Cause an error on purpose"
:::lang es
El sitio nunca publica un documento que no siga el formato. Compruébalo: en la primera pregunta cambia `- [x] 443` por `- [ ] 443` (ninguna opción queda marcada). El validador muestra, por ejemplo:

```text
LÍNEA 11
Pregunta 1: una pregunta «single» necesita exactamente una opción correcta «- [x]» (tiene 0).
```

Pulsa el error: el cursor salta a esa línea. Vuelve a poner la `[x]`.

- [ ] Vi el error con su línea y fui a ella con un clic.
- [ ] Lo corregí y el validador volvió a **Formato correcto**.
:::
:::lang en
The site never publishes a document that is not in the format. Try it: in the first question change `- [x] 443` to `- [ ] 443` (no option is marked). The validator shows, for example (the messages are in Spanish):

```text
LINE 11
Pregunta 1: una pregunta «single» necesita exactamente una opción correcta «- [x]» (tiene 0).
```

Click the error: the cursor jumps to that line. Put the `[x]` back.

- [ ] I saw the error with its line and jumped to it with a click.
- [ ] I fixed it and the validator went back to **Format is correct**.
:::
:::

:::step id="try-it" title.es="Probar tu prueba en la vista previa" title.en="Try your test in the preview"
:::lang es
Debajo del resultado está la **vista previa**: es la prueba real. Responde, pulsa **Comprobar** en cada pregunta y mira tu puntuación. Lo que respondas ahí no se guarda.

- [ ] Respondí las siete preguntas y vi la explicación de las que fallé.
- [ ] Vi la puntuación y si aprobé.
:::
:::lang en
Below the result is the **preview**: it is the real test. Answer, press **Check** on each question and look at your score. What you answer there is not saved.

- [ ] I answered the seven questions and saw the explanation of the ones I missed.
- [ ] I saw the score and whether I passed.
:::
:::

:::step id="publish" title.es="Publicarla" title.en="Publish it"
:::lang es
Pulsa **Descargar**, guarda el archivo en `documents/tests/` de tu repositorio y súbelo a `main` (con *push* o con **Add file → Upload files** en GitHub). En uno o dos minutos aparece en **Pruebas de práctica**.

- [ ] El archivo está en `documents/tests/mi-primera-prueba.test.md`.
- [ ] La prueba aparece en la portada del sitio.
:::
:::lang en
Press **Download**, save the file in your repository's `documents/tests/` folder and upload it to `main` (with a push or with **Add file → Upload files** on GitHub). In a minute or two it shows up under **Practice tests**.

- [ ] The file is at `documents/tests/my-first-test.test.md`.
- [ ] The test shows up on the site's home page.
:::
:::

:::lang es
¿Terminaste? Pon a prueba lo que sabes con la [prueba de práctica de ejemplo](../tests/docpages-basics.test.md).
:::
:::lang en
Done? Test what you know with the [example practice test](../tests/docpages-basics.test.md).
:::
