# Instrucciones para GitHub Copilot

Este repositorio publica documentación bilingüe (español/inglés) en GitHub Pages a partir de Markdown. Antes de crear, editar o migrar documentos, lee y sigue el skill [`.github/skills/documentation-pages/SKILL.md`](skills/documentation-pages/SKILL.md).

## Reglas rápidas

- Los documentos viven en `documents/steps/**/{titulo}.steps.md` (procedimientos) y `documents/tests/**/{titulo}.test.md` (pruebas). El sufijo decide el tipo y debe coincidir con `type` en el front matter.
- Nombres de archivo en kebab-case; `slug` único y estable; `version` semántica (`1.0.0`); `updated` con formato `AAAA-MM-DD`.
- Textos en ambos idiomas: `title: { es, en }`, atributos `title.es` / `title.en` en las directivas y bloques `:::lang es` / `:::lang en` en el cuerpo. Las variantes de idioma deben tener el mismo número de casillas `- [ ]`.
- Usa tokens en lugar de URLs fijas del repositorio: `{{repo_url}}`, `{{pages_url}}`, `{{owner}}`, `{{repo_name}}`. Nunca escribas el propietario ni el nombre del repositorio a mano.
- Nada de HTML crudo, `javascript:`, `data:` ni enlaces absolutos a la raíz (`/x`). Las imágenes de evidencia son rutas relativas.
- Si cambias el contenido de un documento de forma significativa, sube `version`.
- Después de cualquier cambio ejecuta `npm run validate`, `npm run manifest`, `npm run check:links` y `npm test`.
- Todo archivo de código nuevo empieza con el comentario de atribución:

  ```js
  // Desarrollado por Jose Eduardo Romero Jimenez
  // https://github.com/Edunzz
  ```

- No dependas de un servidor ni de CDNs: las librerías del navegador se copian a `assets/vendor` con `npm run vendor`.
