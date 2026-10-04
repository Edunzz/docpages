// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/*
 * theme-init.js — Aplica el tema guardado antes de pintar la página para
 * evitar el destello claro/oscuro. Es un script clásico y diminuto porque la
 * CSP no permite scripts en línea. Sin preferencia guardada manda el sistema
 * (prefers-color-scheme).
 */
(function () {
  try {
    var saved = window.localStorage.getItem("docpages:theme");
    if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);
    var lang = window.localStorage.getItem("docpages:lang");
    if (lang === "es" || lang === "en") document.documentElement.setAttribute("lang", lang);
  } catch (e) {
    /* sin almacenamiento: se usa la preferencia del sistema */
  }

  // Abierto con doble clic (file://) los módulos no cargan: se explica cómo abrirlo.
  if (window.location.protocol !== "file:") return;
  document.addEventListener("DOMContentLoaded", function () {
    var view = document.getElementById("view");
    if (!view) return;
    var box = document.createElement("div");
    box.className = "message-view";
    var lines = [
      ["h1", "Abre el sitio con un servidor web · Open the site through a web server"],
      ["p", "Con doble clic el navegador bloquea la aplicación. En VS Code usa «Open with Live Server», o en una terminal dentro de la carpeta ejecuta «python -m http.server 8000» y abre http://localhost:8000/."],
      ["p", "Double-clicking makes the browser block the app. In VS Code use “Open with Live Server”, or run “python -m http.server 8000” in a terminal inside the folder and open http://localhost:8000/."],
    ];
    for (var i = 0; i < lines.length; i++) {
      var el = document.createElement(lines[i][0]);
      el.textContent = lines[i][1];
      box.appendChild(el);
    }
    view.removeAttribute("aria-busy");
    view.replaceChildren(box);
  });
})();
