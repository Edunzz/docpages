---
title:
  es: "Publicar documentación en GitHub Pages"
  en: "Publish documentation with GitHub Pages"
description:
  es: "Procedimiento guiado para crear tu copia, revisar tus documentos y publicarlos con GitHub Pages, sin instalar nada."
  en: "Guided procedure to create your copy, check your documents and publish them with GitHub Pages, without installing anything."
slug: "publish-github-pages"
type: "steps"
version: "1.2.0"
author: "Jose Eduardo Romero Jimenez"
updated: "2026-10-04"
tags: [github-pages, documentation, getting-started]
duration:
  es: "15 minutos"
  en: "15 minutes"
level: "beginner"
links:
  - label:
      es: "Repositorio"
      en: "Repository"
    url: "{{repo_url}}"
    icon: "github"
    highlight: true
  - label:
      es: "Configuración de Pages"
      en: "Pages settings"
    url: "{{repo_url}}/settings/pages"
    icon: "external-link"
  - label:
      es: "Documentación de GitHub Pages"
      en: "GitHub Pages docs"
    url: "https://docs.github.com/pages"
    icon: "book-open"
reset: true
---

# {{ title }}

:::lang es
Este procedimiento te lleva desde una copia del repositorio hasta un sitio publicado. No necesitas instalar nada: GitHub publica los archivos tal cual y el sitio descubre solo tus documentos. Marca cada casilla o usa **Marcar como completado**: el avance se guarda en este navegador. ¿Cómo se calcula? Consulta el [diagrama del flujo de progreso](../../docs/diagrams/steps-progress-flow.html).
:::
:::lang en
This procedure takes you from a copy of the repository to a published site. You don't need to install anything: GitHub publishes the files as they are and the site finds your documents by itself. Tick each box or use **Mark as complete**: progress is saved in this browser. How is it calculated? See the [progress flow diagram](../../docs/diagrams/steps-progress-flow.html) (in Spanish).
:::

:::step id="prepare" title.es="Preparar el repositorio" title.en="Prepare the repository"
:::lang es
Crea tu copia con **Use this template** o con un *fork*. No hace falta editar nombres ni enlaces: al publicarse, el sitio detecta el propietario y el nombre del repositorio.
:::
:::lang en
Create your copy with **Use this template** or a fork. There is no need to edit names or links: once published, the site detects the repository owner and name.
:::

:::substep id="prepare-branch" title.es="Verificar la rama" title.en="Verify the branch"
:::lang es
- [ ] Abre el repositorio en GitHub.
- [ ] Confirma que existe la rama `main`.
:::
:::lang en
- [ ] Open the repository on GitHub.
- [ ] Confirm that the `main` branch exists.
:::
:::

:::substep id="prepare-files" title.es="Verificar los archivos" title.en="Verify the files"
:::lang es
- [ ] Existe `index.html` en la raíz.
- [ ] Existen las carpetas `documents/steps` y `documents/tests`.
:::
:::lang en
- [ ] `index.html` exists at the root.
- [ ] The `documents/steps` and `documents/tests` folders exist.
:::
:::
:::

:::step id="enable-pages" title.es="Habilitar GitHub Pages" title.en="Enable GitHub Pages"
:::lang es
En **Settings → Pages** publica desde la rama. Puedes abrir la página directamente: [configuración de Pages]({{repo_url}}/settings/pages).

| Opción | Valor |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` |
| Folder | `/ (root)` |

- [ ] Pages publica la rama `main` desde la raíz.
:::
:::lang en
In **Settings → Pages**, publish from the branch. You can open the page directly: [Pages settings]({{repo_url}}/settings/pages).

| Option | Value |
|---|---|
| Source | Deploy from a branch |
| Branch | `main` |
| Folder | `/ (root)` |

- [ ] Pages publishes the `main` branch from the root.
:::
:::

:::step id="write" title.es="Escribir y revisar tu documento" title.en="Write and check your document"
:::substep id="create-file" title.es="Elegir el nombre" title.en="Pick the name"
:::lang es
El final del nombre decide el tipo de documento:

| Tipo | Nombre | Carpeta |
|---|---|---|
| Procedimiento | `mi-guia.procedure.steps.md` | `documents/steps` |
| Guía de laboratorio | `mi-lab.labguide.steps.md` | `documents/steps` |
| Prueba de práctica | `mi-prueba.test.md` | `documents/tests` |

Usa minúsculas, números y guiones antes del sufijo.
:::
:::lang en
The end of the name decides the document type:

| Type | Name | Folder |
|---|---|---|
| Procedure | `my-guide.procedure.steps.md` | `documents/steps` |
| Lab guide | `my-lab.labguide.steps.md` | `documents/steps` |
| Practice test | `my-test.test.md` | `documents/tests` |

Use lowercase letters, numbers and hyphens before the suffix.
:::
:::

:::substep id="check-file" title.es="Revisarlo en «Validar»" title.en="Check it in “Validate”"
:::lang es
Abre la pestaña **Validar** del sitio (arriba a la derecha). Abre o arrastra tu archivo, o empieza desde una plantilla. Cada error indica su línea; al pulsarlo, el cursor va a esa línea. Cuando no hay errores aparece la vista previa.

- [ ] El validador dice **Formato correcto**.
- [ ] La vista previa se ve como esperabas.
:::
:::lang en
Open the site's **Validate** tab (top right). Open or drop your file, or start from a template. Each error shows its line; clicking it moves the cursor there. When there are no errors, the preview shows up.

- [ ] The validator says **Format is correct**.
- [ ] The preview looks as expected.
:::
:::
:::

:::step id="publish" title.es="Publicar" title.en="Publish"
:::lang es
Guarda el archivo en su carpeta y haz *push* a `main` (o súbelo con **Add file → Upload files** en GitHub). Pages lo publica en uno o dos minutos y aparece solo en la portada.

> [!NOTE]
> Puedes seguir la publicación en la pestaña **Actions**, en «pages build and deployment».
:::
:::lang en
Save the file in its folder and push to `main` (or upload it with **Add file → Upload files** on GitHub). Pages publishes it in a minute or two and it shows up on the home page by itself.

> [!NOTE]
> You can follow the publication in the **Actions** tab, under “pages build and deployment”.
:::

```bash
git add documents
git commit -m "docs: nuevo documento"
git push origin main
```
:::

:::step id="local-preview" title.es="Verlo en tu equipo (opcional)" title.en="See it on your computer (optional)"
:::lang es
Para ver tu copia local antes de subirla, sirve la carpeta del repositorio con un servidor web: en VS Code, **Open with Live Server**; o en una terminal:

```bash
python -m http.server 8000
```

Abre <http://localhost:8000/>: la portada muestra lo que hay en **tu** carpeta `documents/`, con los errores marcados.

- [ ] Vi mis documentos en la copia local.
:::
:::lang en
To see your local copy before uploading it, serve the repository folder with a web server: in VS Code, **Open with Live Server**; or in a terminal:

```bash
python -m http.server 8000
```

Open <http://localhost:8000/>: the home page shows what is in **your** `documents/` folder, with errors flagged.

- [ ] I saw my documents in the local copy.
:::
:::

:::lang es
¿Quieres repasar? Haz la [prueba de práctica](../tests/docpages-basics.test.md) o sigue el [laboratorio para crear tu primera prueba](first-practice-test-lab.labguide.steps.md).
:::
:::lang en
Want to review? Take the [practice test](../tests/docpages-basics.test.md) or follow the [lab to create your first test](first-practice-test-lab.labguide.steps.md).
:::
