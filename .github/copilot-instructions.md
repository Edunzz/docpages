# Instrucciones para GitHub Copilot

Este repositorio publica documentación bilingüe (español/inglés) en GitHub Pages a partir de Markdown, sin compilar nada: GitHub Pages sirve la rama `main` tal cual. Antes de crear, editar o migrar documentos, lee y sigue el skill [`.github/skills/documentation-pages/SKILL.md`](skills/documentation-pages/SKILL.md).

## Reglas rápidas

- Tres tipos de documento y **el final del nombre decide el tipo**: procedimientos (`documents/steps/**/{titulo}.procedure.steps.md`), guías de laboratorio (`documents/steps/**/{titulo}.labguide.steps.md`, con `objectives`, `prerequisites`, `duration`, `level`) y pruebas de práctica (`documents/tests/**/{titulo}.test.md`). El front matter lleva `type: "steps"` o `type: "test"`; no existe `kind`.
- Una prueba de práctica es una lista de bloques `:::question type="…"` (`single`, `multiple`, `true-false`, `text`, `number`, `order`, `match`). Marca las opciones correctas con `- [x]` o usa `answer="…"`; añade `:::explanation` y `:::hint` cuando ayuden. Si no sabes cuál es la respuesta correcta, pregunta: no la inventes.
- Todo `.md` dentro de `documents/` que no siga el formato es un error y no se publica.
- Nombres de archivo en kebab-case; `slug` único y estable; `version` semántica (`1.0.0`); `updated` con formato `AAAA-MM-DD`.
- Textos en ambos idiomas: `title: { es, en }`, atributos `title.es` / `title.en` en las directivas y bloques `:::lang es` / `:::lang en` en el cuerpo. Las variantes de idioma deben tener el mismo número de casillas u opciones `- [ ]` y las mismas `[x]`.
- Usa tokens en lugar de URLs fijas del repositorio: `{{repo_url}}`, `{{pages_url}}`, `{{owner}}`, `{{repo_name}}`. Nunca escribas el propietario ni el nombre del repositorio a mano.
- Nada de HTML crudo, `javascript:`, `data:` ni enlaces absolutos a la raíz (`/x`). Las imágenes son rutas relativas o `https`.
- Si cambias el contenido de un documento de forma significativa, sube `version`.
- Valida con `node scripts/validate-documents.mjs` (solo Node, sin `npm install`) o en la pestaña **Validar** del sitio. Si tocas código: `npm ci`, `npm test` y `npm run check:links`.
- No añadas pasos de compilación, manifiestos generados ni CDNs: las librerías del navegador están versionadas en `assets/vendor` (`npm run vendor` para actualizarlas).
- Todo archivo de código nuevo empieza con el comentario de atribución:

  ```js
  // Desarrollado por Jose Eduardo Romero Jimenez
  // https://github.com/Edunzz
  ```
