---
title: "Product Brief Distillate: gym-tracker"
type: llm-distillate
source: "product-brief.md"
created: "2026-06-09"
purpose: "Token-efficient context for downstream PRD / architecture / quick-dev workflows"
---

# gym-tracker — Detail Pack

## Requisitos capturados (hints, no formales)

- **Plataforma primaria:** iPhone Safari, uso en mano durante el entreno.
- **Plataforma secundaria:** macOS (cualquier navegador), uso para análisis post-entreno.
- **Modo PWA instalable** en iOS (icon, manifest, sin chrome de Safari). Importante para sensación nativa en home screen.
- **Offline-first:** el gym puede tener cobertura mala; la app debe funcionar sin red al registrar.
- **Sin autenticación en V1**: usuario único, datos por dispositivo.
- **Inputs numéricos:** `inputmode="decimal"` y steppers `+/-` para evitar abrir teclado completo.
- **Catálogo de ejercicios V1:** mix predefinido (~30-40 organizados por grupo muscular) + crear custom.
- **Persistencia V1:** IndexedDB local. Wrapper sugerido: Dexie o idb-keyval.
- **Export V1:** descarga CSV o append a Google Sheets vía API — pendiente de decidir.
- **Insights V1:** 1RM estimado (Epley/Brzycki), volumen semanal, frecuencia por grupo muscular, "hoy vs última vez" inline.

## Flujo de rutinas (diseño explícito del usuario)

- Al iniciar sesión: prompt "¿libre o rutina?".
- **Libre:** añadir ejercicios uno a uno durante la sesión.
- **Rutina:** elegir de listado de rutinas guardadas; ejercicios se precargan.
- **Al finalizar sesión libre:** prompt "¿guardar como rutina?" → si sí, pedir nombre → guardar.
- Filosofía: las rutinas **emergen del uso real**, no se diseñan en frío.

## Modelo de datos (entidades mínimas sugeridas)

- `Exercise` — id, nombre, grupo muscular, tipo (peso/bodyweight/tiempo), is_custom.
- `Routine` — id, nombre, lista ordenada de exercise_ids, created_at, created_from_session_id.
- `Session` (Workout) — id, fecha, duración, routine_id (opcional), notas (V2).
- `Set` — id, session_id, exercise_id, orden, peso, reps, timestamp, completed.
- **Set es la entidad de oro**. Todo lo demás deriva de agregaciones sobre Set.

## V0 — esqueleto mínimo (primer hito de implementación)

- Formulario serie (ejercicio en select básico, peso, reps, fecha).
- Persistencia: `localStorage` (no IndexedDB todavía).
- Lista historial: una tabla simple con todas las series.
- **Sin** rutinas, insights, PWA, export, estilos pulidos.
- Sirve como base de código + primera victoria psicológica.

## Decisiones técnicas pendientes (a resolver en arquitectura)

- **Stack frontend**: HTML+CSS+JS vanilla, o framework ligero (Svelte / Lit / Vue / Alpine.js)?
  - Vanilla → más fundamentos, menos lock-in.
  - Framework → curva pero más empleable.
  - Decisión pesa: aprendizaje vs. simplicidad.
- **Persistencia local**: Dexie (Promise-based, queries SQL-like) vs idb-keyval (más simple, key-value).
- **Export a Sheets**: descarga CSV (cero auth, simple) vs Google Sheets API + OAuth (más complejo, más educativo).
- **Build / deploy**: Vite local + carpeta servida via GitHub Pages, o sin build (HTML estático)?

## Patrones UX a copiar (de research de Strong / Hevy)

- Pantalla de sesión = lista de ejercicios con sets pre-rellenados desde la última vez.
- Tap en checkbox cierra la serie. (En V2 también dispara rest timer.)
- Stepper `+/-` al lado del input numérico, NO abrir teclado por defecto.
- "Hoy vs última vez" visible en línea durante el registro.
- Toast simple al batir un PR (sin badges agresivos ni streaks).
- Auto-incremento sugerido (+2,5 kg si última vez completaste todas reps) — V2.

## Trampas a evitar (de research)

- Streaks punitivos que generan culpa al romperse.
- Notificaciones moralistas / nagging.
- Paywalls (no aplica — es personal).
- Duplicar entradas si la app se cierra a mitad de sesión → manejar persistencia transaccional.
- Rest timer único para todo el entreno (cuando llegue en V2, distinguir warmup vs working).
- Onboarding largo antes del primer registro.

## Ideas rechazadas explícitamente en V1

- Sincronización iPhone↔Mac automática (en V1 se acepta la fricción del export manual; sube a V2 si molesta tras 2-3 semanas de uso).
- Rest timer (V2).
- Notas por sesión / ejercicio (V2).
- Streaks o gamification (decisión consciente: evitar mecánicas punitivas).
- Importación de históricos desde otras apps.
- RPE, fatiga, periodización.
- Vídeos demo.
- Funcionalidad social / compartir con entrenador.
- 4º criterio de éxito sobre aprendizaje (el aprendizaje queda como motivación del proceso, no métrica del producto).

## Competidores / referencias (no son enemigos — son la barra de comparación)

- **Strong** — referencia de velocidad de registro entre series. UI minimalista pulgar-friendly.
- **Hevy** — comunidad + PRs + templates. Quejas notables sobre no diferenciar rest timer warmup vs working.
- **Fitbod** — IA programa entrenos. Fuera de scope para nosotros.
- **JEFIT** — biblioteca enorme. Útil como referencia de organización de catálogo.
- **FitNotes** — minimalismo extremo, gratis sin ads. Filosofía cercana a la nuestra.
- **Setgraph** — foco en progressive overload y visualización.

## Insights/visualizaciones a derivar del modelo

- **1RM estimado** por ejercicio (Epley: `peso × (1 + reps/30)`). Sólo mostrar cuando reps ≤ 10 para fiabilidad.
- **Volumen** = `peso × reps` agregado por sesión, semana, mes.
- **Frecuencia por grupo muscular** — heatmap o barras semanales.
- **Histórico por ejercicio** — lista cronológica de todas las series + filtro fecha.
- **"Hoy vs última vez con este ejercicio"** — mostrado en el registro, no como vista aparte.

## Criterios de éxito (recap medibles)

1. **Adhesión** — se usa en cada sesión durante los 2 primeros meses. Medible: contar sesiones registradas vs sesiones reales (auto-reporte).
2. **Impacto** — los datos muestran progresión visible en al menos 2-3 ejercicios principales en 2 meses.
3. **Soberanía** — al final del periodo, todos los datos exportables sin pérdida a un Google Sheet.

## Open questions (a resolver en arquitectura o desarrollo)

- ¿Catálogo predefinido viene cargado en código (constante) o se hidrata desde un JSON externo?
- ¿Cómo gestionamos versionado del schema de IndexedDB si más adelante añadimos campos a `Set`?
- ¿El export a Sheets crea una hoja nueva cada vez, o reescribe / hace append a una existente?
- ¿Distinguimos entre "reps válidas a fallo" y "reps con margen" (para mejor 1RM)? Probablemente no en V1.
- ¿Backup automático local periódico (descargar CSV) para no perder datos si el navegador purga IndexedDB?

## Perfil del autor / usuario (contexto para futuras conversaciones)

- Primera app de desarrollo, primera experiencia con git (acabamos de crear el repo).
- Trabaja con BMad + Claude como asistente principal.
- Email personal: jlquinterom@gmail.com.
- Email corporativo (Globant): joseluis.quintero@globant.com — no usar para este proyecto.
- Usa MacBook con macOS Darwin 25.5.0; VS Code como editor.
- Comunicación en español.
- Pragmático: prioriza simplicidad y eficiencia sobre features sofisticadas.
