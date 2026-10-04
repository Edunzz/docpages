// Desarrollado por Jose Eduardo Romero Jimenez
// https://github.com/Edunzz

/**
 * templates.js — Plantillas para empezar un documento desde la pestaña
 * «Validar». Todas son válidas tal cual (las pruebas lo comprueban) y están
 * en el idioma de la interfaz para que sean fáciles de leer y editar.
 */

/** Fecha local `AAAA-MM-DD` (sin el desfase de toISOString). */
export function today(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

const TEXT = {
  es: {
    procedure: {
      file: "mi-procedimiento.procedure.steps.md",
      body: (updated) => `---
title: "Mi procedimiento"
description: "Qué logra quien lo sigue."
slug: "mi-procedimiento"
type: "steps"
version: "1.0.0"
updated: "${updated}"
---

:::step id="preparar" title="Preparar"
Explica qué hay que hacer en este paso.

- [ ] Primera tarea comprobable.
- [ ] Segunda tarea comprobable.
:::

:::step id="verificar" title="Verificar"
> [!TIP]
> Un paso sin casillas cuenta como una sola tarea.
:::
`,
    },
    "lab-guide": {
      file: "mi-laboratorio.labguide.steps.md",
      body: (updated) => `---
title: "Laboratorio: mi primera práctica"
description: "Qué se aprende en este laboratorio."
slug: "mi-laboratorio"
type: "steps"
version: "1.0.0"
updated: "${updated}"
duration: "30 minutos"
level: "beginner"
objectives:
  - "Primer objetivo."
  - "Segundo objetivo."
prerequisites:
  - "Lo que hay que tener antes de empezar."
---

:::step id="preparar" title="Preparar el entorno"
- [ ] El entorno está listo.
:::

:::step id="practicar" title="Practicar"
:::substep id="practicar-1" title="Primera parte"
- [ ] Hice la primera parte.
:::

:::substep id="practicar-2" title="Segunda parte"
- [ ] Hice la segunda parte.
:::
:::
`,
    },
    "practice-test": {
      file: "mi-prueba.test.md",
      body: (updated) => `---
title: "Mi prueba de práctica"
description: "Preguntas de repaso."
slug: "mi-prueba"
type: "test"
version: "1.0.0"
updated: "${updated}"
passingScore: 70
---

:::question type="single"
¿Qué puerto usa HTTPS?
- [ ] 80
- [x] 443
- [ ] 22
:::explanation
HTTPS usa el puerto 443 por defecto.
:::
:::

:::question type="multiple"
¿Cuáles son protocolos de transporte?
- [x] TCP
- [x] UDP
- [ ] HTTP
:::

:::question type="true-false" answer="false"
UDP garantiza que los paquetes lleguen.
:::

:::question type="text" answer="DNS|Domain Name System"
¿Qué servicio traduce nombres de dominio a direcciones IP?
:::hint
Tiene tres letras.
:::
:::

:::question type="number" answer="255"
¿Cuál es el valor máximo de un octeto?
:::

:::question type="order"
Ordena las capas del modelo TCP/IP de abajo hacia arriba:

1. Acceso a la red
2. Internet
3. Transporte
4. Aplicación
:::

:::question type="match" points="2"
Relaciona cada protocolo con su puerto:

- HTTP :: 80
- HTTPS :: 443
- SSH :: 22
:::
`,
    },
  },
  en: {
    procedure: {
      file: "my-procedure.procedure.steps.md",
      body: (updated) => `---
title: "My procedure"
description: "What the reader achieves."
slug: "my-procedure"
type: "steps"
version: "1.0.0"
updated: "${updated}"
---

:::step id="prepare" title="Prepare"
Explain what to do in this step.

- [ ] First verifiable task.
- [ ] Second verifiable task.
:::

:::step id="verify" title="Verify"
> [!TIP]
> A step without checkboxes counts as a single task.
:::
`,
    },
    "lab-guide": {
      file: "my-lab.labguide.steps.md",
      body: (updated) => `---
title: "Lab: my first practice"
description: "What this lab teaches."
slug: "my-lab"
type: "steps"
version: "1.0.0"
updated: "${updated}"
duration: "30 minutes"
level: "beginner"
objectives:
  - "First objective."
  - "Second objective."
prerequisites:
  - "What you need before you start."
---

:::step id="prepare" title="Set up the environment"
- [ ] The environment is ready.
:::

:::step id="practice" title="Practice"
:::substep id="practice-1" title="First part"
- [ ] I did the first part.
:::

:::substep id="practice-2" title="Second part"
- [ ] I did the second part.
:::
:::
`,
    },
    "practice-test": {
      file: "my-test.test.md",
      body: (updated) => `---
title: "My practice test"
description: "Review questions."
slug: "my-test"
type: "test"
version: "1.0.0"
updated: "${updated}"
passingScore: 70
---

:::question type="single"
Which port does HTTPS use?
- [ ] 80
- [x] 443
- [ ] 22
:::explanation
HTTPS uses port 443 by default.
:::
:::

:::question type="multiple"
Which ones are transport protocols?
- [x] TCP
- [x] UDP
- [ ] HTTP
:::

:::question type="true-false" answer="false"
UDP guarantees that packets arrive.
:::

:::question type="text" answer="DNS|Domain Name System"
Which service translates domain names into IP addresses?
:::hint
It has three letters.
:::
:::

:::question type="number" answer="255"
What is the maximum value of an octet?
:::

:::question type="order"
Order the TCP/IP layers from bottom to top:

1. Network access
2. Internet
3. Transport
4. Application
:::

:::question type="match" points="2"
Match each protocol with its port:

- HTTP :: 80
- HTTPS :: 443
- SSH :: 22
:::
`,
    },
  },
};

export const TEMPLATE_CATEGORIES = Object.freeze(["procedure", "lab-guide", "practice-test"]);

/** `{ name, text }` de una plantilla en el idioma pedido (español si no existe). */
export function documentTemplate(category, lang = "es", date = new Date()) {
  const table = TEXT[lang] || TEXT.es;
  const template = table[category] || table.procedure;
  return { name: template.file, text: template.body(today(date)) };
}
