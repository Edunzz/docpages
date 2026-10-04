---
title:
  es: "Prueba de práctica: fundamentos de DocPages"
  en: "Practice test: DocPages basics"
description:
  es: "Ocho preguntas, una de cada tipo, para repasar cómo se escriben, validan y publican los documentos."
  en: "Eight questions, one of each type, to review how documents are written, validated and published."
slug: "docpages-basics"
type: "test"
version: "1.1.0"
author: "Jose Eduardo Romero Jimenez"
updated: "2026-10-04"
tags: [practice, quiz, getting-started]
duration:
  es: "10 minutos"
  en: "10 minutes"
level: "beginner"
objectives:
  - es: "Reconocer los tres tipos de documento y sus archivos."
    en: "Recognize the three document types and their files."
  - es: "Saber cómo se valida y se publica el contenido."
    en: "Know how content is validated and published."
passingScore: 70
feedback: "immediate"
shuffle: true
links:
  - label:
      es: "Laboratorio: crea tu primera prueba"
      en: "Lab: create your first test"
    url: "../steps/first-practice-test-lab.labguide.steps.md"
    icon: "flask-conical"
    highlight: true
reset: true
---

# {{ title }}

:::lang es
Responde cada pregunta y pulsa **Comprobar** para ver si acertaste y por qué. Necesitas un 70 % para aprobar. Tus respuestas se guardan solo en este navegador.
:::
:::lang en
Answer each question and press **Check** to see whether you got it right and why. You need 70% to pass. Your answers are saved only in this browser.
:::

:::question id="suffix" type="single"
:::lang es
¿Cómo se llama el archivo de una **guía de laboratorio**?
:::
:::lang en
What is the file name of a **lab guide**?
:::

- [x] `mi-lab.labguide.steps.md`
- [ ] `mi-lab.procedure.steps.md`
- [ ] `mi-lab.test.md`
- [ ] `mi-lab.md`

:::explanation
:::lang es
El final del nombre decide el tipo: `.procedure.steps.md` es un procedimiento, `.labguide.steps.md` una guía de laboratorio y `.test.md` una prueba de práctica. Un `.md` sin ese sufijo es un error.
:::
:::lang en
The end of the name decides the type: `.procedure.steps.md` is a procedure, `.labguide.steps.md` a lab guide and `.test.md` a practice test. A `.md` without that suffix is an error.
:::
:::
:::

:::question id="storage" type="true-false" answer="false"
:::lang es
El avance de los procedimientos y tus respuestas se guardan en un servidor.
:::
:::lang en
Procedure progress and your answers are stored on a server.
:::

:::explanation
:::lang es
Falso: se guardan solo en este navegador (`localStorage`). Por eso **Reiniciar** los borra y otro equipo no los ve.
:::
:::lang en
False: they are stored only in this browser (`localStorage`). That is why **Reset** clears them and another computer does not see them.
:::
:::
:::

:::question id="safe-links" type="multiple" points="2"
:::lang es
¿Qué enlaces se permiten dentro de un documento? Marca todos los que correspondan.
:::
:::lang en
Which links are allowed inside a document? Mark every one that applies.
:::

- [x] `https://example.com`
- [x] `mailto:team@example.com`
- [ ] `javascript:alert(1)`
- [ ] `data:text/html,hello`

:::explanation
:::lang es
Solo se permiten `http(s)`, `mailto`, `tel`, anclas y rutas relativas. `javascript:` y `data:` se bloquean porque podrían ejecutar código; el validador los marca como error.
:::
:::lang en
Only `http(s)`, `mailto`, `tel`, anchors and relative paths are allowed. `javascript:` and `data:` are blocked because they could run code; the validator flags them as errors.
:::
:::
:::

:::question id="validate-command" type="text" answer="Validar|Validate|Validador|Validator"
:::lang es
¿Cómo se llama la pestaña del sitio que revisa un documento y marca cada error con su línea?
:::
:::lang en
What is the name of the site tab that checks a document and flags each error with its line?
:::

:::hint
:::lang es
Está en la barra superior, junto al selector de idioma.
:::
:::lang en
It is in the top bar, next to the language switch.
:::
:::

:::explanation
:::lang es
**Validar** revisa el Markdown en tu navegador, sin instalar nada: muestra los errores con su línea y, cuando no hay errores, la vista previa.
:::
:::lang en
**Validate** checks the Markdown in your browser, without installing anything: it shows the errors with their line and, when there are none, the preview.
:::
:::
:::

:::question id="percent" type="number" answer="66"
:::lang es
Un procedimiento tiene 3 tareas y completaste 2. ¿Qué porcentaje de avance muestra? Escribe solo el número.
:::
:::lang en
A procedure has 3 tasks and you completed 2. What progress percentage does it show? Type only the number.
:::

:::explanation
:::lang es
2 de 3 es 66,6 %, y el avance se redondea **hacia abajo**: muestra 66 %. Así el 100 % solo aparece cuando todo está hecho.
:::
:::lang en
2 of 3 is 66.6%, and progress is rounded **down**: it shows 66%. That way 100% only appears when everything is done.
:::
:::
:::

:::question id="workflow-order" type="order"
:::lang es
Ordena los pasos para publicar un documento nuevo:

1. Escribir el documento en Markdown
2. Revisarlo en la pestaña Validar
3. Guardarlo en `documents/` y subirlo a `main`
4. GitHub Pages lo publica
:::
:::lang en
Put the steps to publish a new document in order:

1. Write the document in Markdown
2. Check it in the Validate tab
3. Save it in `documents/` and upload it to `main`
4. GitHub Pages publishes it
:::

:::explanation
:::lang es
Primero se escribe y se revisa en «Validar»; después se sube a `main` y GitHub Pages publica los archivos tal cual, sin compilar nada. Si un documento tuviera errores, el sitio lo mostraría marcado en lugar de publicarlo.
:::
:::lang en
First you write it and check it in “Validate”; then you upload it to `main` and GitHub Pages publishes the files as they are, without building anything. If a document had errors, the site would show it flagged instead of publishing it.
:::
:::
:::

:::question id="directives" type="match" points="2"
:::lang es
Relaciona cada directiva con su uso:

- `:::step` :: Un paso de un procedimiento o de una guía
- `:::question` :: Una pregunta de una prueba de práctica
- `:::lang es` :: Un bloque que solo se ve en español
- `:::explanation` :: El texto que aparece al corregir
:::
:::lang en
Match each directive with what it does:

- `:::step` :: A step of a procedure or a guide
- `:::question` :: A question of a practice test
- `:::lang es` :: A block shown only in Spanish
- `:::explanation` :: The text shown when grading
:::
:::

:::question id="find-the-error" type="single"
:::lang es
Esta pregunta no pasa la validación. ¿Por qué?
:::
:::lang en
This question fails validation. Why?
:::

```markdown
:::question type="single"
¿Cuánto es 2 + 2?
- [ ] 3
- [ ] 4
:::
```

:::lang es
- [x] No marca la respuesta correcta con `[x]`.
- [ ] Le falta el atributo `id`.
- [ ] Le falta el atributo `points`.
- [ ] Las preguntas no pueden llevar números.
:::
:::lang en
- [x] It does not mark the correct answer with `[x]`.
- [ ] It is missing the `id` attribute.
- [ ] It is missing the `points` attribute.
- [ ] Questions cannot contain numbers.
:::

:::explanation
:::lang es
`id` y `points` son opcionales: las preguntas se numeran solas y valen 1 punto por defecto. Lo obligatorio en una pregunta `single` es marcar exactamente una opción con `[x]`.
:::
:::lang en
`id` and `points` are optional: questions are numbered automatically and are worth 1 point by default. What a `single` question requires is exactly one option marked with `[x]`.
:::
:::
:::
