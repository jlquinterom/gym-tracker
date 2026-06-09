---
title: "Product Brief: gym-tracker"
status: "complete"
created: "2026-06-09"
updated: "2026-06-09"
author: "jlquintero"
inputs:
  - "User interview (2026-06-09)"
  - "Web research on gym tracking apps (Strong, Hevy, Fitbod, JEFIT, FitNotes)"
---

# Product Brief: gym-tracker

## Executive Summary

**gym-tracker** es una web app personal responsive para registrar series de gimnasio entre descansos y observar la propia evolución a lo largo del tiempo. Está pensada como **PWA instalable en Safari iOS** (uso primario, en mano durante el entreno) y como **vista de análisis desde MacBook** (consulta posterior, exportes a Google Sheets).

Para un usuario que ya entrena de forma consistente, no tener un sistema de registro fiable significa repetir entrenos sin certeza de si realmente está progresando. Las apps líderes del mercado (Strong, Hevy) resuelven el problema técnico, pero los datos viven en sus servidores; la libreta o el Excel pierden ritmo en el gym y no permiten ver tendencias sin esfuerzo.

**gym-tracker** llena ese hueco con tres compromisos: (1) rápida como Strong — 2-3 toques por serie usando precarga del último entreno, (2) tuya en propiedad — datos en el navegador (IndexedDB) y exportables a Google Sheets cuando quieras, y (3) motivacional sin ser punitiva — comparativa "hoy vs última vez" inline, celebración de PRs y gráfico de 1RM estimado, sin streaks que castiguen.

Es, además, el **primer proyecto de desarrollo del autor con asistencia de IA (Claude + BMad)**: vehículo deliberado de aprendizaje, pero con un destino funcional real que se quiere usar.

## The Problem

Durante un entreno serio, el ciclo "trabajar serie → descansar 60-180s → siguiente serie" deja muy poco margen para registrar. Los puntos de dolor concretos:

- **Memoria poco fiable entre sesiones**: "¿con cuánto cerré el press banca la semana pasada?" — si no se registra en el momento, se pierde o se inventa.
- **Apps existentes atan los datos**: Strong y Hevy son rápidas, pero al cancelar suscripción o cambiar de app los datos quedan secuestrados.
- **Libreta/Excel rompen el flujo**: anotar a mano funciona, pero no permite ver "evolución de press banca en últimos 3 meses" sin esfuerzo manual.
- **Falta el "empujón" durante el set**: saber **en pantalla, antes de empezar la serie**, qué hiciste la última vez, es el detonante para intentar superarlo.

Coste del status quo: entrenos estancados sin saberlo, o esfuerzo desproporcionado para hacer seguimiento manual.

## The Solution

Una web app responsive con un solo flujo principal: **"empezar entreno → libre o desde rutina guardada → registrar serie a serie → terminar → opcionalmente guardar como rutina"**.

**El loop de registro durante el entreno:**

1. Toco "+ serie" en el ejercicio actual.
2. La app **precarga peso y reps de mi última vez con ese ejercicio**.
3. Ajusto con `+/-` si quiero subir o bajar (sin abrir teclado).
4. Toco el checkbox para cerrar la serie.
5. En la cabecera veo "hoy vs última vez" actualizándose en directo.

**El loop de evolución (desde Mac o iPhone, fuera del gym):**

1. Abro la app, voy a "Mi progreso".
2. Veo: 1RM estimado por ejercicio principal, volumen semanal de últimas 4 semanas, frecuencia por grupo muscular, racha de sesiones.
3. Si quiero, exporto el dataset completo a Google Sheets para análisis libre.

**Persistencia híbrida**: IndexedDB local en el navegador (rápido, offline, sin login) + botón de "Exportar a Google Sheets" para backup y análisis avanzado. Una sola tabla `sets` con `[fecha, ejercicio, peso, reps, sesion_id, rutina_id]` es suficiente para derivar todos los insights.

## What Makes This Different

| Dimensión | Apps comerciales (Strong, Hevy) | Libreta / Excel | **gym-tracker** |
|---|---|---|---|
| Velocidad de registro entre series | ✅ Excelente | ❌ Lenta | ✅ Equivalente (mismo patrón) |
| Datos en propiedad del usuario | ❌ Servidores del vendor | ✅ Total | ✅ Total (navegador + Sheets) |
| Análisis automático de evolución | ✅ Sí (a menudo de pago) | ❌ Manual | ✅ Sí (gratis, mi Sheet) |
| Coste | 💰 Suscripción | ✅ Gratis | ✅ Gratis |
| Rutinas dinámicas (emergen del uso real) | ⚠️ Hay que pre-crearlas | N/A | ✅ Se ofrecen guardar al cerrar sesión libre |
| Vehículo de aprendizaje de desarrollo + IA | ❌ | ❌ | ✅ |

**El diferencial conceptual más fuerte**: las rutinas no se diseñan en frío en una pantalla aparte — emergen orgánicamente. Cuando termino un entreno libre, la app me ofrece guardarlo como rutina con un nombre. Esto refleja cómo entreno de verdad: improviso, y lo que funciona se cristaliza.

## Who This Serves

**Usuario único: Jose Luis Quintero.** Persona que ya entrena con peso de forma consistente, usa iPhone como dispositivo principal en el gimnasio y MacBook para análisis posterior. No se contempla multi-usuario en ningún momento.

**Aha moment esperado**: la primera vez que, a punto de empezar la segunda serie de press banca, ve precargado "12.5 kg × 10 reps (última vez)" y piensa "voy a por 12 reps". Si eso ocurre, la app ha cumplido.

## Success Criteria

Tres métricas, en orden de importancia:

1. **Adhesión** — la app se usa en **cada** sesión de entreno durante los primeros 2 meses, sin abandonarla a mitad. Medido cualitativamente por el propio usuario.
2. **Impacto en el progreso** — los números (peso máximo, volumen) reflejan progresión visible, atribuible al hecho de tener los datos delante durante el entreno.
3. **Soberanía de datos** — al final del periodo, todos los datos pueden exportarse a Google Sheets y analizarse con libertad total.

Si las tres se cumplen a 2 meses, el producto es un éxito. Si la 1 falla, todo lo demás es irrelevante.

## Scope

### V0 — Esqueleto mínimo (primer hito)

Antes de afrontar V1 completa, construir una versión mínima de un solo objetivo: **demostrar el flujo de extremo a extremo**.

- Formulario simple para registrar una serie: ejercicio (texto libre o select básico), peso, reps, fecha.
- Persistencia en `localStorage` (sin IndexedDB todavía).
- Una tabla del historial mostrando todas las series registradas.
- Sin rutinas, sin insights, sin PWA, sin export, sin estilos pulidos.

**Para qué sirve:** primera victoria psicológica, base de código sobre la que iterar, y validación de que el flujo básico te funciona. Cuando V0 esté en producción local y registres 2-3 entrenos con ella, pasamos a V1.

### V1 — Producto utilizable

**Dentro (lo que se construye primero):**

- Catálogo de ejercicios: **listado predefinido (~30-40, organizados por grupo muscular) + posibilidad de añadir ejercicios propios**.
- Empezar sesión: pregunta "¿entreno libre o rutina guardada?". Si rutina → carga ejercicios precargados.
- Registro de serie: ejercicio, peso, reps. Precarga del último valor para ese ejercicio.
- Finalizar sesión: pregunta "¿guardar este entreno como rutina?". Si sí → nombre + se guarda.
- Vista histórico por ejercicio (todas las series, con fecha y datos).
- Vista de insights: 1RM estimado por ejercicio, volumen semanal, frecuencia por grupo muscular, indicador "hoy vs última vez" durante el registro.
- Persistencia local en IndexedDB (funciona offline, sin login).
- Export manual del dataset a Google Sheets (descarga CSV o append vía API — TBD en arquitectura).
- PWA instalable en iPhone Safari y Mac (icon, manifest, sin chrome de navegador).

**Fuera (V2 o más adelante):**

- Cuenta de usuario / autenticación.
- Sincronización automática entre dispositivos (iPhone ↔ Mac). Por ahora cada dispositivo tiene sus datos; el export a Sheets actúa como **puente manual** para llevar lo registrado en iPhone al Mac para análisis.
- Rest timer.
- Notificaciones push / recordatorios.
- Streaks o gamification (decisión consciente: evitar mecánicas punitivas).
- Notas por sesión o serie (ej. "hoy me dolía el hombro", "técnica floja"). Útil pero diferible.
- RPE, fatiga, periodización avanzada.
- Vídeos demo de ejercicios.
- Importación de datos históricos desde otras apps o libretas.
- Funcionalidad social / compartir con entrenador.

## Vision (12-24 meses)

Si la V1 demuestra que el patrón funciona y el autor sigue usándola, las extensiones naturales serían: **rest timer inteligente** (diferente para warmup vs working sets), **sincronización iPhone↔Mac** (probablemente vía Google Drive o Supabase), **sugerencia de peso para la siguiente serie** basada en historial reciente, y **gráficos más ricos en la vista de progreso**. Ninguno de estos justifica retrasar la V1.

A más largo plazo, el código del proyecto seguirá siendo abierto y personal — no hay intención comercial. El valor a largo plazo es doble: una herramienta que sigue siendo útil, y una base de código mantenida con la que el autor seguirá practicando desarrollo asistido por IA.

## Anexo: Notas técnicas capturadas durante discovery

*(Estas no forman parte del brief ejecutivo pero se preservan para informar la fase de arquitectura.)*

- Stack candidato: HTML + CSS + JS vanilla, o framework muy ligero (Svelte / Lit / Vue). Decisión en fase de arquitectura.
- Persistencia: IndexedDB con wrapper ligero (Dexie, idb-keyval) probablemente.
- Export a Sheets: opción simple = descarga CSV. Opción más educativa = OAuth + Google Sheets API.
- Modelo de datos mínimo: tabla `sets` como entidad de oro, entidades `exercise` y `session` para agrupar.
- Inspiración UX: copiar patrón de pantalla de sesión de Strong (lista de ejercicios con sets precargados + checkbox para cerrar).
- 1RM estimado: fórmula de Epley (peso × (1 + reps/30)) o Brzycki. **Funciona mejor con series de 3-8 reps**; series largas (12+) dan estimaciones menos fiables — vale la pena indicarlo en la UI o solo calcularlo cuando reps ≤ 10.
