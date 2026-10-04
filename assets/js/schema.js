// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * schema.js — Validador de un subconjunto de JSON Schema 2020-12.
 *
 * Valida el front matter con los mismos archivos `schemas/*.schema.json` en
 * Node (CI) y en el navegador («Actualizar desde el repositorio»), sin
 * dependencias. Palabras clave soportadas: $ref (#/$defs/…), type, const,
 * enum, pattern, format (date, date-time), minLength, maxLength, minimum,
 * maximum, required, properties, additionalProperties, minProperties, items,
 * minItems, maxItems, uniqueItems, anyOf, oneOf. Las pruebas comparan sus
 * resultados con Ajv para que no se desvíe del estándar.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i;

function isValidDate(value) {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const FORMATS = {
  date: (value) => isValidDate(value),
  "date-time": (value) => DATE_TIME_RE.test(value) && isValidDate(value.slice(0, 10)) && !Number.isNaN(Date.parse(value)),
};

const FORMAT_HINTS = { date: "AAAA-MM-DD", "date-time": "ISO 8601 con zona horaria, p. ej. 2026-10-03T20:00:00-05:00" };

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function matchesType(expected, value) {
  const actual = typeOf(value);
  return [].concat(expected).some((type) => type === actual || (type === "number" && actual === "integer"));
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  return keysA.length === Object.keys(b).length && keysA.every((key) => deepEqual(a[key], b[key]));
}

function resolveRef(root, ref) {
  if (!ref.startsWith("#/")) throw new Error(`$ref no soportado: ${ref}`);
  return ref
    .slice(2)
    .split("/")
    .reduce((node, part) => {
      const key = part.replace(/~1/g, "/").replace(/~0/g, "~");
      if (!node || !(key in node)) throw new Error(`$ref no encontrado: ${ref}`);
      return node[key];
    }, root);
}

const TYPE_NAMES = { string: "texto", object: "objeto", array: "lista", boolean: "booleano (true/false)", integer: "entero", number: "número", null: "nulo" };

/**
 * @returns {Array<{path:string, message:string}>} lista vacía si es válido.
 */
export function validateAgainstSchema(schema, value, root = schema, path = "") {
  const errors = [];
  const fail = (at, message) => errors.push({ path: at, message });

  const visit = (node, data, at) => {
    if (node === true || node == null) return;
    if (node === false) return fail(at, "propiedad no permitida");
    if (node.$ref) visit(resolveRef(root, node.$ref), data, at);

    if (node.const !== undefined && !deepEqual(data, node.const)) fail(at, `debe ser ${JSON.stringify(node.const)}`);
    if (node.enum && !node.enum.some((option) => deepEqual(option, data))) fail(at, `debe ser uno de: ${node.enum.map((v) => JSON.stringify(v)).join(", ")}`);
    if (node.type && !matchesType(node.type, data)) {
      return fail(at, `debe ser ${[].concat(node.type).map((t) => TYPE_NAMES[t] || t).join(" o ")}`);
    }

    if (typeof data === "string") {
      if (node.minLength != null && [...data].length < node.minLength) fail(at, node.minLength === 1 ? "no puede estar vacío" : `debe tener al menos ${node.minLength} caracteres`);
      if (node.maxLength != null && [...data].length > node.maxLength) fail(at, `debe tener como máximo ${node.maxLength} caracteres`);
      if (node.pattern && !new RegExp(node.pattern, "u").test(data)) fail(at, node.description ? `formato inválido: ${node.description}` : `no cumple el patrón ${node.pattern}`);
      if (node.format && FORMATS[node.format] && !FORMATS[node.format](data)) fail(at, `debe tener formato ${FORMAT_HINTS[node.format] || node.format}`);
    }

    if (typeof data === "number") {
      if (node.minimum != null && data < node.minimum) fail(at, `debe ser ≥ ${node.minimum}`);
      if (node.maximum != null && data > node.maximum) fail(at, `debe ser ≤ ${node.maximum}`);
    }

    if (Array.isArray(data)) {
      if (node.minItems != null && data.length < node.minItems) fail(at, `debe tener al menos ${node.minItems} elementos`);
      if (node.maxItems != null && data.length > node.maxItems) fail(at, `debe tener como máximo ${node.maxItems} elementos`);
      if (node.uniqueItems && data.some((item, i) => data.findIndex((other) => deepEqual(item, other)) !== i)) fail(at, "no puede tener elementos repetidos");
      if (node.items) data.forEach((item, i) => visit(node.items, item, `${at}/${i}`));
    }

    if (data && typeof data === "object" && !Array.isArray(data)) {
      for (const key of node.required || []) if (!(key in data)) fail(at ? `${at}/${key}` : `/${key}`, "es obligatorio");
      if (node.minProperties != null && Object.keys(data).length < node.minProperties) fail(at, `debe tener al menos ${node.minProperties} propiedad(es)`);
      const props = node.properties || {};
      for (const [key, item] of Object.entries(data)) {
        if (key in props) visit(props[key], item, `${at}/${key}`);
        else if (node.additionalProperties === false) fail(`${at}/${key}`, "propiedad desconocida");
        else if (node.additionalProperties && typeof node.additionalProperties === "object") visit(node.additionalProperties, item, `${at}/${key}`);
      }
    }

    for (const keyword of ["anyOf", "oneOf"]) {
      if (!node[keyword]) continue;
      const results = node[keyword].map((option) => validateAgainstSchema(option, data, root, at));
      const passing = results.filter((r) => r.length === 0).length;
      if (keyword === "anyOf" ? passing >= 1 : passing === 1) continue;
      if (keyword === "oneOf" && passing > 1) {
        fail(at, "cumple más de una de las formas permitidas");
        continue;
      }
      // Si una sola opción es del mismo tipo que el dato, sus errores son los útiles.
      const sameType = node[keyword]
        .map((option, i) => ({ option: option.$ref ? resolveRef(root, option.$ref) : option, errors: results[i] }))
        .filter(({ option }) => option.type && matchesType(option.type, data));
      if (sameType.length === 1) errors.push(...sameType[0].errors);
      else fail(at, node.description || "no cumple ninguna de las formas permitidas");
    }
  };

  visit(schema, value, path);
  return errors;
}
