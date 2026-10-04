// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * Pruebas de práctica: modelo de preguntas, validación de cada tipo,
 * corrección, puntuación y estado guardado.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze } from "./helpers.mjs";
import { VALID_TEST, quizWith } from "./fixtures.mjs";
import {
  QUESTION_TYPES,
  isCorrect,
  isAnswered,
  gradeQuiz,
  normalizeAnswer,
  parseNumber,
  seededPermutation,
  shuffledOrder,
  newQuizState,
  restoreQuizState,
  serializeQuizState,
} from "../assets/js/quiz.js";

const result = analyze("documents/tests/prueba-x.test.md", VALID_TEST);
const model = result.model;
const q = (id) => model.questions.find((question) => question.id === id);
const errorsOf = (source) => analyze("documents/tests/prueba-y.test.md", source).errors.map((e) => e.message).join(" | ");

test("los siete tipos de pregunta se reconocen con su clave de respuesta", () => {
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.deepEqual([...QUESTION_TYPES], ["single", "multiple", "true-false", "text", "number", "order", "match"]);
  assert.deepEqual(model.questions.map((x) => [x.id, x.type, x.points]), [
    ["q-single", "single", 2],
    ["q-multi", "multiple", 1],
    ["q-tf", "true-false", 1],
    ["q-text", "text", 1],
    ["q-number", "number", 1],
    ["q-order", "order", 1],
    ["q-match", "match", 1],
  ]);
  assert.deepEqual(q("q-single").correct, [1]);
  assert.equal(q("q-single").variants.es.prompt, "¿Cuál es la capital de Perú?");
  assert.deepEqual(q("q-single").variants.es.items.map((i) => i.text), ["Cusco", "Lima", "Arequipa"]);
  assert.ok(q("q-single").explanation, "explicación");
  assert.deepEqual(q("q-multi").correct, [0, 1]);
  assert.equal(q("q-multi").variants.en.prompt, "Which colors are primary?");
  assert.equal(q("q-tf").answer, true, "«verdadero» equivale a true");
  assert.deepEqual(q("q-text").accepted, ["Lima", "Ciudad de Lima"]);
  assert.ok(q("q-text").hint, "pista");
  assert.equal(q("q-number").value, 3.14);
  assert.equal(q("q-number").tolerance, 0.01);
  assert.deepEqual(q("q-order").variants.es.items.map((i) => i.text), ["uno", "dos", "tres"]);
  assert.deepEqual(q("q-match").variants.es.items, [{ left: "Perú", right: "Lima" }, { left: "Chile", right: "Santiago" }, { left: "Bolivia", right: "La Paz" }]);
});

test("corrección de cada tipo de pregunta", () => {
  assert.equal(isCorrect(q("q-single"), 1), true);
  assert.equal(isCorrect(q("q-single"), 0), false);
  assert.equal(isCorrect(q("q-multi"), [0, 1]), true);
  assert.equal(isCorrect(q("q-multi"), [1, 0]), true, "el orden de selección no importa");
  assert.equal(isCorrect(q("q-multi"), [0]), false, "incompleta");
  assert.equal(isCorrect(q("q-multi"), [0, 1, 2]), false, "con una de más");
  assert.equal(isCorrect(q("q-tf"), true), true);
  assert.equal(isCorrect(q("q-tf"), false), false);
  assert.equal(isCorrect(q("q-text"), "  lima. "), true, "sin mayúsculas, espacios ni punto final");
  assert.equal(isCorrect(q("q-text"), "ciudad de LIMA"), true, "alternativa de otro idioma");
  assert.equal(isCorrect(q("q-text"), "Cusco"), false);
  assert.equal(isCorrect(q("q-number"), "3.14"), true);
  assert.equal(isCorrect(q("q-number"), "3,145"), true, "dentro de la tolerancia");
  assert.equal(isCorrect(q("q-number"), "3.2"), false);
  assert.equal(isCorrect(q("q-number"), "pi"), false);
  assert.equal(isCorrect(q("q-order"), [0, 1, 2]), true);
  assert.equal(isCorrect(q("q-order"), [1, 0, 2]), false);
  assert.equal(isCorrect(q("q-match"), [0, 1, 2]), true);
  assert.equal(isCorrect(q("q-match"), [0, 2, 1]), false);
  assert.equal(isCorrect(q("q-match"), [0, null, 2]), false);

  assert.equal(isAnswered(q("q-multi"), []), false);
  assert.equal(isAnswered(q("q-text"), "   "), false);
  assert.equal(isAnswered(q("q-match"), [null, null, null]), false);
  assert.equal(isAnswered(q("q-single"), 7), false, "un índice fuera de rango no es una respuesta");
});

test("normalización de respuestas cortas y números", () => {
  assert.equal(normalizeAnswer("  «Árbol»  Grande. "), "arbol grande");
  assert.equal(normalizeAnswer("`npm run validate`"), "npm run validate");
  assert.equal(parseNumber("3,5"), 3.5);
  assert.equal(parseNumber(" -2 "), -2);
  assert.equal(parseNumber("1e3"), 1000);
  assert.equal(parseNumber("12abc"), null);
  assert.equal(parseNumber(""), null);
});

test("puntuación: solo cuentan las comprobadas; al finalizar cuentan todas", () => {
  const state = newQuizState({ seed: 1 });
  state.answers = { "q-single": 1, "q-multi": [0], "q-tf": true, "q-text": "lima" };
  state.checked = ["q-single", "q-multi"];
  let grade = gradeQuiz(model, state, { passingScore: 60 });
  assert.deepEqual({ ...grade, wrong: [...grade.wrong] }, { score: 2, total: 8, percent: 25, correct: 1, answered: 4, checked: 2, questions: 7, finished: false, passed: null, wrong: ["q-multi"] });

  state.finished = true;
  grade = gradeQuiz(model, state, { passingScore: 60 });
  assert.equal(grade.score, 4);
  assert.equal(grade.percent, 50);
  assert.equal(grade.finished, true);
  assert.equal(grade.passed, false);
  assert.deepEqual(grade.wrong, ["q-multi", "q-number", "q-order", "q-match"], "las no respondidas cuentan como incorrectas");

  const perfect = { ...newQuizState({ seed: 1 }), checked: model.questions.map((x) => x.id), answers: { "q-single": 1, "q-multi": [0, 1], "q-tf": true, "q-text": "Lima", "q-number": "3.14", "q-order": [0, 1, 2], "q-match": [0, 1, 2] } };
  grade = gradeQuiz(model, perfect, { passingScore: 60 });
  assert.equal(grade.finished, true, "comprobar todas las preguntas finaliza la prueba");
  assert.equal(grade.percent, 100);
  assert.equal(grade.passed, true);
});

test("barajado determinista: misma semilla, mismo orden; ordenar y relacionar nunca empiezan resueltas", () => {
  assert.deepEqual(seededPermutation(6, 42), seededPermutation(6, 42));
  assert.deepEqual([...seededPermutation(6, 42)].sort(), [0, 1, 2, 3, 4, 5]);
  for (let seed = 0; seed < 200; seed++) {
    const order = shuffledOrder(3, seed);
    assert.notDeepEqual(order, [0, 1, 2], `semilla ${seed}`);
    assert.deepEqual([...order].sort(), [0, 1, 2]);
  }
  assert.deepEqual(shuffledOrder(1, 5), [0]);
});

test("estado guardado: se validan las respuestas y se ignora el formato antiguo", () => {
  const raw = {
    v: 2,
    seed: 99,
    answers: { "q-single": 1, "q-multi": [0, 9], "q-order": [0, 0, 1], "q-text": "Lima", "borrada": 1 },
    checked: ["q-single", "borrada"],
    finished: false,
    best: 75,
    attempts: 2,
  };
  const state = restoreQuizState(raw, model);
  assert.deepEqual(state, { seed: 99, answers: { "q-single": 1, "q-text": "Lima" }, checked: ["q-single"], finished: false, best: 75, attempts: 2 });
  assert.deepEqual(restoreQuizState({ v: 1, filter: "failed", local: {} }, model, { seed: 7 }), newQuizState({ seed: 7 }), "el estado de la versión anterior no se reutiliza");
  assert.deepEqual(restoreQuizState(null, model, { seed: 7 }), newQuizState({ seed: 7 }));

  const saved = serializeQuizState(state, model, { passingScore: 60, now: new Date("2026-10-04T00:00:00Z") });
  assert.equal(saved.v, 2);
  assert.equal(saved.updatedAt, "2026-10-04T00:00:00.000Z");
  assert.deepEqual(saved.summary, { score: 2, total: 8, percent: 25, correct: 1, answered: 2, checked: 1, questions: 7, finished: false, passed: null });
});

test("errores de formato de cada tipo de pregunta, con su línea", () => {
  const cases = [
    [':::question type="single"\n¿Pregunta?\n- [ ] a\n- [ ] b\n:::', /exactamente una opción correcta «- \[x\]» \(tiene 0\)/],
    [':::question type="single"\n¿Pregunta?\n- [x] a\n- [x] b\n:::', /exactamente una opción correcta «- \[x\]» \(tiene 2\)/],
    [':::question type="single"\n¿Pregunta?\n- [x] a\n:::', /al menos 2 opciones/],
    [':::question type="single"\n¿Pregunta sin opciones?\n:::', /no tiene opciones/],
    [':::question type="single"\n¿Pregunta?\n- [x] a\n- b\n:::', /todas las opciones deben empezar con «- \[ \]» o «- \[x\]»/],
    [':::question type="multiple"\n¿Pregunta?\n- [ ] a\n- [ ] b\n:::', /al menos una opción correcta/],
    [':::question type="single" answer="a"\n¿Pregunta?\n- [x] a\n- [ ] b\n:::', /no usa answer: marca la opción correcta/],
    [':::question type="true-false"\nAfirmación.\n:::', /necesita answer="true" o answer="false"/],
    [':::question type="true-false" answer="quizás"\nAfirmación.\n:::', /answer no es válido/],
    [':::question type="true-false" answer="true"\nAfirmación.\n- [x] Verdadero\n- [ ] Falso\n:::', /no usa opciones «- \[ \]»: indica la respuesta con answer="true"/],
    [':::question type="text"\n¿Pregunta?\n:::', /necesita la respuesta aceptada/],
    [':::question type="text" answer="a" tolerance="1"\n¿Pregunta?\n:::', /tolerance solo se usa en preguntas de tipo «number»/],
    [':::question type="number" answer="diez"\n¿Cuánto?\n:::', /answer="diez" no es un número/],
    [':::question type="number" answer="10" tolerance="-1"\n¿Cuánto?\n:::', /tolerance="-1" debe ser un número mayor o igual que 0/],
    [':::question type="order"\nOrdena estas cosas.\n:::', /necesita una lista numerada/],
    [':::question type="order"\nOrdena:\n\n1. a\n2. a\n:::', /elementos repetidos/],
    [':::question type="match"\nRelaciona:\n\n- a :: 1\n- b sin pareja\n:::', /la línea «b sin pareja» no tiene el formato «elemento :: pareja»/],
    [':::question type="match"\nRelaciona:\n\n- a :: 1\n- b :: 1\n:::', /parejas repetidas/],
    [':::question type="essay"\nEscribe.\n:::', /tipo desconocido «essay»/],
    [':::question\n¿Sin tipo?\n:::', /falta el tipo: añade type="…"/],
    [':::question type="text" answer="a" points="0"\n¿P?\n:::', /points="0" debe ser un número entero entre 1 y 100/],
    [':::question type="single"\n- [x] a\n- [ ] b\n:::', /no tiene enunciado/],
    [':::question type="text" answer="a"\n¿P?\n:::explanation\nUno.\n:::\n:::explanation\nDos.\n:::\n:::', /solo puede tener un «:::explanation»/],
    [':::question id="x" type="text" answer="a"\n¿P?\n:::\n\n:::question id="x" type="text" answer="b"\n¿Q?\n:::', /id duplicado «x»/],
    [':::question type="single"\n:::lang es\n¿P?\n- [x] a\n- [ ] b\n:::\n:::lang en\nQ?\n- [ ] a\n- [x] b\n:::\n:::', /no marcan las mismas opciones correctas/],
  ];
  for (const [question, pattern] of cases) assert.match(errorsOf(quizWith(question)), pattern, question);

  const located = analyze("documents/tests/prueba-y.test.md", quizWith(':::question type="single"\n¿P?\n- [ ] a\n- [ ] b\n:::')).errors[0];
  assert.equal(located.line, 10, "el error apunta a la línea de la pregunta");
  assert.match(located.message, /^Pregunta 1: /);
  assert.match(errorsOf(quizWith("Solo texto, sin preguntas.")), /necesita al menos un «:::question»/);
});
