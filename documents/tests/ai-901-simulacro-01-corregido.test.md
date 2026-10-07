---
title:
  es: "Simulacro AI-901: Microsoft Azure AI Fundamentals"
  en: "AI-901 Practice Test: Microsoft Azure AI Fundamentals"
description:
  es: "Simulacro de 40 preguntas alineado con las habilidades de AI-901."
  en: "A 40-question practice test aligned with AI-901 skills."
slug: "ai-901-simulacro-01"
type: "test"
version: "1.0.1"
author: "Jose Eduardo Romero Jimenez"
updated: "2026-10-07"
tags: [ai-901, microsoft-foundry, azure-ai, practice]
duration:
  es: "45 minutos"
  en: "45 minutes"
level: "intermediate"
objectives:
  - es: "Identificar conceptos y capacidades de inteligencia artificial."
    en: "Identify artificial intelligence concepts and capabilities."
  - es: "Reconocer cómo implementar soluciones con Microsoft Foundry."
    en: "Recognize how to implement solutions with Microsoft Foundry."
passingScore: 70
feedback: "immediate"
shuffle: true
reset: true
---

# {{ title }}

:::lang es
Responde las 40 preguntas y pulsa **Comprobar**. Necesitas 70 % para aprobar; se recomienda alcanzar 85 % antes del examen.
:::
:::lang en
Answer all 40 questions and press **Check**. You need 70% to pass; achieving 85% before the exam is recommended.
:::

:::question id="sentimiento" type="single"
:::lang es
Una empresa quiere clasificar comentarios como positivos, negativos o neutrales.
:::

- [ ] Extracción de frases clave
- [x] Análisis de sentimiento
- [ ] Reconocimiento de entidades
- [ ] Síntesis de voz

:::explanation
:::lang es
El análisis de sentimiento determina la polaridad expresada en un texto.
:::
:::
:::

:::question id="equidad" type="single"
:::lang es
Un modelo produce sistemáticamente peores resultados para un grupo comparable. ¿Qué principio debe revisarse?
:::

- [x] Equidad
- [ ] Transparencia
- [ ] Inclusión
- [ ] Responsabilidad

:::explanation
:::lang es
La equidad busca evitar resultados injustificados entre grupos.
:::
:::
:::

:::question id="transparencia" type="multiple"
:::lang es
¿Qué DOS acciones favorecen la transparencia?
:::

- [x] Informar que se interactúa con IA
- [x] Explicar capacidades y limitaciones
- [ ] Ocultar la intervención humana
- [ ] Conservar indefinidamente todos los prompts

:::explanation
:::lang es
La transparencia exige comunicar el uso de IA y sus limitaciones.
:::
:::
:::

:::question id="responsabilidad" type="single"
:::lang es
¿Quién mantiene la responsabilidad final de las decisiones tomadas con ayuda de IA?
:::

- [ ] El modelo
- [ ] El proveedor de datos exclusivamente
- [x] Las personas y organizaciones que usan la solución
- [ ] El usuario final exclusivamente

:::explanation
:::lang es
La IA no elimina la responsabilidad humana y organizativa.
:::
:::
:::

:::question id="privacidad" type="single"
:::lang es
¿Qué medida protege mejor información confidencial usada por una aplicación de IA?
:::

- [ ] Incluirla siempre en el prompt
- [ ] Publicarla como datos de prueba
- [x] Aplicar controles de acceso y minimizar los datos enviados
- [ ] Aumentar la temperatura

:::explanation
:::lang es
Deben limitarse los datos expuestos y aplicarse controles de acceso.
:::
:::
:::

:::question id="confiabilidad" type="single"
:::lang es
Una aplicación crítica recibe datos incompletos. ¿Qué práctica mejora su confiabilidad y seguridad?
:::

- [ ] Aumentar tokens
- [x] Probar casos límite y controlar fallos
- [ ] Ocultar errores
- [ ] Usar siempre el modelo mayor

:::explanation
:::lang es
Las pruebas de casos límite y los controles ante fallos mejoran la seguridad.
:::
:::
:::

:::question id="inclusion" type="single"
:::lang es
¿Qué acción apoya principalmente la inclusión?
:::

- [ ] Reducir coste
- [x] Diseñar para distintas capacidades y contextos
- [ ] Aumentar temperatura
- [ ] Guardar todos los prompts

:::explanation
:::lang es
La inclusión considera diversas capacidades, necesidades y contextos.
:::
:::
:::

:::question id="generativa" type="single"
:::lang es
¿Qué describe mejor la IA generativa?
:::

- [ ] Solo almacena registros
- [ ] Ejecuta reglas fijas únicamente
- [x] Produce contenido nuevo desde patrones aprendidos
- [ ] Solo clasifica números

:::explanation
:::lang es
La IA generativa crea texto, imágenes, código, audio u otros contenidos.
:::
:::
:::

:::question id="token" type="single"
:::lang es
En un modelo de lenguaje, ¿qué es un token?
:::

- [ ] Una cuenta Azure
- [x] Una unidad de texto procesada por el modelo
- [ ] Una clave de cifrado
- [ ] Un agente

:::explanation
:::lang es
Los modelos procesan el texto dividido en tokens.
:::
:::
:::

:::question id="temperatura" type="single"
:::lang es
¿Qué suele producir una temperatura más baja?
:::

- [ ] Más aleatoriedad
- [x] Respuestas más consistentes
- [ ] Contexto ilimitado
- [ ] Mayor seguridad de red

:::explanation
:::lang es
Una temperatura baja reduce la variabilidad de la generación.
:::
:::
:::

:::question id="multimodal" type="single"
:::lang es
Una aplicación debe aceptar texto e imágenes en la misma solicitud. ¿Qué modelo necesita?
:::

- [ ] Embeddings exclusivamente
- [ ] Voz exclusivamente
- [x] Multimodal
- [ ] Clasificador binario

:::explanation
:::lang es
Un modelo multimodal procesa más de una modalidad.
:::
:::
:::

:::question id="embeddings" type="single"
:::lang es
¿Para qué se usan normalmente los embeddings?
:::

- [ ] Sintetizar voz
- [x] Representar contenido como vectores semánticos
- [ ] Asignar IP
- [ ] Aumentar tokens

:::explanation
:::lang es
Los embeddings permiten comparar similitud semántica.
:::
:::
:::

:::question id="grounding" type="single"
:::lang es
Una aplicación debe responder con políticas internas actualizadas. ¿Qué patrón debe usar?
:::

- [ ] Subir temperatura
- [x] Recuperar información relevante y darla como contexto
- [ ] Entrenar desde cero por pregunta
- [ ] Convertir políticas en audio

:::explanation
:::lang es
El grounding aporta información externa relevante al modelo.
:::
:::
:::

:::question id="system-prompt" type="single"
:::lang es
¿Cuál es el propósito principal de un prompt del sistema?
:::

- [x] Definir comportamiento y restricciones
- [ ] Contener solo la pregunta puntual
- [ ] Crear recursos Azure
- [ ] Reemplazar credenciales

:::explanation
:::lang es
El prompt del sistema establece instrucciones de alto nivel.
:::
:::
:::

:::question id="prompt-eficaz" type="multiple"
:::lang es
¿Qué DOS prácticas suelen mejorar un prompt?
:::

- [x] Indicar tarea y formato de salida
- [x] Dar contexto y ejemplos pertinentes
- [ ] Añadir información irrelevante
- [ ] Omitir restricciones

:::explanation
:::lang es
Las instrucciones claras y el contexto relevante orientan la respuesta.
:::
:::
:::

:::question id="agente" type="single"
:::lang es
¿Qué distingue principalmente a un agente de un chat sencillo?
:::

- [ ] Solo genera imágenes
- [x] Usa instrucciones, estado y herramientas para lograr un objetivo
- [ ] No usa modelos
- [ ] Siempre actúa sin supervisión

:::explanation
:::lang es
Un agente coordina modelo, instrucciones, estado y herramientas.
:::
:::
:::

:::question id="herramienta" type="single"
:::lang es
Un agente debe consultar una incidencia en un sistema externo. ¿Qué necesita?
:::

- [ ] Temperatura 1
- [x] Una herramienta o función para consultar el sistema
- [ ] Un prompt más largo
- [ ] Un generador de imágenes

:::explanation
:::lang es
Las herramientas conectan al agente con sistemas externos.
:::
:::
:::

:::question id="aprobacion" type="single"
:::lang es
Un agente realizará una acción de alto impacto. ¿Qué control es apropiado?
:::

- [ ] Eliminar auditoría
- [ ] Ejecutar sin confirmación
- [x] Solicitar aprobación humana
- [ ] Elevar temperatura

:::explanation
:::lang es
La aprobación humana es adecuada para acciones sensibles.
:::
:::
:::

:::question id="deployment" type="single"
:::lang es
Tras seleccionar un modelo en Microsoft Foundry, ¿qué necesita una aplicación para invocarlo?
:::

- [ ] Una imagen
- [x] Un despliegue y datos de conexión
- [ ] Un audio
- [ ] Una entidad

:::explanation
:::lang es
La aplicación consume un despliegue mediante su conexión configurada.
:::
:::
:::

:::question id="flujo" type="single"
:::lang es
¿Cuál es el orden lógico?
:::

- [ ] Integrar, seleccionar, desplegar, probar
- [x] Seleccionar, desplegar, probar, integrar
- [ ] Probar, integrar, seleccionar, desplegar
- [ ] Desplegar, integrar, seleccionar, probar

:::explanation
:::lang es
El flujo lógico es seleccionar el modelo, desplegarlo, probarlo e integrarlo.
:::
:::
:::

:::question id="conexion-sdk" type="single"
:::lang es
¿Qué datos necesita normalmente un cliente para conectarse a un modelo desplegado?
:::

- [ ] Solo temperatura
- [x] Endpoint, credencial e identificador del despliegue
- [ ] Solo región
- [ ] Imagen y audio

:::explanation
:::lang es
El cliente debe localizar el servicio, autenticarse e indicar el despliegue.
:::
:::
:::

:::question id="codigo-model" type="single"
:::lang es
En `client.responses.create(model="soporte-prod", input="Resume")`, ¿qué representa `model`?
:::

- [ ] El texto de entrada
- [x] El nombre o identificador del modelo o despliegue
- [ ] La credencial
- [ ] La temperatura

:::explanation
:::lang es
El parámetro model identifica el destino que procesará la solicitud.
:::
:::
:::

:::question id="rest" type="single"
:::lang es
¿Cuál es una ventaja de consumir un modelo mediante REST?
:::

- [ ] Obliga a usar Python
- [x] Puede invocarse desde lenguajes que hagan solicitudes HTTP
- [ ] Elimina autenticación
- [ ] Garantiza exactitud

:::explanation
:::lang es
REST permite integración desde múltiples lenguajes y plataformas.
:::
:::
:::

:::question id="frases-clave" type="single"
:::lang es
Se quieren obtener conceptos principales sin generar un resumen. ¿Qué capacidad corresponde?
:::

- [x] Extracción de frases clave
- [ ] Síntesis de voz
- [ ] Generación de imágenes
- [ ] Detección de objetos

:::explanation
:::lang es
La extracción de frases clave identifica términos relevantes.
:::
:::
:::

:::question id="entidades" type="single"
:::lang es
¿Qué técnica localiza personas, organizaciones y ubicaciones en texto?
:::

- [ ] Sentimiento
- [x] Reconocimiento de entidades
- [ ] Síntesis de voz
- [ ] Generación de imágenes

:::explanation
:::lang es
El reconocimiento de entidades identifica y clasifica esos elementos.
:::
:::
:::

:::question id="resumen" type="single"
:::lang es
¿Qué capacidad convierte un informe extenso en una versión breve?
:::

- [ ] Reconocimiento de voz
- [ ] Detección de objetos
- [x] Resumen de texto
- [ ] Traducción de voz

:::explanation
:::lang es
El resumen conserva las ideas principales en forma condensada.
:::
:::
:::

:::question id="speech-text" type="single"
:::lang es
Una aplicación debe transcribir una llamada grabada. ¿Qué capacidad necesita?
:::

- [x] Speech to text
- [ ] Text to speech
- [ ] Generación de imágenes
- [ ] Embeddings

:::explanation
:::lang es
Speech to text convierte audio hablado en texto.
:::
:::
:::

:::question id="text-speech" type="single"
:::lang es
Una aplicación debe leer una respuesta en voz alta. ¿Qué capacidad necesita?
:::

- [ ] Entidades
- [x] Text to speech
- [ ] Sentimiento
- [ ] OCR

:::explanation
:::lang es
Text to speech convierte texto en audio hablado.
:::
:::
:::

:::question id="audio-multimodal" type="single"
:::lang es
Un usuario envía una pregunta hablada a un modelo multimodal compatible. ¿Qué hace la aplicación?
:::

- [ ] La convierte en imagen
- [x] Envía el audio en formato compatible y procesa la respuesta
- [ ] Usa solo frases clave
- [ ] Entrena un modelo nuevo

:::explanation
:::lang es
Debe enviarse la modalidad de audio en el formato esperado.
:::
:::
:::

:::question id="vision" type="single"
:::lang es
Una aplicación debe responder preguntas sobre una fotografía. ¿Qué capacidad corresponde?
:::

- [ ] Solo síntesis de voz
- [x] Comprensión visual multimodal
- [ ] Solo sentimiento
- [ ] Solo frases clave

:::explanation
:::lang es
Un modelo visual multimodal interpreta la imagen y la instrucción.
:::
:::
:::

:::question id="imagen-gen" type="single"
:::lang es
¿Qué entrada usa normalmente un modelo para crear una imagen nueva?
:::

- [x] Un prompt descriptivo
- [ ] Una IP
- [ ] Un sentimiento
- [ ] Una credencial

:::explanation
:::lang es
La generación de imágenes parte normalmente de una descripción.
:::
:::
:::

:::question id="prompt-imagen" type="multiple"
:::lang es
¿Qué DOS elementos ayudan a alinear una imagen generada con lo solicitado?
:::

- [x] Describir sujeto y composición
- [x] Especificar estilo y restricciones
- [ ] Omitir el objetivo
- [ ] Incluir credenciales

:::explanation
:::lang es
El contenido, composición y estilo deben especificarse claramente.
:::
:::
:::

:::question id="facturas" type="single"
:::lang es
Se deben extraer proveedor, fecha e importe de facturas. ¿Qué capacidad encaja mejor?
:::

- [ ] Generación de imágenes
- [ ] Síntesis de voz
- [x] Content Understanding
- [ ] Sentimiento

:::explanation
:::lang es
Content Understanding extrae información estructurada de documentos.
:::
:::
:::

:::question id="formulario" type="single"
:::lang es
Un formulario escaneado debe transformarse en datos estructurados. ¿Qué opción corresponde?
:::

- [x] Content Understanding para imágenes
- [ ] Síntesis de voz
- [ ] Sentimiento
- [ ] Generación de imágenes

:::explanation
:::lang es
La extracción desde imágenes convierte campos del formulario en datos.
:::
:::
:::

:::question id="audio-video" type="single"
:::lang es
Se necesita extraer información estructurada de grabaciones. ¿Qué capacidad considerar?
:::

- [ ] Generación de imágenes
- [x] Content Understanding para audio y vídeo
- [ ] Solo sentimiento
- [ ] Embeddings de imagen

:::explanation
:::lang es
Content Understanding puede extraer información de audio y vídeo.
:::
:::
:::

:::question id="workload" type="single"
:::lang es
¿Qué capacidad corresponde a convertir texto escrito en audio?
:::

- [ ] Reconocimiento de entidades
- [ ] Análisis de sentimiento
- [x] Síntesis de voz
- [ ] Reconocimiento de voz

:::explanation
:::lang es
La síntesis de voz convierte texto en audio.
:::
:::
:::

:::question id="evaluacion" type="single"
:::lang es
Antes de publicar una aplicación generativa, ¿qué práctica es adecuada?
:::

- [ ] Probar un solo prompt
- [x] Evaluar casos representativos y casos límite
- [ ] Desactivar controles
- [ ] Suponer que siempre acierta

:::explanation
:::lang es
La evaluación debe cubrir entradas representativas y anómalas.
:::
:::
:::

:::question id="alucinacion" type="single"
:::lang es
¿Qué es una alucinación en IA generativa?
:::

- [ ] Una caída de red
- [x] Información plausible pero inventada o no fundamentada
- [ ] Solo una imagen borrosa
- [ ] Un token expirado

:::explanation
:::lang es
Una alucinación parece convincente, pero carece de fundamento.
:::
:::
:::

:::question id="mitigacion" type="multiple"
:::lang es
¿Qué DOS acciones ayudan a reducir respuestas no fundamentadas?
:::

- [x] Aportar fuentes mediante grounding
- [x] Indicar que reconozca cuando falta información
- [ ] Temperatura máxima
- [ ] Eliminar evaluación

:::explanation
:::lang es
El grounding y las instrucciones para admitir falta de contexto reducen invenciones.
:::
:::
:::

:::question id="integral" type="single"
:::lang es
Un asistente debe consultar manuales, crear tickets con una herramienta y pedir aprobación para cambios sensibles. ¿Qué arquitectura corresponde?
:::

- [ ] Generador de imágenes
- [ ] Clasificador de sentimiento
- [x] Agente con grounding, herramientas y aprobación humana
- [ ] Solo text to speech

:::explanation
:::lang es
El caso exige un agente fundamentado, herramientas y supervisión humana.
:::
:::
:::
