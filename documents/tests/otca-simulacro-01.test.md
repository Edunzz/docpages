---
title:
  es: "Simulacro OTCA: OpenTelemetry Certified Associate"
  en: "OTCA Practice Test: OpenTelemetry Certified Associate"
description:
  es: "Simulacro avanzado de 40 preguntas alineado con los cuatro dominios oficiales."
  en: "Advanced 40-question OTCA practice test."
slug: "otca-simulacro-01"
type: "test"
version: "1.0.0"
author: "Jose Eduardo Romero Jimenez"
updated: "2026-10-07"
tags: [otca, opentelemetry, observability, collector, certification]
duration:
  es: "60 minutos"
  en: "60 minutes"
level: "advanced"
objectives:
  - es: "Dominar fundamentos, API, SDK y Collector de OpenTelemetry."
    en: "Master OpenTelemetry fundamentals, API, SDK, and Collector."
  - es: "Diagnosticar propagación y pipelines de telemetría."
    en: "Troubleshoot propagation and telemetry pipelines."
passingScore: 80
feedback: "immediate"
shuffle: true
reset: true
---

# {{ title }}

:::lang es
Responde las 40 preguntas. Umbral exigente: 80 %. Distribución aproximada: Fundamentos 18 %, API y SDK 46 %, Collector 26 %, mantenimiento y depuración 10 %.
:::
:::lang en
Answer all 40 questions. Passing score: 80%.
:::

:::question id="f01" type="single"
:::lang es
¿Qué describe mejor la observabilidad?
:::

- [x] Inferir el estado interno mediante las salidas del sistema
- [ ] Instalar un backend concreto
- [ ] Crear dashboards sin telemetría
- [ ] Sustituir las pruebas

:::explanation
:::lang es
Permite inferir el estado interno usando señales externas.
:::
:::
:::

:::question id="f02" type="single"
:::lang es
¿Cuál NO es una señal principal de OpenTelemetry?
:::

- [ ] Trazas
- [ ] Métricas
- [ ] Logs
- [x] Tickets

:::explanation
:::lang es
Las señales principales son trazas, métricas y logs.
:::
:::
:::

:::question id="f03" type="single"
:::lang es
¿Qué aporta una traza distribuida?
:::

- [x] El recorrido causal de una solicitud entre servicios
- [ ] Solo CPU total
- [ ] El código fuente
- [ ] La configuración de red

:::explanation
:::lang es
Relaciona operaciones entre procesos y servicios.
:::
:::
:::

:::question id="f04" type="single"
:::lang es
¿Para qué sirven las convenciones semánticas?
:::

- [x] Estandarizar nombres y significados
- [ ] Cifrar los datos
- [ ] Elegir backend
- [ ] Reemplazar Collector

:::explanation
:::lang es
Proporcionan nombres y significados consistentes.
:::
:::
:::

:::question id="f05" type="single"
:::lang es
¿Qué caracteriza la instrumentación automática?
:::

- [x] Cubre librerías comunes sin editar cada operación
- [ ] Nunca usa SDK
- [ ] Solo admite logs
- [ ] Exige OTTL

:::explanation
:::lang es
La automática instrumenta frameworks mediante agentes o librerías.
:::
:::
:::

:::question id="f06" type="single"
:::lang es
¿Qué describe un Resource?
:::

- [x] La entidad que produce telemetría
- [ ] Un span sin padre
- [ ] Una cola
- [ ] Una regla de sampling

:::explanation
:::lang es
Identifica servicio, proceso, host o contenedor.
:::
:::
:::

:::question id="f07" type="single"
:::lang es
¿Qué propiedad tiene OpenTelemetry?
:::

- [x] Es neutral respecto al backend
- [ ] Solo funciona en Kubernetes
- [ ] Almacena indefinidamente
- [ ] Exige un proveedor concreto

:::explanation
:::lang es
Es neutral respecto al proveedor y no es un backend.
:::
:::
:::

:::question id="a01" type="single"
:::lang es
¿Relación correcta entre API y SDK?
:::

- [x] API define instrumentación; SDK implementa procesamiento y exportación
- [ ] API exporta; SDK solo interfaces
- [ ] Son iguales
- [ ] SDK debe imponerse desde librerías

:::explanation
:::lang es
La API desacopla instrumentación y el SDK aporta implementación.
:::
:::
:::

:::question id="a02" type="single"
:::lang es
Una librería reutilizable quiere emitir spans sin imponer implementación. ¿Qué usa?
:::

- [x] API
- [ ] Collector embebido
- [ ] Backend propietario
- [ ] Debug exporter

:::explanation
:::lang es
Las librerías deben depender de la API.
:::
:::
:::

:::question id="a03" type="single"
:::lang es
¿Qué ocurre al usar API sin SDK configurado?
:::

- [x] Operación no-op
- [ ] Fallo obligatorio
- [ ] Se instala Collector
- [ ] Se guarda en disco

:::explanation
:::lang es
La instrumentación puede operar como no-op.
:::
:::
:::

:::question id="a04" type="single"
:::lang es
¿Qué componente crea Tracers?
:::

- [x] TracerProvider
- [ ] MeterProvider
- [ ] LoggerProvider
- [ ] SpanProcessor

:::explanation
:::lang es
TracerProvider proporciona Tracers.
:::
:::
:::

:::question id="a05" type="single"
:::lang es
¿Relación correcta entre traza y span?
:::

- [x] Una traza contiene spans y cada span representa una operación
- [ ] Un span contiene varios trace IDs
- [ ] Una métrica contiene spans
- [ ] Un log sustituye contexto

:::explanation
:::lang es
Los spans con un trace ID común forman una traza.
:::
:::
:::

:::question id="a06" type="single"
:::lang es
¿Qué registra un suceso puntual dentro de un span?
:::

- [x] Evento
- [ ] Receiver
- [ ] Extension
- [ ] Resource

:::explanation
:::lang es
Un evento registra un suceso con marca temporal.
:::
:::
:::

:::question id="a07" type="single"
:::lang es
¿Para qué sirve SpanProcessor?
:::

- [x] Procesar spans antes de exportarlos
- [ ] Recibir métricas por red
- [ ] Definir semántica
- [ ] Almacenar indefinidamente

:::explanation
:::lang es
Participa en el ciclo de vida del span.
:::
:::
:::

:::question id="a08" type="single"
:::lang es
¿Ventaja de BatchSpanProcessor?
:::

- [x] Agrupa y exporta asíncronamente
- [ ] Exporta cada span síncronamente
- [ ] Convierte métricas
- [ ] Elimina exporter

:::explanation
:::lang es
El procesamiento por lotes reduce impacto.
:::
:::
:::

:::question id="a09" type="single"
:::lang es
¿Qué describe head sampling?
:::

- [x] Decidir al inicio de la traza
- [ ] Decidir tras recibir toda la traza
- [ ] Muestrear solo métricas
- [ ] Guardar todos los errores

:::explanation
:::lang es
La decisión se toma tempranamente.
:::
:::
:::

:::question id="a10" type="single"
:::lang es
¿Instrumento para solicitudes cuyo valor solo aumenta?
:::

- [x] Counter
- [ ] UpDownCounter
- [ ] Histogram
- [ ] Baggage

:::explanation
:::lang es
Counter representa acumulaciones monotónicas.
:::
:::
:::

:::question id="a11" type="single"
:::lang es
¿Instrumento para latencias y su distribución?
:::

- [x] Histogram
- [ ] Counter
- [ ] UpDownCounter
- [ ] Span

:::explanation
:::lang es
Histogram es apropiado para duraciones y tamaños.
:::
:::
:::

:::question id="a12" type="single"
:::lang es
¿Instrumento para trabajos activos que suben y bajan?
:::

- [x] UpDownCounter
- [ ] Counter
- [ ] Histogram
- [ ] Exporter

:::explanation
:::lang es
Admite incrementos y decrementos.
:::
:::
:::

:::question id="a13" type="single"
:::lang es
¿Diferencia entre temporalidad acumulativa y delta?
:::

- [x] Acumulativa desde un inicio; delta desde la colección previa
- [ ] Delta contiene trace IDs
- [ ] Acumulativa solo para logs
- [ ] Ninguna

:::explanation
:::lang es
Define el intervalo temporal representado.
:::
:::
:::

:::question id="a14" type="single"
:::lang es
¿Función de context propagation?
:::

- [x] Transportar identidad de traza entre servicios
- [ ] Exportar dashboards
- [ ] Escalar Collector
- [ ] Crear índices

:::explanation
:::lang es
Mantiene la relación causal entre procesos.
:::
:::
:::

:::question id="a15" type="single"
:::lang es
¿Estándar común para propagar trace ID por HTTP?
:::

- [x] W3C Trace Context
- [ ] YAML
- [ ] OTTL
- [ ] OpenMetrics

:::explanation
:::lang es
Define traceparent y tracestate.
:::
:::
:::

:::question id="a16" type="single"
:::lang es
¿Uso apropiado de Baggage?
:::

- [x] Propagar pares clave-valor asociados al contexto
- [ ] Transportar documentos grandes
- [ ] Sustituir Resource
- [ ] Exportar sin red

:::explanation
:::lang es
Propaga pares clave-valor y debe usarse con cuidado.
:::
:::
:::

:::question id="a17" type="single"
:::lang es
¿Qué es OTLP?
:::

- [x] Protocolo para transportar telemetría sobre gRPC o HTTP
- [ ] Base de datos
- [ ] Lenguaje de dashboards
- [ ] Algoritmo de sampling

:::explanation
:::lang es
Transporta señales entre componentes compatibles.
:::
:::
:::

:::question id="a18" type="single"
:::lang es
¿Qué permite zero-code?
:::

- [x] Añadir telemetría sin editar el código fuente de la aplicación
- [ ] Evitar toda configuración
- [ ] Almacenar trazas
- [ ] Eliminar todo SDK

:::explanation
:::lang es
Usa agentes o mecanismos automáticos del lenguaje.
:::
:::
:::

:::question id="c01" type="single"
:::lang es
¿Función de receiver?
:::

- [x] Recibir telemetría
- [ ] Filtrar atributos
- [ ] Enviar al backend
- [ ] Crear contexto

:::explanation
:::lang es
Los receivers ingieren datos.
:::
:::
:::

:::question id="c02" type="single"
:::lang es
¿Función de processor?
:::

- [x] Modificar, filtrar o enriquecer datos
- [ ] Escuchar siempre OTLP
- [ ] Almacenar indefinidamente
- [ ] Instrumentar código

:::explanation
:::lang es
Gestiona datos dentro del pipeline.
:::
:::
:::

:::question id="c03" type="single"
:::lang es
¿Función de exporter?
:::

- [x] Enviar telemetría a un destino
- [ ] Crear contexto
- [ ] Definir traceparent
- [ ] Instrumentar librerías

:::explanation
:::lang es
Envía datos fuera del pipeline.
:::
:::
:::

:::question id="c04" type="single"
:::lang es
¿Función de extensions?
:::

- [x] Capacidades auxiliares como salud o autenticación
- [ ] Sustituir receivers
- [ ] Crear spans de aplicación
- [ ] Definir métricas

:::explanation
:::lang es
No procesan directamente la telemetría del pipeline.
:::
:::
:::

:::question id="c05" type="single"
:::lang es
Receiver declarado pero ausente de service.pipelines. ¿Resultado?
:::

- [x] No participa en un pipeline activo
- [ ] Se conecta a todo
- [ ] Crea pipeline automático
- [ ] Siempre invalida todo

:::explanation
:::lang es
Debe referenciarse desde service.pipelines.
:::
:::
:::

:::question id="c06" type="single"
:::lang es
¿Orden lógico de pipeline?
:::

- [x] Receivers, processors, exporters
- [ ] Exporters, extensions, receivers
- [ ] Processors, exporters, receivers
- [ ] Extensions, resources, receivers

:::explanation
:::lang es
Los datos entran, se procesan y salen.
:::
:::
:::

:::question id="c07" type="single"
:::lang es
¿Qué distingue a un connector?
:::

- [x] Es exporter en un pipeline y receiver en otro
- [ ] Solo expone salud
- [ ] Instrumenta sin código
- [ ] Almacena indefinidamente

:::explanation
:::lang es
Enlaza pipelines y puede convertir señales.
:::
:::
:::

:::question id="c08" type="single"
:::lang es
¿Para qué sirve OTTL?
:::

- [x] Transformar telemetría con expresiones
- [ ] Definir W3C headers
- [ ] Compilar SDK
- [ ] Crear clústeres

:::explanation
:::lang es
Expresa transformaciones sobre telemetría.
:::
:::
:::

:::question id="c09" type="single"
:::lang es
¿Cuándo encaja patrón agent?
:::

- [x] Collector próximo a cargas o nodos
- [ ] Solo punto central
- [ ] Solo almacenamiento
- [ ] Sin red

:::explanation
:::lang es
Recoge datos cerca de las cargas.
:::
:::
:::

:::question id="c10" type="single"
:::lang es
¿Cuándo encaja patrón gateway?
:::

- [x] Procesamiento y exportación centralizados
- [ ] Backend dentro de cada proceso
- [ ] Solo instrumentación manual
- [ ] Reemplazar propagación

:::explanation
:::lang es
Centraliza batching, filtrado, routing o exportación.
:::
:::
:::

:::question id="c11" type="single"
:::lang es
¿Qué processor agrupa datos antes de exportarlos?
:::

- [x] Batch processor
- [ ] Memory limiter
- [ ] Attributes processor
- [ ] Filter processor

:::explanation
:::lang es
Batch reduce solicitudes de exportación.
:::
:::
:::

:::question id="d01" type="single"
:::lang es
No llegan datos al backend. ¿Qué permite inspeccionar salida del Collector?
:::

- [x] Debug exporter
- [ ] Baggage
- [ ] TracerProvider únicamente
- [ ] Semantic conventions

:::explanation
:::lang es
Ayuda a verificar la telemetría del pipeline.
:::
:::
:::

:::question id="d02" type="single"
:::lang es
¿Para qué sirven zPages?
:::

- [x] Diagnóstico en tiempo real
- [ ] Almacenamiento largo
- [ ] Cambiar semántica
- [ ] Generar certificados

:::explanation
:::lang es
Ofrece información diagnóstica del componente.
:::
:::
:::

:::question id="d03" type="single"
:::lang es
Spans de dos servicios aparecen como trazas separadas. ¿Qué revisar?
:::

- [x] Inyección y extracción del contexto
- [ ] Resolución del dashboard
- [ ] Nombre del exporter
- [ ] Temporalidad métrica

:::explanation
:::lang es
Suele fallar la propagación del contexto.
:::
:::
:::

:::question id="d04" type="single"
:::lang es
¿Objetivo de telemetry schemas?
:::

- [x] Gestionar cambios de versión en datos de telemetría
- [ ] Sustituir OTLP
- [ ] Crear usuarios
- [ ] Decidir siempre sampling

:::explanation
:::lang es
Describen versiones y facilitan migraciones.
:::
:::
:::
