# Cómo contribuir

¡Gracias por mejorar DocPages! Esta guía resume cómo proponer cambios sin romper el sitio publicado.

## Documentos (no hace falta instalar nada)

1. Lee el skill [`.github/skills/documentation-pages/SKILL.md`](.github/skills/documentation-pages/SKILL.md): define los tres tipos de documento, los siete tipos de pregunta, los modos y las reglas de seguridad.
2. El final del nombre decide el tipo: `{titulo}.procedure.steps.md` y `{titulo}.labguide.steps.md` van en `documents/steps`; `{titulo}.test.md`, en `documents/tests`. Todo `.md` dentro de `documents/` debe seguir el formato.
3. Revísalo en la pestaña **Validar** del sitio (publicado o local) hasta que diga «Formato correcto». Si cambias un documento de forma significativa, sube su `version`.
4. Abre un pull request explicando qué cambia.

## Código

Para tocar el código necesitas Node.js 22 o superior. Instala las herramientas de desarrollo con `npm ci` (no `npm install`) para respetar el `package-lock.json`.

1. Crea una rama desde `main`: `git switch -c mejora/mi-cambio`.
2. Haz el cambio. Módulos ES sin globales y sin acceso al DOM al importarse, para que corran en Node y en jsdom.
3. Comprueba en local:

   ```bash
   npm test                               # pruebas (incluida accesibilidad con axe-core)
   npm run check:links                    # enlaces internos, imports e iconos
   node scripts/validate-documents.mjs    # documentos
   python -m http.server 8000             # revisión visual en http://localhost:8000/
   ```

4. Si cambiaste librerías o iconos, ejecuta `npm run vendor` y versiona `assets/vendor/` y `assets/icons/sprite.svg`: el sitio se publica tal cual desde la rama, sin compilar.
5. Abre un pull request explicando qué cambia y cómo lo verificaste.

## Normas de código

- Todo archivo de código nuevo (JS, MJS, CSS, HTML, YAML, SVG) empieza con el comentario de atribución en la sintaxis del lenguaje:

  ```js
  // Desarrollado por Jose Eduardo Romero Jimenez
  // https://github.com/Edunzz
  ```

  Las pruebas lo verifican.
- Nada de `eval`, `new Function`, `innerHTML` sin sanitizar, scripts o estilos en línea (la CSP los bloquea), CDNs ni tokens en el frontend.
- Nada de pasos de compilación: lo que hay en la rama es lo que se publica.
- Cada texto nuevo de la interfaz va en `assets/js/i18n.js` en **español e inglés** (una prueba exige las mismas claves).
- Los estados se comunican con icono, texto y color, nunca solo con color. Respeta el foco visible, `prefers-reduced-motion` y el diseño en móvil (desde 360 px).
- Comentarios en español, breves, que expliquen el porqué.
- Toda corrección o funcionalidad nueva incluye su prueba en `tests/`.
- La documentación existe en inglés ([README.md](README.md)) y en español ([README.es.md](README.es.md)): actualiza las dos. Sus ejemplos de Markdown se validan en las pruebas.

## Dependencias y seguridad

- Tras actualizar una librería del navegador, ejecuta `npm run vendor`, `npm test` y revisa [`assets/vendor/THIRD_PARTY_NOTICES.md`](assets/vendor/THIRD_PARTY_NOTICES.md).
- No incluyas secretos ni datos privados en los documentos: el sitio es público.

## Reportar problemas

Abre un issue con los pasos para reproducirlo, el navegador y, si aplica, la salida de `node scripts/validate-documents.mjs --json`.
