// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * i18n.js — Textos de la interfaz en español e inglés.
 *
 * - La preferencia se guarda en localStorage (`docpages:lang`).
 * - Sin preferencia guardada se usa el idioma del navegador; si no es uno de
 *   los soportados, español.
 * - Los valores localizables del Markdown (`title`, `description`, `label`…)
 *   pueden ser un texto simple o un objeto `{ es, en }`; `localize()` elige.
 *
 * Funciones puras: el almacenamiento y el navegador se inyectan.
 */

export const LANGUAGES = Object.freeze(["es", "en"]);
export const FALLBACK_LANGUAGE = "es";
export const LANGUAGE_STORAGE_KEY = "docpages:lang";

const MESSAGES = {
  es: {
    "app.loading": "Cargando…",
    "a11y.skip": "Saltar al contenido",
    "a11y.announcer": "Avisos",
    "nav.home": "Inicio",
    "nav.breadcrumb": "Ruta de navegación",
    "lang.label": "Idioma",
    "lang.es": "Español",
    "lang.en": "English",
    "theme.toLight": "Cambiar a modo claro",
    "theme.toDark": "Cambiar a modo oscuro",

    "repo.view": "Ver repositorio",
    "repo.refresh": "Actualizar desde el repositorio público",
    "repo.refreshing": "Actualizando…",
    "repo.unknown": "Repositorio no detectado (vista local)",
    "repo.sourceDeployed": "Contenido del despliegue",
    "repo.sourceLive": "En vivo desde GitHub",
    "repo.useDeployed": "Volver al contenido desplegado",
    "repo.generated": "Generado el {date}",
    "repo.branch": "rama {branch}",
    "repo.commit": "commit {sha}",
    "repo.refreshed": { one: "Se cargó {count} documento desde {repo}.", other: "Se cargaron {count} documentos desde {repo}." },
    "repo.invalid": { one: "{count} documento no sigue el formato: revisa los errores abajo.", other: "{count} documentos no siguen el formato: revisa los errores abajo." },
    "repo.skipped": { one: "No se pudo leer {count} documento.", other: "No se pudieron leer {count} documentos." },
    "repo.truncated": "GitHub devolvió un árbol truncado: puede faltar algún documento.",

    "error.offline": "No hay conexión con GitHub. Se mantiene el contenido del despliegue.",
    "error.not-found": "El repositorio no existe o es privado. Se mantiene el contenido del despliegue.",
    "error.private": "El repositorio es privado: la API pública no puede leerlo. Se mantiene el contenido del despliegue.",
    "error.rate-limited": "Se alcanzó el límite de solicitudes de la API pública de GitHub{reset}. Se mantiene el contenido del despliegue.",
    "error.rate-limited-reset": " (se restablece a las {time})",
    "error.timeout": "GitHub tardó demasiado en responder. Se mantiene el contenido del despliegue.",
    "error.http": "GitHub respondió con un error ({status}). Se mantiene el contenido del despliegue.",
    "error.invalid": "La respuesta de GitHub no tiene el formato esperado. Se mantiene el contenido del despliegue.",
    "error.no-repo": "No se pudo detectar el repositorio público de este sitio.",
    "error.manifest": "No se pudo cargar el índice de documentos (documents.manifest.json).",
    "error.manifestHint": "Ejecuta «npm run manifest» y sirve el sitio con un servidor HTTP; abrir index.html con file:// no funciona.",
    "error.retry": "Reintentar",

    "home.searchLabel": "Buscar documentos",
    "home.searchPlaceholder": "Título, descripción, etiqueta o contenido",
    "home.results": { one: "{count} resultado", other: "{count} resultados" },
    "home.noResults": "Ningún documento coincide con «{query}».",
    "home.empty.procedure": "Todavía no hay procedimientos. Crea un archivo .steps.md en /documents/steps.",
    "home.empty.lab-guide": "Todavía no hay guías de laboratorio. Crea un .steps.md en /documents/steps con kind: \"lab-guide\".",
    "home.empty.practice-test": "Todavía no hay pruebas de práctica. Crea un archivo .test.md en /documents/tests.",
    "home.filter": "Tipo de documento",
    "home.filterAll": "Todos",
    "home.documents": { one: "{count} documento", other: "{count} documentos" },
    "home.invalidTitle": "Documentos con errores de formato",
    "home.invalidHint": "Estos archivos no siguen el formato y no se publican. Corrige cada línea indicada y vuelve a actualizar.",
    "home.invalidOpen": "Abrir en GitHub",
    "home.line": "línea {line}",

    "category.procedure": "Procedimiento",
    "category.lab-guide": "Guía de laboratorio",
    "category.practice-test": "Prueba de práctica",
    "section.procedure": "Procedimientos",
    "section.lab-guide": "Guías de laboratorio",
    "section.practice-test": "Pruebas de práctica",
    "section.hint.procedure": "Paso a paso con casillas; el avance se guarda en este navegador.",
    "section.hint.lab-guide": "Laboratorios prácticos con objetivos, requisitos y tareas guiadas.",
    "section.hint.practice-test": "Preguntas para entrenar, con corrección y explicación al instante.",

    "card.updated": "Actualizado {date}",
    "card.notStarted": "Sin iniciar",
    "card.progress": "{percent} completado",
    "card.steps": { one: "{count} paso", other: "{count} pasos" },
    "card.questions": { one: "{count} pregunta", other: "{count} preguntas" },
    "card.notTaken": "Sin intentar",
    "card.inProgress": "En curso: {answered} de {total} respondidas",
    "card.lastResult": "Último resultado: {percent}",
    "card.best": "Mejor: {percent}",

    "doc.author": "Autor",
    "doc.updated": "Actualizado",
    "doc.version": "Versión",
    "doc.duration": "Duración",
    "doc.level": "Nivel",
    "doc.objectives": "Objetivos",
    "doc.prerequisites": "Antes de empezar",
    "doc.links": "Enlaces",
    "doc.tags": "Etiquetas",
    "doc.details": "Datos del documento",
    "doc.reset": "Reiniciar",
    "doc.resetConfirm": "Confirmar reinicio",
    "doc.resetHint": "Pulsa de nuevo para borrar el estado guardado en este navegador.",
    "doc.resetDone": "Se reinició el estado local del documento.",
    "doc.loadError": "No se pudo cargar el documento.",
    "doc.invalid": "Este documento no tiene el formato correcto",
    "doc.invalidHint": "Corrige estas líneas y ejecuta «npm run validate» para comprobarlo.",
    "doc.notFound": "Documento no encontrado",
    "doc.notFoundBody": "La dirección no corresponde a ningún documento publicado.",
    "doc.disabled": "Este tipo de documento está deshabilitado en este sitio.",
    "doc.backHome": "Volver al inicio",
    "doc.newTab": "(se abre en una pestaña nueva)",
    "doc.repoUnknownLink": "Enlace no disponible: el repositorio no se detectó.",

    "level.beginner": "Básico",
    "level.intermediate": "Intermedio",
    "level.advanced": "Avanzado",

    "steps.progress.procedure": "Progreso del procedimiento",
    "steps.progress.lab-guide": "Progreso del laboratorio",
    "steps.progressDetail": "{done} de {total} tareas",
    "steps.nav.procedure": "Pasos del procedimiento",
    "steps.nav.lab-guide": "Pasos del laboratorio",
    "steps.stepN": "Paso {n}",
    "steps.prev": "Anterior",
    "steps.next": "Siguiente",
    "steps.markDone": "Marcar como completado",
    "steps.markPending": "Marcar como pendiente",
    "steps.markSubDone": "Completar subpaso",
    "steps.markSubPending": "Reabrir subpaso",
    "steps.state.done": "Completado",
    "steps.state.progress": "En progreso",
    "steps.state.pending": "Pendiente",
    "steps.count": "{done}/{total}",
    "steps.complete.procedure": "¡Procedimiento completado!",
    "steps.complete.lab-guide": "¡Laboratorio completado!",
    "steps.completeBody": "Completaste todas las tareas. El avance queda guardado en este navegador.",
    "steps.announceDone": "«{title}» completado. Progreso: {percent}.",
    "steps.announcePending": "«{title}» marcado como pendiente. Progreso: {percent}.",
    "steps.announceProgress": "Progreso: {percent}.",
    "steps.empty": "Este documento no tiene pasos.",
    "steps.toggle": "Mostrar u ocultar el paso",

    "quiz.score": "Puntuación",
    "quiz.progress": "Avance",
    "quiz.questions": "Preguntas",
    "quiz.passingScore": "Para aprobar",
    "quiz.feedback": "Corrección",
    "quiz.feedback.immediate": "Al comprobar cada pregunta",
    "quiz.feedback.end": "Al finalizar la prueba",
    "quiz.questionN": "Pregunta {n} de {total}",
    "quiz.points": { one: "{count} punto", other: "{count} puntos" },
    "quiz.type.single": "Opción única",
    "quiz.type.multiple": "Opción múltiple",
    "quiz.type.true-false": "Verdadero o falso",
    "quiz.type.text": "Respuesta corta",
    "quiz.type.number": "Respuesta numérica",
    "quiz.type.order": "Ordenar",
    "quiz.type.match": "Relacionar",
    "quiz.chooseOne": "Elige una respuesta.",
    "quiz.chooseMany": "Elige todas las respuestas correctas.",
    "quiz.chooseTrueFalse": "Indica si la afirmación es verdadera o falsa.",
    "quiz.true": "Verdadero",
    "quiz.false": "Falso",
    "quiz.yourAnswer": "Tu respuesta",
    "quiz.numberHint": "Escribe solo el número; para decimales puedes usar punto o coma.",
    "quiz.orderHint": "Ordena los elementos con las flechas: el primero va arriba.",
    "quiz.moveUp": "Subir «{item}»",
    "quiz.moveDown": "Bajar «{item}»",
    "quiz.moved": "«{item}» ahora está en la posición {position} de {total}.",
    "quiz.matchHint": "Elige la pareja de cada elemento.",
    "quiz.matchPlaceholder": "Elige…",
    "quiz.matchShould": "Correcta: {answer}",
    "quiz.check": "Comprobar",
    "quiz.retry": "Volver a responder",
    "quiz.showHint": "Ver pista",
    "quiz.hideHint": "Ocultar pista",
    "quiz.hint": "Pista",
    "quiz.explanation": "Explicación",
    "quiz.correct": "¡Correcto!",
    "quiz.incorrect": "Incorrecto",
    "quiz.unanswered": "Sin responder",
    "quiz.correctAnswer": "Respuesta correcta: {answer}",
    "quiz.correctOrder": "Orden correcto:",
    "quiz.markCorrect": "(respuesta correcta)",
    "quiz.markWrong": "(tu respuesta, incorrecta)",
    "quiz.answerFirst": "Responde la pregunta antes de comprobarla.",
    "quiz.announceCorrect": "Pregunta {n}: correcta.",
    "quiz.announceIncorrect": "Pregunta {n}: incorrecta.",
    "quiz.scoreDetail": "{score} de {total} puntos",
    "quiz.checkedDetail": "{checked} de {total} comprobadas",
    "quiz.answeredDetail": "{answered} de {total} preguntas respondidas",
    "quiz.inProgress": "En curso",
    "quiz.passed": "Aprobado",
    "quiz.failed": "No aprobado",
    "quiz.passMarkShort": "se aprueba con {percent}",
    "quiz.passMark": "Se aprueba con {percent} o más.",
    "quiz.best": "Mejor resultado: {percent}",
    "quiz.attempts": { one: "{count} intento", other: "{count} intentos" },
    "quiz.finish": "Finalizar y ver el resultado",
    "quiz.finishConfirm": "Finalizar de todos modos",
    "quiz.finishPending": { one: "Falta {count} pregunta por responder. Pulsa de nuevo para finalizar.", other: "Faltan {count} preguntas por responder. Pulsa de nuevo para finalizar." },
    "quiz.resultTitle": "Resultado",
    "quiz.resultDetail": "{correct} de {total} respuestas correctas",
    "quiz.review": "Repasa estas preguntas:",
    "quiz.allCorrect": "¡Respondiste todo correctamente!",
    "quiz.tryAgain": "Intentar de nuevo",
    "quiz.announceResult": "Resultado: {percent}. {verdict}.",
    "quiz.empty": "Esta prueba no tiene preguntas.",

    "code.copy": "Copiar",
    "code.copied": "Copiado",
    "code.copyFailed": "No se pudo copiar",
    "code.copyLabel": "Copiar el código {lang}",

    "callout.note": "Nota",
    "callout.tip": "Consejo",
    "callout.important": "Importante",
    "callout.warning": "Advertencia",
    "callout.caution": "Precaución",

    "content.table": "Tabla",
    "content.openImage": "Ampliar imagen: {label}",

    "lightbox.close": "Cerrar",
    "lightbox.label": "Imagen ampliada",

    "footer.credit": "Desarrollado por",
    "footer.source": "Publicado desde",
    "footer.local": "Vista local",

    "time.unknown": "sin fecha",
  },

  en: {
    "app.loading": "Loading…",
    "a11y.skip": "Skip to content",
    "a11y.announcer": "Notifications",
    "nav.home": "Home",
    "nav.breadcrumb": "Breadcrumb",
    "lang.label": "Language",
    "lang.es": "Español",
    "lang.en": "English",
    "theme.toLight": "Switch to light mode",
    "theme.toDark": "Switch to dark mode",

    "repo.view": "View repository",
    "repo.refresh": "Refresh from the public repository",
    "repo.refreshing": "Refreshing…",
    "repo.unknown": "Repository not detected (local preview)",
    "repo.sourceDeployed": "Deployed content",
    "repo.sourceLive": "Live from GitHub",
    "repo.useDeployed": "Back to deployed content",
    "repo.generated": "Generated on {date}",
    "repo.branch": "branch {branch}",
    "repo.commit": "commit {sha}",
    "repo.refreshed": { one: "Loaded {count} document from {repo}.", other: "Loaded {count} documents from {repo}." },
    "repo.invalid": { one: "{count} document is not in the expected format: see the errors below.", other: "{count} documents are not in the expected format: see the errors below." },
    "repo.skipped": { one: "{count} document could not be read.", other: "{count} documents could not be read." },
    "repo.truncated": "GitHub returned a truncated tree: some documents may be missing.",

    "error.offline": "GitHub is unreachable. The deployed content is kept.",
    "error.not-found": "The repository does not exist or is private. The deployed content is kept.",
    "error.private": "The repository is private, so the public API cannot read it. The deployed content is kept.",
    "error.rate-limited": "The public GitHub API rate limit was reached{reset}. The deployed content is kept.",
    "error.rate-limited-reset": " (resets at {time})",
    "error.timeout": "GitHub took too long to respond. The deployed content is kept.",
    "error.http": "GitHub responded with an error ({status}). The deployed content is kept.",
    "error.invalid": "GitHub returned an unexpected response. The deployed content is kept.",
    "error.no-repo": "The public repository of this site could not be detected.",
    "error.manifest": "The document index (documents.manifest.json) could not be loaded.",
    "error.manifestHint": "Run “npm run manifest” and serve the site over HTTP; opening index.html with file:// does not work.",
    "error.retry": "Retry",

    "home.searchLabel": "Search documents",
    "home.searchPlaceholder": "Title, description, tag or content",
    "home.results": { one: "{count} result", other: "{count} results" },
    "home.noResults": "No document matches “{query}”.",
    "home.empty.procedure": "There are no procedures yet. Create a .steps.md file in /documents/steps.",
    "home.empty.lab-guide": "There are no lab guides yet. Create a .steps.md file in /documents/steps with kind: \"lab-guide\".",
    "home.empty.practice-test": "There are no practice tests yet. Create a .test.md file in /documents/tests.",
    "home.filter": "Document type",
    "home.filterAll": "All",
    "home.documents": { one: "{count} document", other: "{count} documents" },
    "home.invalidTitle": "Documents with format errors",
    "home.invalidHint": "These files do not follow the format and are not published. Fix each line listed and refresh again.",
    "home.invalidOpen": "Open on GitHub",
    "home.line": "line {line}",

    "category.procedure": "Procedure",
    "category.lab-guide": "Lab guide",
    "category.practice-test": "Practice test",
    "section.procedure": "Procedures",
    "section.lab-guide": "Lab guides",
    "section.practice-test": "Practice tests",
    "section.hint.procedure": "Step by step with checkboxes; progress is saved in this browser.",
    "section.hint.lab-guide": "Hands-on labs with objectives, prerequisites and guided tasks.",
    "section.hint.practice-test": "Training questions with instant grading and explanations.",

    "card.updated": "Updated {date}",
    "card.notStarted": "Not started",
    "card.progress": "{percent} complete",
    "card.steps": { one: "{count} step", other: "{count} steps" },
    "card.questions": { one: "{count} question", other: "{count} questions" },
    "card.notTaken": "Not taken yet",
    "card.inProgress": "In progress: {answered} of {total} answered",
    "card.lastResult": "Last result: {percent}",
    "card.best": "Best: {percent}",

    "doc.author": "Author",
    "doc.updated": "Updated",
    "doc.version": "Version",
    "doc.duration": "Duration",
    "doc.level": "Level",
    "doc.objectives": "Objectives",
    "doc.prerequisites": "Before you start",
    "doc.links": "Links",
    "doc.tags": "Tags",
    "doc.details": "Document details",
    "doc.reset": "Reset",
    "doc.resetConfirm": "Confirm reset",
    "doc.resetHint": "Press again to clear the state saved in this browser.",
    "doc.resetDone": "The local state of the document was reset.",
    "doc.loadError": "The document could not be loaded.",
    "doc.invalid": "This document is not in the expected format",
    "doc.invalidHint": "Fix these lines and run “npm run validate” to check.",
    "doc.notFound": "Document not found",
    "doc.notFoundBody": "The address does not match any published document.",
    "doc.disabled": "This document type is disabled on this site.",
    "doc.backHome": "Back to home",
    "doc.newTab": "(opens in a new tab)",
    "doc.repoUnknownLink": "Link unavailable: the repository was not detected.",

    "level.beginner": "Beginner",
    "level.intermediate": "Intermediate",
    "level.advanced": "Advanced",

    "steps.progress.procedure": "Procedure progress",
    "steps.progress.lab-guide": "Lab progress",
    "steps.progressDetail": "{done} of {total} tasks",
    "steps.nav.procedure": "Procedure steps",
    "steps.nav.lab-guide": "Lab steps",
    "steps.stepN": "Step {n}",
    "steps.prev": "Previous",
    "steps.next": "Next",
    "steps.markDone": "Mark as complete",
    "steps.markPending": "Mark as pending",
    "steps.markSubDone": "Complete substep",
    "steps.markSubPending": "Reopen substep",
    "steps.state.done": "Complete",
    "steps.state.progress": "In progress",
    "steps.state.pending": "Pending",
    "steps.count": "{done}/{total}",
    "steps.complete.procedure": "Procedure complete!",
    "steps.complete.lab-guide": "Lab complete!",
    "steps.completeBody": "You completed every task. Progress stays saved in this browser.",
    "steps.announceDone": "“{title}” complete. Progress: {percent}.",
    "steps.announcePending": "“{title}” marked as pending. Progress: {percent}.",
    "steps.announceProgress": "Progress: {percent}.",
    "steps.empty": "This document has no steps.",
    "steps.toggle": "Show or hide the step",

    "quiz.score": "Score",
    "quiz.progress": "Progress",
    "quiz.questions": "Questions",
    "quiz.passingScore": "To pass",
    "quiz.feedback": "Grading",
    "quiz.feedback.immediate": "When you check each question",
    "quiz.feedback.end": "When you finish the test",
    "quiz.questionN": "Question {n} of {total}",
    "quiz.points": { one: "{count} point", other: "{count} points" },
    "quiz.type.single": "Single choice",
    "quiz.type.multiple": "Multiple choice",
    "quiz.type.true-false": "True or false",
    "quiz.type.text": "Short answer",
    "quiz.type.number": "Numeric answer",
    "quiz.type.order": "Ordering",
    "quiz.type.match": "Matching",
    "quiz.chooseOne": "Choose one answer.",
    "quiz.chooseMany": "Choose every correct answer.",
    "quiz.chooseTrueFalse": "Say whether the statement is true or false.",
    "quiz.true": "True",
    "quiz.false": "False",
    "quiz.yourAnswer": "Your answer",
    "quiz.numberHint": "Type only the number; you can use a dot or a comma for decimals.",
    "quiz.orderHint": "Put the items in order with the arrows: the first one goes on top.",
    "quiz.moveUp": "Move “{item}” up",
    "quiz.moveDown": "Move “{item}” down",
    "quiz.moved": "“{item}” is now in position {position} of {total}.",
    "quiz.matchHint": "Choose the match for each item.",
    "quiz.matchPlaceholder": "Choose…",
    "quiz.matchShould": "Correct: {answer}",
    "quiz.check": "Check",
    "quiz.retry": "Answer again",
    "quiz.showHint": "Show hint",
    "quiz.hideHint": "Hide hint",
    "quiz.hint": "Hint",
    "quiz.explanation": "Explanation",
    "quiz.correct": "Correct!",
    "quiz.incorrect": "Incorrect",
    "quiz.unanswered": "Not answered",
    "quiz.correctAnswer": "Correct answer: {answer}",
    "quiz.correctOrder": "Correct order:",
    "quiz.markCorrect": "(correct answer)",
    "quiz.markWrong": "(your answer, incorrect)",
    "quiz.answerFirst": "Answer the question before checking it.",
    "quiz.announceCorrect": "Question {n}: correct.",
    "quiz.announceIncorrect": "Question {n}: incorrect.",
    "quiz.scoreDetail": "{score} of {total} points",
    "quiz.checkedDetail": "{checked} of {total} checked",
    "quiz.answeredDetail": "{answered} of {total} questions answered",
    "quiz.inProgress": "In progress",
    "quiz.passed": "Passed",
    "quiz.failed": "Not passed",
    "quiz.passMarkShort": "pass mark {percent}",
    "quiz.passMark": "You pass with {percent} or more.",
    "quiz.best": "Best result: {percent}",
    "quiz.attempts": { one: "{count} attempt", other: "{count} attempts" },
    "quiz.finish": "Finish and see the result",
    "quiz.finishConfirm": "Finish anyway",
    "quiz.finishPending": { one: "{count} question is still unanswered. Press again to finish.", other: "{count} questions are still unanswered. Press again to finish." },
    "quiz.resultTitle": "Result",
    "quiz.resultDetail": "{correct} of {total} answers correct",
    "quiz.review": "Review these questions:",
    "quiz.allCorrect": "You answered everything correctly!",
    "quiz.tryAgain": "Try again",
    "quiz.announceResult": "Result: {percent}. {verdict}.",
    "quiz.empty": "This test has no questions.",

    "code.copy": "Copy",
    "code.copied": "Copied",
    "code.copyFailed": "Copy failed",
    "code.copyLabel": "Copy the {lang} code",

    "callout.note": "Note",
    "callout.tip": "Tip",
    "callout.important": "Important",
    "callout.warning": "Warning",
    "callout.caution": "Caution",

    "content.table": "Table",
    "content.openImage": "Enlarge image: {label}",

    "lightbox.close": "Close",
    "lightbox.label": "Enlarged image",

    "footer.credit": "Developed by",
    "footer.source": "Published from",
    "footer.local": "Local preview",

    "time.unknown": "no date",
  },
};

/** Normaliza "en-US" → "en"; devuelve null si no está soportado. */
export function normalizeLanguage(value, supported = LANGUAGES) {
  const base = String(value || "").trim().toLowerCase().split(/[-_]/)[0];
  return supported.includes(base) ? base : null;
}

/**
 * Idioma inicial: preferencia guardada → idiomas del navegador → respaldo.
 * @param {{stored?:string|null, navigatorLanguages?:string[], supported?:string[], fallback?:string}} opts
 */
export function detectLanguage({ stored = null, navigatorLanguages = [], supported = LANGUAGES, fallback = FALLBACK_LANGUAGE } = {}) {
  const saved = normalizeLanguage(stored, supported);
  if (saved) return saved;
  for (const candidate of navigatorLanguages || []) {
    const lang = normalizeLanguage(candidate, supported);
    if (lang) return lang;
  }
  return normalizeLanguage(fallback, supported) || supported[0];
}

/**
 * Elige el texto de un valor localizable.
 * Acepta un texto simple o un objeto `{ es, en }`; si falta el idioma pedido,
 * usa el de respaldo y después cualquiera que exista.
 */
export function localize(value, lang, fallback = FALLBACK_LANGUAGE) {
  if (value == null) return "";
  if (typeof value !== "object") return String(value);
  if (value[lang] != null && value[lang] !== "") return String(value[lang]);
  if (value[fallback] != null && value[fallback] !== "") return String(value[fallback]);
  const first = Object.values(value).find((v) => v != null && v !== "");
  return first == null ? "" : String(first);
}

function interpolate(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (params && params[key] != null ? String(params[key]) : match));
}

/** Traduce una clave; los mensajes con plural son `{ one, other }` y usan `params.count`. */
export function translate(lang, key, params = {}) {
  const table = MESSAGES[lang] || MESSAGES[FALLBACK_LANGUAGE];
  let message = table[key] ?? MESSAGES[FALLBACK_LANGUAGE][key];
  if (message == null) return key;
  if (typeof message === "object") {
    const category = new Intl.PluralRules(lang).select(Number(params.count) || 0);
    message = message[category] ?? message.other;
  }
  return interpolate(message, params);
}

/** Lista de claves por idioma (para pruebas de completitud). */
export function messageKeys(lang) {
  return Object.keys(MESSAGES[lang] || {});
}

/**
 * Crea el estado de idioma de la aplicación.
 * @param {{storage?:{get:Function,set:Function}, navigatorLanguages?:string[], supported?:string[]}} opts
 */
export function createI18n({ storage = null, navigatorLanguages = [], supported = LANGUAGES } = {}) {
  const listeners = new Set();
  let lang = detectLanguage({
    stored: storage ? storage.get(LANGUAGE_STORAGE_KEY) : null,
    navigatorLanguages,
    supported,
  });

  const api = {
    get lang() {
      return lang;
    },
    supported,
    t: (key, params) => translate(lang, key, params),
    localize: (value) => localize(value, lang),
    setLanguage(next) {
      const normalized = normalizeLanguage(next, supported);
      if (!normalized) return lang;
      if (storage) storage.set(LANGUAGE_STORAGE_KEY, normalized);
      if (normalized !== lang) {
        lang = normalized;
        listeners.forEach((fn) => fn(lang));
      }
      return lang;
    },
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    /** Fecha `YYYY-MM-DD` sin desfase de zona horaria. */
    formatDate(value) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
      if (!m) return value ? String(value) : translate(lang, "time.unknown");
      const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
      return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeZone: "UTC" }).format(date);
    },
    /** Fecha y hora ISO 8601, en la zona horaria del lector. */
    formatDateTime(value) {
      const date = new Date(String(value || ""));
      if (!value || Number.isNaN(date.getTime())) return value ? String(value) : translate(lang, "time.unknown");
      return new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(date);
    },
    formatTime(value) {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat(lang, { timeStyle: "short" }).format(date);
    },
  };
  return api;
}
