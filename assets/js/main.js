// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * main.js — Punto de entrada en el navegador.
 *
 * Carga las librerías empaquetadas en assets/vendor (copiadas desde
 * node_modules por scripts/vendor.mjs, sin CDN) y arranca la aplicación.
 * Prism llega como script clásico con `data-manual`, así que se lee de window.
 */

import markdownit from "../vendor/markdown-it.mjs";
import * as yaml from "../vendor/js-yaml.mjs";
import DOMPurify from "../vendor/purify.mjs";
import { startApp } from "./app.js";

startApp({ win: window, libs: { markdownit, yaml, DOMPurify, Prism: window.Prism } });
