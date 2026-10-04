// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

import { test } from "node:test";
import assert from "node:assert/strict";
import { detectLanguage, normalizeLanguage, localize, translate, createI18n, messageKeys, LANGUAGE_STORAGE_KEY } from "../assets/js/i18n.js";
import { createStore } from "../assets/js/storage.js";
import { memoryStorage, throwingStorage } from "./helpers.mjs";

test("normaliza y detecta el idioma: guardado → navegador → español", () => {
  assert.equal(normalizeLanguage("en-US"), "en");
  assert.equal(normalizeLanguage("ES_mx"), "es");
  assert.equal(normalizeLanguage("fr"), null);
  assert.equal(detectLanguage({ stored: "en", navigatorLanguages: ["es-ES"] }), "en");
  assert.equal(detectLanguage({ stored: null, navigatorLanguages: ["fr-FR", "en-GB"] }), "en");
  assert.equal(detectLanguage({ stored: "xx", navigatorLanguages: ["de"] }), "es");
  assert.equal(detectLanguage({}), "es");
});

test("selección y persistencia del idioma con avisos de cambio", () => {
  const backend = memoryStorage();
  const i18n = createI18n({ storage: createStore(backend), navigatorLanguages: ["es-CO"] });
  assert.equal(i18n.lang, "es");
  const seen = [];
  i18n.onChange((lang) => seen.push(lang));
  assert.equal(i18n.setLanguage("en-US"), "en");
  assert.equal(backend.getItem(LANGUAGE_STORAGE_KEY), "en");
  assert.equal(i18n.t("steps.next"), "Next");
  assert.equal(i18n.setLanguage("klingon"), "en", "un idioma no soportado se ignora");
  assert.deepEqual(seen, ["en"]);
  assert.equal(createI18n({ storage: createStore(backend), navigatorLanguages: ["es"] }).lang, "en", "la preferencia sobrevive a una recarga");
  assert.equal(createI18n({ storage: createStore(throwingStorage()), navigatorLanguages: ["en"] }).lang, "en", "sin almacenamiento se usa el navegador");
});

test("textos localizables del Markdown y plurales", () => {
  assert.equal(localize({ es: "Hola", en: "Hello" }, "en"), "Hello");
  assert.equal(localize({ es: "Hola" }, "en"), "Hola");
  assert.equal(localize({ en: "Hello" }, "es"), "Hello");
  assert.equal(localize("Texto", "en"), "Texto");
  assert.equal(localize(null, "es"), "");
  assert.equal(translate("es", "home.results", { count: 1 }), "1 resultado");
  assert.equal(translate("en", "home.results", { count: 3 }), "3 results");
  assert.equal(translate("en", "clave.inexistente"), "clave.inexistente");
});

test("formato de fechas sin desfase de zona horaria", () => {
  const es = createI18n({ navigatorLanguages: ["es"] });
  assert.match(es.formatDate("2026-10-03"), /3 oct 2026/);
  const en = createI18n({ navigatorLanguages: ["en"] });
  assert.match(en.formatDate("2026-10-03"), /Oct 3, 2026/);
  assert.equal(en.formatDate(""), "no date");
});

test("español e inglés tienen exactamente las mismas claves", () => {
  assert.deepEqual(messageKeys("en").sort(), messageKeys("es").sort());
});
