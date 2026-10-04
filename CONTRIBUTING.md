# Cómo contribuir

¡Gracias por mejorar DocPages! Esta guía resume cómo proponer cambios sin romper el sitio publicado.

## Antes de empezar

- Node.js 22 o superior y npm. Instala con `npm ci` (no `npm install`) para respetar el `package-lock.json`.
- Lee el skill [`.github/skills/documentation-pages/SKILL.md`](.github/skills/documentation-pages/SKILL.md): define los tres tipos de documento (procedimientos y guías de laboratorio en `.steps.md`, pruebas de práctica en `.test.md`), los siete tipos de pregunta, los modos y las reglas de seguridad.

## Flujo de trabajo

1. Crea una rama desde `main`: `git switch -c docs/mi-cambio`.
2. Haz el cambio:
   - **Documentos:** en `documents/steps` o `documents/tests`, en kebab-case y con ambos idiomas siempre que puedas. Todo `.md` dentro de `documents/` debe seguir el formato: si no, la validación falla. Si cambias un documento de forma significativa, sube su `version`.
   - **Código:** módulos ES sin globales y sin acceso al DOM al importarse, para que corran en Node y en jsdom.
3. Comprueba en local:

   ```bash
   npm run validate
   npm run manifest
   npm run check:links
   npm test
   npm run preview   # revisión visual en http://localhost:8080/docpages/
   ```

4. Versiona también `documents.manifest.json` (lo usa la publicación desde rama) y, si cambiaste librerías o iconos, `assets/vendor/` y `assets/icons/sprite.svg` (`npm run vendor`).
5. Abre un pull request explicando qué cambia y cómo lo verificaste.

## Normas de código

- Todo archivo de código nuevo (JS, MJS, CSS, HTML, YAML, SVG) empieza con el comentario de atribución en la sintaxis del lenguaje:

  ```js
  // Desarrollado por Jose Eduardo Romero Jimenez
  // https://github.com/Edunzz
  ```

  Las pruebas lo verifican.
- Nada de `eval`, `new Function`, `innerHTML` sin sanitizar, scripts o estilos en línea (la CSP los bloquea), CDNs ni tokens en el frontend.
- Cada texto nuevo de la interfaz va en `assets/js/i18n.js` en **español e inglés** (una prueba exige las mismas claves).
- Los estados se comunican con icono, texto y color, nunca solo con color. Respeta el foco visible y `prefers-reduced-motion`.
- Comentarios en español, breves, que expliquen el porqué.
- Toda corrección o funcionalidad nueva incluye su prueba en `tests/`.
- La documentación existe en inglés ([README.md](README.md)) y en español ([README.es.md](README.es.md)): actualiza las dos. Sus ejemplos de Markdown se validan en las pruebas.

## Dependencias y seguridad

- Dependabot propone actualizaciones semanales. Tras actualizar una librería del navegador, ejecuta `npm run vendor`, `npm test` y revisa [`assets/vendor/THIRD_PARTY_NOTICES.md`](assets/vendor/THIRD_PARTY_NOTICES.md).
- Las GitHub Actions se fijan por SHA con la versión en un comentario. No amplíes los `permissions` del workflow.
- No incluyas secretos, datos privados ni evidencia sensible en los documentos: el sitio es público.

## Reportar problemas

Abre un issue con los pasos para reproducirlo, el navegador y, si aplica, la salida de `npm run validate -- --json`.
