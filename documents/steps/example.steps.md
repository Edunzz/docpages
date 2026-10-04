---
title:
  es: "Publicar documentación en GitHub Pages"
  en: "Publish documentation with GitHub Pages"
description:
  es: "Procedimiento guiado para crear tu copia, validarla y publicarla con GitHub Pages."
  en: "Guided procedure to create your copy, validate it and publish it with GitHub Pages."
slug: "publish-github-pages"
type: "steps"
version: "1.0.0"
author: "Jose Eduardo Romero Jimenez"
updated: "2026-10-03"
tags: [github-pages, documentation, getting-started]
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
Este procedimiento te lleva desde una copia del repositorio hasta un sitio publicado. Marca cada casilla o usa **Marcar como completado**: el avance se guarda solo en este navegador. ¿Cómo se calcula? Consulta el [diagrama del flujo de progreso](../../docs/diagrams/steps-progress-flow.html).
:::
:::lang en
This procedure takes you from a copy of the repository to a published site. Tick each box or use **Mark as complete**: progress is saved only in this browser. How is it calculated? See the [progress flow diagram](../../docs/diagrams/steps-progress-flow.html) (in Spanish).
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

:::step id="validate" title.es="Validar en local" title.en="Validate locally"
:::lang es
Instala las dependencias y ejecuta las comprobaciones. Necesitas Node.js 22 o superior.
:::
:::lang en
Install the dependencies and run the checks. You need Node.js 22 or later.
:::

```bash
npm ci
npm run validate
npm test
```

:::lang es
> [!TIP]
> `npm run preview` construye el sitio en `_site/` y lo sirve bajo `/docpages/`, igual que un sitio de proyecto de GitHub Pages.

- [ ] `npm run validate` termina sin errores.
- [ ] `npm test` pasa todas las pruebas.
:::
:::lang en
> [!TIP]
> `npm run preview` builds the site into `_site/` and serves it under `/docpages/`, just like a GitHub Pages project site.

- [ ] `npm run validate` finishes without errors.
- [ ] `npm test` passes every test.
:::
:::

:::step id="enable-pages" title.es="Habilitar GitHub Pages" title.en="Enable GitHub Pages"
:::lang es
En **Settings → Pages** elige **GitHub Actions** como origen de la publicación. Puedes abrir la página directamente: [configuración de Pages]({{repo_url}}/settings/pages).

| Opción | Valor |
|---|---|
| Source | GitHub Actions |
| Workflow | `.github/workflows/pages.yml` |
| Rama que despliega | `main` |

- [ ] El origen de Pages es **GitHub Actions**.
:::
:::lang en
In **Settings → Pages** choose **GitHub Actions** as the publishing source. You can open the page directly: [Pages settings]({{repo_url}}/settings/pages).

| Option | Value |
|---|---|
| Source | GitHub Actions |
| Workflow | `.github/workflows/pages.yml` |
| Deploying branch | `main` |

- [ ] The Pages source is **GitHub Actions**.
:::
:::

:::step id="publish" title.es="Publicar" title.en="Publish"
:::lang es
Haz *push* a `main`. El workflow valida los documentos, genera `documents.manifest.json` con los datos de tu repositorio y despliega.

> [!NOTE]
> El despliegue puede tardar unos minutos. La URL aparece en la pestaña **Actions**, en el job `deploy`.
:::
:::lang en
Push to `main`. The workflow validates the documents, generates `documents.manifest.json` with your repository data and deploys.

> [!NOTE]
> Deployment can take a few minutes. The URL appears in the **Actions** tab, in the `deploy` job.
:::

```bash
git add .
git commit -m "docs: primera publicación"
git push origin main
```
:::

:::step id="first-document" title.es="Crear tu primer documento" title.en="Create your first document"
:::substep id="create-file" title.es="Crear el archivo" title.en="Create the file"
:::lang es
Crea `documents/steps/mi-procedimiento.steps.md`. El sufijo decide el tipo y debe coincidir con `type`:
:::
:::lang en
Create `documents/steps/my-procedure.steps.md`. The suffix decides the type and must match `type`:
:::

```markdown
---
title: { es: "Mi procedimiento", en: "My procedure" }
description: { es: "Qué logra el lector.", en: "What the reader achieves." }
slug: "mi-procedimiento"
type: "steps"
version: "1.0.0"
updated: "2026-10-03"
---

:::step id="uno" title.es="Primer paso" title.en="First step"
- [ ] Una tarea comprobable.
:::
```
:::

:::substep id="review" title.es="Revisar y publicar" title.en="Review and publish"
:::lang es
Ejecuta `npm run validate`, corrige lo que indique y haz *push*. El documento aparecerá en la portada.

> [!WARNING]
> Si cambias el contenido de forma significativa, sube `version`: el progreso guardado de la versión anterior no se mezcla con el nuevo.
:::
:::lang en
Run `npm run validate`, fix whatever it reports and push. The document will appear on the home page.

> [!WARNING]
> If you change the content significantly, bump `version`: saved progress from the previous version does not mix with the new one.
:::
:::
:::

:::lang es
¿Algo no funciona? Revisa la sección «Solución de problemas» del README o la [validación de ejemplo](../tests/example.test.md).
:::
:::lang en
Something not working? Check the “Troubleshooting” section of the README or the [example validation](../tests/example.test.md).
:::
