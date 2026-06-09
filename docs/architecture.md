---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - "docs/product-brief.md"
  - "docs/product-brief-distillate.md"
workflowType: 'architecture'
project_name: 'gym-tracker'
user_name: 'jlquintero'
date: '2026-06-09'
completedAt: '2026-06-09'
lastStep: 8
status: 'complete'
language: 'es'
---

# Architecture Decision Document — gym-tracker

_Este documento se construye colaborativamente paso a paso. Las secciones se añaden conforme se cierran decisiones._

## Contexto base

Documento ejecutado en español. Inputs:
- **Product Brief** ([docs/product-brief.md](product-brief.md))
- **Product Brief Distillate** ([docs/product-brief-distillate.md](product-brief-distillate.md))

> Nota: El workflow estándar de BMad espera un PRD formal. Para este proyecto personal, **el Distillate cumple ese rol**: incluye requisitos funcionales, decisiones pendientes, modelo de datos y patrones UX. Es decisión consciente del usuario evitar overhead innecesario.

## Project Context Analysis

### Requirements Overview

**Functional Requirements (9 FRs)** — orbitan en torno a 3 flujos:
- **Loop de registro** (FR1-FR3): durante el entreno, 2-3 toques por serie. Es la ruta crítica.
- **Gestión de catálogo y rutinas** (FR4-FR5): catálogo predefinido + custom; rutinas emergen del uso real.
- **Lectura/análisis** (FR6-FR8): histórico, insights (1RM/volumen/frecuencia), export a Sheets.
- **Empaquetado** (FR9): PWA instalable en iOS y Mac.

**Non-Functional Requirements (8 NFRs)** — los más críticos:
- UX 2-3 toques entre series (NFR1)
- Offline-first (NFR2)
- Soberanía de datos local + exportable (NFR3)
- Mobile-first responsive iPhone Safari (NFR4)
- Single-user sin auth (NFR5)
- Durabilidad ante purga del navegador (NFR6)

**Anti-requisitos explícitos**: sin notificaciones push, sin streaks, sin gamification punitiva.

### Scale & Complexity

- **Tipo de aplicación**: SPA + PWA, sin backend en V1
- **Volumen estimado de datos**: ~2.5k-3k sets/año (trivial para IndexedDB)
- **Componentes/vistas estimados**: 5-7
- **Complejidad global**: 🟢 BAJA
- **Dominio**: Web frontend con persistencia client-side
- **Usuarios concurrentes**: 1

### Technical Constraints & Dependencies

- Solo navegador (sin backend, V1)
- Safari iOS como navegador primario (tiene quirks PWA específicos: storage purging, install prompt, manifest restrictions)
- Migración futura V0→V1: `localStorage` → IndexedDB
- Export Sheets: depende de decisión técnica (CSV vs API+OAuth)

### Cross-Cutting Concerns

1. **Versionado de schema IndexedDB** — estrategia de migración al añadir campos
2. **Resiliencia ante purga de storage de iOS Safari** — backup local periódico recomendado
3. **Estrategia de caching del Service Worker** — qué se cachea, cuándo invalida
4. **Persistencia del estado "sesión en curso"** — recuperar si la app se cierra a mitad
5. **Identificadores estables de ejercicios** — slugs vs IDs (afecta export)
6. **Consistencia naming** entre código interno y dataset exportado

### Critical Path Insight

Todo el éxito de la app pivota en **un único loop**: registrar serie con precarga del último valor en 2-3 toques pulgar (FR1 + FR2 + NFR1 + NFR7). Si ese loop es perfecto, el 80% del valor está conseguido. Todo lo demás (insights, export, rutinas) son satélites.

## Starter Template Evaluation

### Primary Technology Domain

**Frontend web (PWA con persistencia client-side)**. Sin backend en V1.

### Estrategia en 2 fases

| Fase | Starter | Comando |
|---|---|---|
| V0 | **Ninguno** (HTML+CSS+JS vanilla) | _(no aplica)_ |
| V1 | **`@vite-pwa/create-pwa` vanilla template** | `npm create @vite-pwa/pwa@latest` |

### V0 — Sin starter

**Rationale:** V0 (formulario + localStorage + tabla histórico) no necesita build, ni PWA, ni dependencias. Trabajar sin starter en esta fase maximiza el aprendizaje de fundamentos (DOM API, eventos, localStorage, HTML/CSS) sin abstracciones que oculten qué hace cada línea.

**Estructura V0:**
- `index.html` — markup + entry point
- `app.js` — lógica
- `style.css` — estilos mobile-first
- _(opcional)_ `exercises.json` — catálogo seed

**Servidor de desarrollo V0:**
- VS Code "Live Server" extension (recomendado), o
- `python3 -m http.server 8000`

**Lenguaje V0:** JavaScript plano (sin TypeScript).

### V1 — Vite PWA Vanilla

**Rationale:** V1 requiere PWA instalable + Service Worker + offline + caching. Implementarlo manualmente es propenso a errores. `vite-plugin-pwa` (zero-config) con template vanilla aporta esto preconfigurado **sin imponer framework**.

**Comando de inicialización V1:**

```bash
npm create @vite-pwa/pwa@latest
# Prompts: nombre proyecto, template = vanilla, strategy = generateSW, prompt for update = yes
```

**Decisiones arquitectónicas que aporta el starter V1:**

- **Lenguaje:** JavaScript plano (TypeScript queda como opción futura, no V1).
- **Build:** Vite 7 (HMR, ES modules, build optimizado).
- **PWA:** `vite-plugin-pwa` + Workbox — service worker + manifest auto-generados.
- **Estrategia SW:** `generateSW` por defecto.
- **Estructura:** `index.html` + `src/main.js` + `public/`.

### Contrato de datos compartido V0 ↔ V1

Para hacer trivial la migración V0→V1, V0 guardará en `localStorage` usando el **mismo shape de objeto** que V1 usará en IndexedDB:

```json
{
  "schemaVersion": 0,
  "sets": [
    { "id": "uuid", "sessionId": "uuid", "exerciseId": "bench-press",
      "weight": 60, "reps": 10, "timestamp": "2026-06-09T18:32:00Z" }
  ],
  "exercises": [
    { "id": "bench-press", "name": "Press banca", "muscleGroup": "pecho", "isCustom": false }
  ]
}
```

**Migración V0→V1:** un script de ~10 líneas que lee `localStorage`, valida `schemaVersion`, y vuelca cada array a su store IndexedDB correspondiente.

### Migración V0 → V1 (cuándo y cómo)

**Cuándo migrar:** sin disparador formal. Migrar cuando se quiera PWA instalable, offline robusto, o gestión de más de ~50-100 entrenos. El usuario decide el momento.

**Cómo migrar:**
1. Nueva rama git `v1` (o subdirectorio paralelo).
2. `npm create @vite-pwa/pwa@latest` en limpio.
3. Copiar `app.js` V0 → `src/main.js` (adaptar a módulos ES).
4. Importar dataset V0 usando el contrato de datos compartido.
5. Mantener tag `v0-final` en git como referencia.

**Nota:** La inicialización del proyecto V0 será la primera historia de implementación.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (block V0 implementation):**
- Modelo de datos formal (Set / Exercise / Session / Routine)
- Generación de IDs

**Important Decisions (V1):**
- IndexedDB wrapper (Dexie)
- Export strategy (CSV download)
- Deploy strategy (GitHub Pages)
- Routing approach (sin router)

**Not Applicable (justified):**
- Autenticación: single-user, sin login (NFR5)
- API & backend: sin servicios remotos en V1
- Rate limiting / caching servidor: client-only

**Deferred (post-V1):**
- Sync iPhone↔Mac automático → V2
- Backup automático periódico → según uso real
- TypeScript → opcional V1.5
- Google Sheets API (OAuth) → opcional V1.5

### Data Architecture

**Persistencia:**
- **V0:** `localStorage` (key única `gym-tracker-data`) con shape JSON definido en Step 3.
- **V1:** **IndexedDB via Dexie 4.4.3** (latest junio 2026).

**Modelo de datos formal:**

```typescript
// Notación TypeScript para claridad; código JS plano

interface Exercise {
  id: string;              // crypto.randomUUID() o slug ('bench-press') para predefinidos
  name: string;            // "Press banca"
  muscleGroup: string;     // "pecho", "espalda", "pierna", "hombro", "brazo", "core", "otros"
  isCustom: boolean;       // false para predefinidos, true para creados por usuario
}

interface Session {
  id: string;              // crypto.randomUUID()
  startedAt: string;       // ISO 8601
  endedAt: string | null;  // null si sesión en curso
  routineId: string | null; // si arrancó desde rutina
}

interface Set {
  id: string;              // crypto.randomUUID()
  sessionId: string;       // FK
  exerciseId: string;      // FK
  order: number;           // orden dentro de la sesión
  weight: number;          // kg, número decimal
  reps: number;            // entero
  completedAt: string;     // ISO 8601
}

interface Routine {
  id: string;              // crypto.randomUUID()
  name: string;            // "Día de pecho"
  exerciseIds: string[];   // orden de ejercicios
  createdAt: string;
  createdFromSessionId: string | null; // sesión libre que originó la rutina
}
```

**Stores Dexie V1:**
```javascript
db.version(1).stores({
  exercises: 'id, muscleGroup',
  sessions: 'id, startedAt',
  sets: 'id, sessionId, exerciseId, completedAt',
  routines: 'id, name'
});
```

**Generación de IDs:** `crypto.randomUUID()` nativo. Soporte iOS Safari 15.4+ (marzo 2022). Requiere HTTPS o localhost (ambos casos cumplen).

**Validación:** sin librería de validación. Validación inline en la función de "guardar serie" (peso > 0, reps ≥ 1, exerciseId existe).

### Frontend Architecture

**Lenguaje:** JavaScript plano (sin TypeScript). Sin transpilación en V0.

**CSS:** Vanilla CSS con custom properties (variables) para tema. Mobile-first. Media query para Mac (`min-width: 768px`).

**State management:** Single module pattern. Un objeto `state` exportado desde `app.js` (V0) o `src/state.js` (V1) con funciones para mutarlo. Sin librería de state management.

**Routing:** **Sin router**. Variable `currentView` + función `renderView()` que muestra/oculta secciones del DOM. Las "vistas" son: `home`, `session-in-progress`, `history`, `insights`, `exercises`, `routines`.

**Reactividad:** manual. Tras cada mutación de `state`, llamar a `renderView()` (o renders más finos por sección si la performance lo requiere — improbable en V1).

### Infrastructure & Deployment

**V0:**
- **Desarrollo:** VS Code Live Server o `python3 -m http.server 8000`.
- **Producción:** no hay. V0 es prototipo personal.

**V1:**
- **Build:** `vite build` (genera `dist/`).
- **Deploy:** **GitHub Pages** via branch `gh-pages` o GitHub Action automatizada en `main`.
- **`dist/` en `.gitignore`** — el build no se commitea.
- **URL pública:** `jlquintero.github.io/gym-tracker/` (o equivalente según usuario GitHub).
- **HTTPS:** automático en GitHub Pages (requisito de PWA y de `crypto.randomUUID()`).
- **Service Worker:** generado por `vite-plugin-pwa` (Workbox, estrategia `generateSW`).
- **Manifest:** generado por `vite-plugin-pwa` con name, icons, theme color.

**Acceso desde iPhone:**
1. Usuario abre la URL pública en Safari (cualquier red, una vez).
2. "Compartir" → "Añadir a pantalla de inicio" → PWA instalada.
3. A partir de aquí, funciona **offline**. Solo necesita red para actualizaciones (que se descargan en background cuando hay).

### Decision Impact Analysis

**Implementation sequence (orden recomendado):**

1. V0: crear `index.html` + `style.css` + `app.js` con formulario y localStorage.
2. V0: añadir vista de histórico (tabla simple) e implementar precarga del último valor.
3. V0: usar ~5 entrenos reales para validar el flujo.
4. V1: scaffold con `npm create @vite-pwa/pwa@latest`.
5. V1: migrar persistencia a Dexie + importar datos V0.
6. V1: implementar rutinas (libre + guardar como rutina al cerrar).
7. V1: implementar vistas de insights (1RM, volumen, frecuencia).
8. V1: export CSV.
9. V1: deploy a GitHub Pages.

**Cross-component dependencies:**
- Catálogo de ejercicios bloquea formulario de registro.
- Dexie + schema bloquea todo lo de V1.
- PWA manifest + service worker bloquea instalación.
- HTTPS (GitHub Pages) bloquea `crypto.randomUUID()` en producción.

## Implementation Patterns & Consistency Rules

### Naming Conventions

| Cosa | Convención | Ejemplo |
|---|---|---|
| Variables y funciones JS | `camelCase` | `currentSession`, `getLastSet(exerciseId)` |
| Constantes globales | `UPPER_SNAKE_CASE` | `STORAGE_KEY`, `MAX_REPS` |
| Archivos de código | `kebab-case.js` | `app.js`, `exercise-catalog.js`, `state.js` |
| Clases CSS | `kebab-case` | `.set-row`, `.exercise-select` |
| IDs HTML | `kebab-case` | `id="form-add-set"` |
| Atributos `data-*` | `data-kebab-case` | `data-exercise-id="..."` |
| Campos JSON / objetos | `camelCase` | `{ exerciseId, weight, reps, completedAt }` |
| Slugs de ejercicios predefinidos | `kebab-case` | `"bench-press"`, `"squat"`, `"pull-up"` |

### Data Format Patterns

| Tipo | Formato | Ejemplo |
|---|---|---|
| Fechas | ISO 8601 string (`new Date().toISOString()`) | `"2026-06-09T18:32:00.123Z"` |
| IDs | UUID v4 (`crypto.randomUUID()`) | `"a1b2c3d4-..."` |
| Peso | número decimal en kg | `12.5` |
| Reps | entero positivo | `10` |
| Booleanos | `true` / `false` (nunca `1`/`0`) | `isCustom: false` |
| Ausencia | `null` (nunca `undefined` en datos persistidos) | `endedAt: null` |

### State Management Pattern

Single module pattern. Un objeto `state` central, mutado únicamente a través de funciones exportadas. Tras cada mutación, `renderView()` se llama al final (reactividad manual, sin observers).

```javascript
// state.js (V1) o dentro de app.js (V0)
const state = {
  currentView: 'home',           // 'home' | 'session' | 'history' | 'insights' | 'exercises' | 'routines'
  currentSession: null,
  exercises: [],
  routines: [],
};

function startSession({ routineId = null } = {}) { /* mutar state */ renderView(); }
function addSet({ exerciseId, weight, reps }) { /* mutar state, persistir */ renderView(); }
function endSession() { /* ... */ renderView(); }
```

**Regla:** ninguna mutación de `state` directa desde fuera del módulo.

### Error Handling Patterns

- Operaciones de persistencia (`localStorage`, Dexie) → siempre dentro de `try/catch`.
- Errores de validación (peso ≤ 0, reps < 1) → mostrar inline en el formulario, **no `alert()`**.
- Errores inesperados → `console.error(...)` + toast no intrusivo ("No se pudo guardar, inténtalo de nuevo").
- **Nunca** silenciar errores con `catch(e) {}` vacío.

### File Structure Patterns

**V0 (flat):**
```
gym-tracker/
├── index.html
├── app.js
├── style.css
├── exercises.json     (catálogo seed, opcional)
└── docs/
```

**V1 (organizado por responsabilidad, no por tipo):**
```
gym-tracker/
├── index.html
├── public/
│   ├── manifest.webmanifest    (generado)
│   └── icons/
├── src/
│   ├── main.js                  (entry, registro SW, render inicial)
│   ├── state.js                 (objeto state + mutaciones)
│   ├── db.js                    (setup Dexie + CRUD wrappers)
│   ├── views/
│   │   ├── home.js
│   │   ├── session.js
│   │   ├── history.js
│   │   ├── insights.js
│   │   ├── exercises.js
│   │   └── routines.js
│   ├── insights/
│   │   ├── one-rep-max.js       (fórmula Epley)
│   │   ├── volume.js
│   │   └── frequency.js
│   ├── export-csv.js
│   └── seed-exercises.js
├── docs/
└── vite.config.js
```

**Reglas adicionales:**
- Cada `.js` exporta funciones nombradas, **NO `default export`**.
- Archivos `< 200 líneas`. Si crecen, dividir por responsabilidad.
- Tests unitarios (opcionales) co-localizados como `*.test.js`.

### Anti-patterns to avoid

| ❌ Anti-patrón | ✅ En su lugar |
|---|---|
| Mutar `state` desde fuera de su módulo | Función exportada (`addExercise(...)`) |
| DOM desde lógica de negocio | Capa `views/` toca DOM; `state.js`/`db.js` no |
| `alert()` o `confirm()` nativos | Toasts/modales internos |
| `.then()` mezclado con `async/await` | `async/await` siempre |
| `var` | `const` por defecto, `let` si reasignación |
| `==` | `===` siempre |
| IDs/fechas ad-hoc | `crypto.randomUUID()` y `toISOString()` |
| `console.log` en producción | Solo en dev; quitar al cerrar V1 |

### Enforcement Guidelines (reglas para el asistente de IA)

Cuando un agente de IA (Claude / BMad) escriba código para este proyecto, debe cumplir:

1. **Toda mutación de `state` termina llamando a `renderView()`** (o render fino).
2. **Persistencia siempre con `try/catch`** + error log + mensaje user-friendly.
3. **No introducir librerías** sin justificación explícita. Únicas dependencias permitidas en V1: `dexie` + las del starter PWA.
4. **No introducir TypeScript** salvo petición explícita.
5. **Archivos `< 200 líneas`**.
6. **Slugs de ejercicios predefinidos en `kebab-case`**; IDs custom en UUID.
7. **Validación inline en el form**, no en `alert()`.
8. **Date strings siempre ISO 8601**, no timestamps numéricos.

## Project Structure & Boundaries

### Complete Project Directory Structure — V0

```
gym-tracker/
├── .gitignore
├── README.md
├── index.html              ← entry point, markup completo de las vistas
├── app.js                  ← TODA la lógica V0 (state + DOM + persistencia)
├── style.css               ← estilos mobile-first
├── exercises.json          ← catálogo seed (~30-40 ejercicios predefinidos)
└── docs/
    ├── product-brief.md
    ├── product-brief-distillate.md
    └── architecture.md
```

### Complete Project Directory Structure — V1

```
gym-tracker/
├── .gitignore              ← + node_modules/, dist/, .env
├── README.md
├── package.json
├── package-lock.json
├── vite.config.js          ← config Vite + vite-plugin-pwa
├── index.html              ← entry HTML con div #app
├── public/
│   ├── icons/              ← iconos PWA (192px, 512px, maskable)
│   └── favicon.ico
├── src/
│   ├── main.js             ← entry JS: registra SW, monta vista inicial
│   ├── state.js            ← objeto state central + mutaciones
│   ├── db.js               ← setup Dexie + CRUD wrappers
│   ├── views/
│   │   ├── home.js         ← FR3: pregunta "libre o rutina"
│   │   ├── session.js      ← FR1, FR2, FR5: registro, precarga, fin
│   │   ├── history.js      ← FR6: lista cronológica por ejercicio
│   │   ├── insights.js     ← FR7: 1RM, volumen, frecuencia
│   │   ├── exercises.js    ← FR4: catálogo + crear custom
│   │   └── routines.js     ← FR5: gestión de rutinas guardadas
│   ├── insights/
│   │   ├── one-rep-max.js  ← fórmula Epley
│   │   ├── volume.js
│   │   └── frequency.js
│   ├── export-csv.js       ← FR8: serializa stores a CSV
│   ├── seed-exercises.js   ← catálogo predefinido (~30-40 ejercicios)
│   └── ui/
│       ├── toast.js        ← componente toast no intrusivo
│       └── stepper.js      ← input numérico con +/- (NFR7)
├── docs/
│   ├── product-brief.md
│   ├── product-brief-distillate.md
│   └── architecture.md
└── .github/
    └── workflows/
        └── deploy.yml      ← GitHub Action: build + deploy a gh-pages
```

### Functional Requirements → Files Mapping

| FR | Requisito | Vive en (V1) |
|---|---|---|
| FR1 | Registrar serie | `src/views/session.js` + `src/state.js#addSet()` + `src/db.js#putSet()` |
| FR2 | Precarga última serie | `src/views/session.js` → `src/db.js#getLastSetByExercise(exerciseId)` |
| FR3 | Sesión libre o desde rutina | `src/views/home.js` → `src/state.js#startSession({routineId?})` |
| FR4 | Catálogo predefinido + custom | `src/seed-exercises.js` + `src/views/exercises.js` + `src/db.js` |
| FR5 | Guardar como rutina al finalizar libre | `src/views/session.js` (prompt) + `src/state.js#endSession()` + `src/db.js#putRoutine()` |
| FR6 | Historial por ejercicio | `src/views/history.js` → `src/db.js#getSetsByExercise(exerciseId)` |
| FR7 | Insights (1RM, volumen, frecuencia) | `src/views/insights.js` + `src/insights/*.js` |
| FR8 | Export CSV | `src/export-csv.js` + botón en `src/views/insights.js` |
| FR9 | PWA instalable | Generado por `vite-plugin-pwa` desde `vite.config.js` + `public/icons/` |

### Non-Functional Requirements → Components Mapping

| NFR | Dónde se materializa |
|---|---|
| NFR1 (2-3 toques) | UX de `src/views/session.js` + `src/ui/stepper.js` |
| NFR2 (offline-first) | Service Worker generado por `vite-plugin-pwa` (estrategia `generateSW`) |
| NFR3 (soberanía) | `src/db.js` (IndexedDB local) + `src/export-csv.js` |
| NFR4 (responsive) | `src/style.css` con media queries mobile-first |
| NFR5 (single-user) | No hay sistema de auth en ningún archivo |
| NFR6 (durabilidad) | (V1.5) `src/backup-csv.js` o aviso periódico desde `src/main.js` |
| NFR7 (input móvil) | `src/ui/stepper.js` + `inputmode="decimal"` en `src/views/session.js` |
| NFR8 (anti-streaks) | Decisión arquitectónica: ningún archivo de notificaciones/engagement |

### Architectural Boundaries

Reglas estrictas de qué módulo puede tocar qué:

- **`views/*.js`** → puede leer `state.js` y suscribirse a su render. **NO toca `db.js` directamente**.
- **`state.js`** → único punto que llama a `db.js` para persistir. Único módulo donde se muta `state`.
- **`db.js`** → único punto que toca IndexedDB. Expone async functions.
- **`insights/*.js`** y **`export-csv.js`** → funciones puras, sin side-effects.
- **`ui/*.js`** → componentes reutilizables sin estado propio.

### Data Flow (caso típico: "añadir serie")

```
Usuario toca botón "+ serie"
          │
          ▼
[views/session.js] handleAddSet(event)  — lee form, valida inline
          │
          ▼
[state.js] addSet({ exerciseId, weight, reps })
   - muta state.currentSession.sets
          │
          ▼
[db.js] putSet(setObject)  — async, try/catch
   - dexie: db.sets.put(setObject)
          │
          ▼
[state.js] renderView()
          │
          ▼
[views/session.js] render()  — actualiza tabla + "hoy vs última vez"
```

### External Integrations

| Externo | Punto de contacto | Frecuencia |
|---|---|---|
| GitHub Pages | Deploy via `.github/workflows/deploy.yml` | En cada `git push` a `main` |
| Service Worker / Workbox | Generado por `vite-plugin-pwa` | Build time + runtime cache |
| Google Sheets | **Ninguno automático** — usuario importa CSV manualmente | Solo cuando el usuario lo decide |

**No hay APIs HTTP que se llamen.** No hay autenticación. No hay servicios externos en runtime.

### Configuration files

- `package.json` → dependencies + scripts (`dev`, `build`, `preview`)
- `vite.config.js` → vite-plugin-pwa config + `base` para GitHub Pages
- `.gitignore` → `node_modules/`, `dist/`, `.DS_Store`, `.env*`
- `.github/workflows/deploy.yml` → CI build + deploy

## Architecture Validation Results

### Coherence Validation ✅

- Stack compatible: Vite 7 + vite-plugin-pwa + Dexie 4 + Workbox combinan oficialmente.
- Versiones verificadas: Vite 7, Dexie 4.4.3, `crypto.randomUUID` soportado iOS 15.4+.
- Patrones idiomáticos para vanilla JS (single-state + render manual).
- Estructura permite enforcement de boundaries (`views → state → db`).
- Sin decisiones contradictorias detectadas.

### Requirements Coverage Validation ✅

- **9 Functional Requirements** mapeados a archivos concretos (Step 6).
- **8 Non-Functional Requirements** materializados en componentes/decisiones concretas.
- **Anti-requisitos** (sin streaks, sin notificaciones) respetados en estructura (ningún archivo de engagement).

### Implementation Readiness Validation ✅

- Modelo de datos formal con tipos exactos.
- Estrategia V0→V1 con contrato de datos compartido (migración trivial).
- Reglas explícitas para asistentes IA (consistencia entre sesiones de desarrollo).
- Decisión sequence ordenada en 9 pasos.

### Gap Analysis

| Prioridad | Gap | Resolución |
|---|---|---|
| 🟡 Importante | Catálogo predefinido de ejercicios no listado | Crear `exercises.json` en primera historia V0; empezar con 10, crecer |
| 🟡 Importante | Sin diseño visual ni mockups | Decidir sobre la marcha con CSS minimalista (1 fuente sistema, 1 color acento) |
| 🟡 Importante | Iconos PWA no generados | Tarea V1: `pwa-asset-generator` o emoji 🏋️→PNG |
| 🟢 Menor | Update flow del Service Worker | Estrategia `prompt for update` (toast "Actualizar") |
| 🟢 Menor | Regla "1RM solo si reps ≤ 10" no formalizada | Implementar en `src/insights/one-rep-max.js`: `return null` si reps > 10 |
| 🟢 Menor | Testing strategy no decidida | Cero tests V0; tests opcionales en funciones puras V1 |
| 🟢 Menor | i18n no especificado | Constante `LANG='es-ES'` en `src/main.js`; sin multi-idioma |

### Architecture Completeness Checklist

- ✅ Project context thoroughly analyzed (Step 2)
- ✅ Scale and complexity assessed (Step 2)
- ✅ Technical constraints identified (Step 2)
- ✅ Cross-cutting concerns mapped (Step 2)
- ✅ Critical decisions documented with versions (Step 4)
- ✅ Technology stack fully specified (Step 3 + 4)
- ✅ Integration patterns defined (Step 4 + 6)
- ✅ Naming conventions established (Step 5)
- ✅ Structure patterns defined (Step 5)
- ✅ Communication patterns specified (Step 5)
- ✅ Process patterns documented (Step 5)
- ✅ Complete directory structure defined (Step 6)
- ✅ Component boundaries established (Step 6)
- ✅ Integration points mapped (Step 6)
- ✅ Requirements to structure mapping complete (Step 6)

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION** ✅
**Confidence Level: ALTA**

**Key Strengths:**
- Pragmatismo: evita over-engineering (sin TypeScript V0, sin framework, sin router).
- Soberanía coherente E2E: IndexedDB + GitHub Pages, datos nunca salen del navegador.
- Estrategia V0→V1 con safety net (contrato de datos compartido).
- Reglas explícitas para asistentes IA.

**Areas for Future Enhancement (post-V1):**
- TypeScript en V1.5 si el código crece.
- Sync iPhone↔Mac (V2).
- Rest timer, RPE, notas (backlog V2).
- Tests unitarios para funciones puras.

### Implementation Handoff

**AI Agent Guidelines:**
- Seguir todas las decisiones arquitectónicas exactamente como están documentadas.
- Usar patrones de implementación consistentemente en todos los componentes.
- Respetar la estructura del proyecto y los boundaries entre módulos.
- Consultar este documento ante cualquier duda arquitectónica.

**First Implementation Priority:**
Primera historia de V0: crear `index.html` + `app.js` + `style.css` + `exercises.json` con catálogo inicial de ~10 ejercicios, formulario de "registrar serie", persistencia en `localStorage` con el shape de datos del contrato compartido, y una vista simple de histórico (tabla).
