---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-06-09'
inputDocuments:
  - "docs/product-brief.md"
  - "docs/product-brief-distillate.md"
  - "docs/architecture.md"
workflowType: 'epics-and-stories'
project_name: 'gym-tracker'
user_name: 'jlquintero'
date: '2026-06-09'
language: 'es'
---

# gym-tracker — Epic Breakdown

## Overview

Este documento descompone los requisitos del **Product Brief** + **Distillate** + **Architecture** en epics y stories implementables. Sigue la estrategia 2-fases definida en arquitectura: **V0 (esqueleto)** → **V1 (producto utilizable)**.

## Requirements Inventory

### Functional Requirements

- **FR1**: El sistema permite registrar una serie con tres datos (ejercicio, peso en kg, repeticiones) durante un entreno en curso.
- **FR2**: Al iniciar el registro de una serie, el sistema precarga el peso y reps de la última vez que el usuario hizo ese ejercicio.
- **FR3**: Al iniciar una nueva sesión de entreno, el sistema pregunta al usuario si quiere hacer "entreno libre" o "rutina guardada"; si rutina, carga los ejercicios precargados.
- **FR4**: El sistema mantiene un catálogo de ejercicios predefinidos (~30-40 organizados por grupo muscular) y permite al usuario crear ejercicios propios.
- **FR5**: Al finalizar un entreno libre, el sistema ofrece al usuario guardar la sesión como rutina reutilizable, pidiendo un nombre.
- **FR6**: El usuario puede consultar el histórico completo de series por ejercicio, ordenado cronológicamente.
- **FR7**: El sistema calcula y muestra insights de progreso: 1RM estimado por ejercicio (fórmula Epley, solo reps ≤ 10), volumen semanal (peso × reps), frecuencia por grupo muscular, y comparador "hoy vs última vez" inline durante el registro.
- **FR8**: El usuario puede exportar todo su dataset a un archivo CSV descargable desde el navegador.
- **FR9**: La app es instalable como PWA en iPhone Safari (Add to Home Screen) y en MacBook (cualquier navegador), con icono y manifest válidos.

### NonFunctional Requirements

- **NFR1**: El loop de registro de serie debe completarse en 2-3 toques entre series, optimizado para uso con un solo dedo (pulgar) durante el descanso.
- **NFR2**: La app debe funcionar 100% offline una vez instalada (gimnasios suelen tener cobertura mala). Service Worker con cache de assets y datos locales.
- **NFR3**: Todos los datos del usuario viven en su navegador (IndexedDB local en V1, localStorage en V0). No hay servidores propios. El export CSV garantiza portabilidad.
- **NFR4**: La interfaz es responsive mobile-first: optimizada para iPhone Safari (uso primario, viewport < 480px) y adaptada para Mac (≥ 768px) como vista secundaria.
- **NFR5**: La app es single-user. No hay registro, login, ni sistema de autenticación.
- **NFR6**: La app es resiliente ante la purga de storage de Safari iOS (que limpia datos en apps inactivas tras semanas). Mecanismos: opción manual de export, y aviso al usuario tras X tiempo sin backup.
- **NFR7**: Inputs numéricos optimizados para móvil: `inputmode="decimal"` para peso, `inputmode="numeric"` para reps, steppers `+/-` al lado del input para evitar abrir teclado completo.
- **NFR8**: Sin notificaciones push, sin streaks punitivos, sin gamification que genere culpa. Decisión consciente de no usar mecánicas de adherencia agresivas.

### Additional Requirements (Architecture-derived)

- **AR1**: Estrategia de implementación en 2 fases: **V0** (HTML + CSS + JS vanilla, `localStorage`, sin build, sin npm) → **V1** (Vite 7 + `vite-plugin-pwa` + Dexie 4.4.3 + Workbox).
- **AR2**: V0 utiliza una key única de `localStorage` (`gym-tracker-data`) con shape JSON definido. El shape es **idéntico** al que V1 usará en IndexedDB para hacer la migración trivial (contrato de datos compartido).
- **AR3**: V1 se inicializa con `npm create @vite-pwa/pwa@latest` (template vanilla, estrategia `generateSW`, prompt for update activado).
- **AR4**: Sin TypeScript en V0 ni V1. JavaScript plano.
- **AR5**: Sin framework de UI (vanilla JS), sin router (mostrar/ocultar vistas con variable `currentView`).
- **AR6**: IDs generados con `crypto.randomUUID()` nativo. Predefinidos usan slugs `kebab-case`.
- **AR7**: Modelo de datos formal con 4 entidades: `Exercise`, `Session`, `Set`, `Routine` (campos definidos en architecture.md).
- **AR8**: Stores Dexie V1: `exercises`, `sessions`, `sets` (con índice por `sessionId`, `exerciseId`, `completedAt`), `routines`.
- **AR9**: Boundaries estrictos: `views/*.js` → `state.js` → `db.js`. Ningún view toca IndexedDB directamente.
- **AR10**: State management: single mutable object con función `renderView()` llamada tras cada mutación (reactividad manual).
- **AR11**: Export V1: descarga CSV nativa del navegador (no Google Sheets API en V1).
- **AR12**: Deploy V1 a GitHub Pages mediante GitHub Action (`.github/workflows/deploy.yml`). HTTPS automático (requisito para `crypto.randomUUID()` en producción).
- **AR13**: `dist/` en `.gitignore`. El build no se commitea.
- **AR14**: Repositorio remoto en GitHub necesario para V1 (no para V0).

### UX Design Requirements

- **UX-DR1**: Tema visual minimalista con CSS vanilla + custom properties: 1 fuente del sistema, 1 color de acento, 2 niveles de fondo (claro/oscuro o jerárquico). Sin librería CSS.
- **UX-DR2**: Steppers `+/-` al lado de los inputs numéricos de peso y reps (componente reutilizable `src/ui/stepper.js` en V1).
- **UX-DR3**: Inputs HTML con `inputmode="decimal"` (peso) e `inputmode="numeric"` (reps) para teclado móvil correcto.
- **UX-DR4**: Componente toast no intrusivo (`src/ui/toast.js` en V1) para feedback (serie guardada, PR batido, error). **Nunca** usar `alert()` ni `confirm()` nativos.
- **UX-DR5**: Indicador "hoy vs última vez" mostrado **inline** durante el registro, no en pantalla aparte. Comparación contra última serie del mismo ejercicio.
- **UX-DR6**: 6 vistas (single-page con mostrar/ocultar): `home`, `session-in-progress`, `history`, `insights`, `exercises`, `routines`. Sin router, navegación por botones en una barra simple.
- **UX-DR7**: PWA manifest con `name`, `short_name`, `theme_color`, `background_color`, iconos `192x192`, `512x512`, y `maskable` 512x512.
- **UX-DR8**: Validación de formularios inline (peso > 0, reps ≥ 1, ejercicio seleccionado). Mensaje de error junto al campo, no en alert.
- **UX-DR9**: Toque en checkbox o botón "✓" cierra la serie y la marca como completada (patrón Strong/Hevy).
- **UX-DR10**: Prompt al finalizar entreno libre: modal/toast pregunta "¿Guardar como rutina?" con input de nombre.

### FR Coverage Map

| FR | Epic | Notas |
|---|---|---|
| FR1 Registrar serie | Epic 1 | Versión V0 con localStorage; refinada en Epic 2 con Dexie |
| FR2 Precarga última | Epic 1 | Lectura del último valor del mismo ejercicio |
| FR3 Libre / rutina | Epic 3 | Prompt al inicio de sesión |
| FR4 Catálogo predef + custom | Epic 1 (predefinido) + Epic 3 (custom) | Seed mínimo en E1; UI custom completa en E3 |
| FR5 Guardar como rutina | Epic 3 | Prompt al finalizar entreno libre |
| FR6 Histórico | Epic 1 | Lista cronológica básica; refinada en Epic 4 (filtros) |
| FR7 Insights | Epic 4 | 1RM (Epley, reps ≤ 10), volumen, frecuencia, "hoy vs última vez" |
| FR8 Export CSV | Epic 4 | Descarga del navegador |
| FR9 PWA instalable | Epic 2 | Manifest + service worker via `vite-plugin-pwa` |

## Epic List

### Epic 1: Registrar y consultar entrenos (V0)

**Objetivo de usuario:** "Quiero poder registrar mis series y ver el histórico, ya, en mi Mac, aunque sea sencillo."

Esqueleto mínimo funcional con HTML + CSS + JS vanilla + `localStorage`. Sin build, sin npm. Servido en localhost (Live Server). Permite usar la app desde el día 1 mientras se aprende el flujo y se valida el modelo de datos.

**FRs covered:** FR1, FR2, FR4 (catálogo predefinido), FR6
**NFRs principales:** NFR1 (2-3 toques), NFR7 (inputs móvil), NFR8 (sin streaks)
**ARs:** AR1, AR2, AR4, AR5, AR6, AR7 (parcial), AR9, AR10

### Epic 2: App instalable y offline (V1 Foundation)

**Objetivo de usuario:** "Quiero llevarla en mi iPhone al gym sin depender del wifi del gimnasio."

Migra a Vite 7 + Dexie 4 + `vite-plugin-pwa` + Workbox. Despliega a GitHub Pages. Migra los datos de V0 (localStorage) a IndexedDB usando el contrato de datos compartido. Entrega una PWA instalable que funciona offline una vez instalada.

**FRs covered:** FR9, migración de FR1/FR2/FR4/FR6 a IndexedDB
**NFRs principales:** NFR2 (offline), NFR3 (soberanía), NFR4 (responsive), NFR6 (durabilidad)
**ARs:** AR3, AR8, AR12, AR13, AR14

### Epic 3: Rutinas y catálogo completo (V1 Features I)

**Objetivo de usuario:** "Quiero arrancar 'día de pecho' y que aparezcan mis ejercicios, y poder añadir ejercicios propios."

Implementa el flujo "libre o rutina" al iniciar sesión. Al finalizar un entreno libre, ofrece guardar como rutina con un nombre. UI para crear ejercicios custom.

**FRs covered:** FR3, FR5, FR4 (parte custom)
**NFRs principales:** NFR1 (refinamiento UX en session view)

### Epic 4: Insights y soberanía de datos (V1 Features II)

**Objetivo de usuario:** "Quiero ver mi progreso y poder llevarme los datos a Google Sheets cuando quiera."

Implementa cálculos de insights: 1RM estimado (Epley, solo reps ≤ 10), volumen semanal (peso × reps), frecuencia por grupo muscular. Añade el indicador "hoy vs última vez" inline durante el registro. Export del dataset completo a CSV.

**FRs covered:** FR7, FR8
**NFRs principales:** NFR3 (soberanía: cumple el compromiso de portabilidad)

---

## Epic 1: Registrar y consultar entrenos (V0)

**Objetivo:** Esqueleto V0 funcional servido en localhost. Usuario puede registrar series y consultar histórico.

### Story 1.1: Inicializar estructura V0 ✅

**Status:** complete · 2026-06-09 · validada manualmente en VS Code Live Server

As a usuario que arranca el proyecto,
I want una estructura básica de archivos HTML/CSS/JS funcionando en localhost,
So that puedo ver la app abierta en el navegador antes de añadir funcionalidad.

**Acceptance Criteria:**

**Given** el repo `gym-tracker` con `docs/` ya commiteado,
**When** se crean los archivos `index.html`, `app.js`, `style.css`, `exercises.json` siguiendo la estructura V0 del architecture.md,
**Then** abrir `index.html` con Live Server (o `python3 -m http.server 8000`) muestra una página con título "gym-tracker" y un mensaje "Hola, V0".
**And** `app.js` está cargado como `<script type="module">` y se ve un `console.log("V0 ready")` en DevTools.
**And** `style.css` aplica un reset básico + fuente del sistema + un color de acento.
**And** `exercises.json` contiene un array de ~10 ejercicios iniciales con shape `{ id, name, muscleGroup, isCustom: false }` (slugs `kebab-case`).

---

### Story 1.2: Renderizar catálogo de ejercicios en el formulario ✅

**Status:** complete · 2026-06-09 · validada manualmente en Live Server

As a usuario,
I want un select desplegable con los ejercicios disponibles,
So that puedo elegir qué ejercicio voy a registrar antes de introducir peso y reps.

**Acceptance Criteria:**

**Given** la app V0 cargada en el navegador,
**When** la página termina de cargar,
**Then** se ve un formulario con un `<select id="exercise-select">` poblado con todos los ejercicios de `exercises.json`.
**And** las opciones están agrupadas o etiquetadas visualmente por `muscleGroup` (mediante `<optgroup>` o por ordenación).
**And** cada opción muestra `name` y tiene como `value` el `id` del ejercicio.
**And** el primer ejercicio está pre-seleccionado por defecto.

---

### Story 1.3: Registrar una serie y persistir en localStorage ✅

**Status:** complete · 2026-06-09 · validada manualmente (registro, validación inline, persistencia tras recarga)

As a usuario que está entrenando,
I want introducir peso (kg) y reps y guardar la serie con un toque,
So that queda almacenada y puedo consultarla más tarde.

**Acceptance Criteria:**

**Given** el formulario con ejercicio seleccionado,
**When** el usuario introduce un peso `> 0`, reps `>= 1`, y pulsa el botón "Guardar serie",
**Then** se genera un objeto `Set` con `{ id: crypto.randomUUID(), sessionId, exerciseId, order, weight, reps, completedAt: new Date().toISOString() }`.
**And** se persiste en `localStorage` bajo la key `gym-tracker-data` siguiendo el shape del contrato de datos compartido (`{ schemaVersion: 0, sets: [...], exercises: [...] }`).
**And** la persistencia se hace dentro de un `try/catch`; si falla, se muestra un toast inline (no `alert()`).
**And** tras guardar, el formulario se resetea pero **mantiene el ejercicio seleccionado** (preparado para la siguiente serie del mismo ejercicio).
**And** **Given** entradas inválidas (peso ≤ 0, reps < 1 o vacíos), **When** el usuario pulsa guardar, **Then** se muestra un mensaje de error inline junto al campo y no se persiste nada.

---

### Story 1.4: Precargar peso y reps del último registro del ejercicio ✅

**Status:** complete · 2026-06-09 · validada manualmente (precarga al cambiar ejercicio, indicador relativo, refresh tras guardar)

As a usuario,
I want que al seleccionar un ejercicio el formulario me muestre el peso y reps de la última vez que lo hice,
So that puedo aceptar esos valores con un toque o ajustarlos para superarme.

**Acceptance Criteria:**

**Given** un ejercicio con al menos una serie registrada previamente,
**When** el usuario selecciona ese ejercicio en el `<select>`,
**Then** los campos de peso y reps se rellenan con los valores de la serie **más reciente** de ese ejercicio (la de `completedAt` mayor).
**And** un pequeño indicador textual muestra "Última vez: {peso} kg × {reps} ({fecha relativa, ej. 'hace 3 días'})".
**And** **Given** un ejercicio sin historial previo, **When** el usuario lo selecciona, **Then** los campos quedan vacíos y el indicador muestra "Sin historial".

---

### Story 1.5: Vista de histórico de series ✅

**Status:** complete · 2026-06-09 · validada manualmente (navegación, filtro, responsive, empty state)

As a usuario,
I want consultar todas mis series registradas en una tabla,
So that puedo ver mi historial y verificar que se está guardando bien.

**Acceptance Criteria:**

**Given** la app con varias series registradas,
**When** el usuario navega a la vista "Histórico" (botón en la barra de navegación que cambia `state.currentView`),
**Then** se muestra una tabla con columnas: fecha, ejercicio, peso, reps.
**And** las filas están ordenadas por `completedAt` descendente (más reciente primero).
**And** hay un selector `<select>` para filtrar por ejercicio (opción "Todos" por defecto).
**And** la tabla es responsive y legible en pantalla < 480px.
**And** **Given** la app sin ninguna serie registrada, **When** el usuario navega al histórico, **Then** se muestra un mensaje "Aún no has registrado ninguna serie".

---

## Epic 2: App instalable y offline (V1 Foundation)

**Objetivo:** Migrar V0 a stack V1 (Vite + Dexie + PWA), desplegar a GitHub Pages, app instalable en iPhone que funciona offline.

### Story 2.1: Scaffold V1 con Vite PWA Vanilla ✅

**Status:** complete · 2026-06-09 · branch v1 · build OK · "V1 scaffold OK" verificado en localhost:5173

As a desarrollador del proyecto,
I want inicializar V1 con `@vite-pwa/create-pwa` template vanilla y verificar que arranca,
So that tengo la base sobre la que construir las features V1.

**Acceptance Criteria:**

**Given** Node.js y npm instalados localmente,
**When** se ejecuta `npm create @vite-pwa/pwa@latest` en una nueva rama git `v1` (o subdirectorio paralelo), eligiendo template vanilla, estrategia `generateSW`, prompt for update = yes,
**Then** se genera la estructura `index.html`, `src/main.js`, `public/`, `package.json`, `vite.config.js`.
**And** se instala `dexie@^4` con `npm install dexie`.
**And** `.gitignore` incluye `node_modules/`, `dist/`, `.env*`, `.DS_Store`.
**And** `npm run dev` arranca el servidor de Vite y `npm run build` produce `dist/` sin errores.
**And** la página inicial muestra un mensaje "V1 scaffold OK" y un `console.log("V1 main.js loaded")`.

---

### Story 2.2: Capa de persistencia Dexie + migración de datos V0 ✅

**Status:** complete · 2026-06-10 · branch v1 · arquitectura modular completa (db.js + state.js + views/ + ui/) · validado V1 base. Migración no probada manualmente — viable vía script en consola, opcional para principal flow.

As a usuario que viene de V0,
I want que mis series registradas en V0 se importen automáticamente a la nueva persistencia IndexedDB de V1,
So that no pierdo nada al cambiar de stack.

**Acceptance Criteria:**

**Given** V1 scaffold inicializado,
**When** se crea `src/db.js` con setup Dexie usando los stores definidos en architecture.md (`exercises`, `sessions`, `sets`, `routines`),
**Then** `src/db.js` expone funciones async: `putSet(set)`, `getSetsByExercise(exerciseId)`, `getLastSetByExercise(exerciseId)`, `getAllSets()`, `putExercise(ex)`, `getAllExercises()`, `putRoutine(r)`, `getAllRoutines()`.
**And** en `src/main.js` se llama a una función `migrateFromLocalStorageIfNeeded()` que: lee `localStorage["gym-tracker-data"]`, valida `schemaVersion === 0`, vuelca los arrays a Dexie en una transacción, y marca la migración como completada (`localStorage["v0-migrated"] = "true"`).
**And** la migración se ejecuta **una sola vez** (idempotente: si `v0-migrated` existe, no hace nada).
**And** los flujos de registro de serie, precarga, e histórico (de Epic 1) ahora usan `src/db.js` en lugar de `localStorage`.
**And** la estructura del proyecto sigue las boundaries del architecture.md: `views/*.js → state.js → db.js`.

---

### Story 2.3: Configurar manifest PWA, iconos y theme ✅

**Status:** complete · 2026-06-10 · branch v1 · manifest detectado en DevTools, iconos generados con script reutilizable (`npm run generate-icons`), meta tag modernizado a `mobile-web-app-capable`. Warning de screenshots ignorado conscientemente (cosmético).

As a usuario,
I want añadir la app a la pantalla de inicio de mi iPhone y que tenga un icono propio,
So that la app se siente nativa, abre sin chrome de Safari y se ve profesional.

**Acceptance Criteria:**

**Given** V1 con Vite y `vite-plugin-pwa` configurado,
**When** se generan los iconos PWA (192x192, 512x512, y 512x512 maskable) en `public/icons/` (usando `pwa-asset-generator` o herramienta similar a partir de un emoji 🏋️ o icono SVG simple),
**Then** `vite.config.js` declara el manifest con `name: "gym-tracker"`, `short_name: "Gym"`, `theme_color`, `background_color`, los 3 iconos, `display: "standalone"`, `start_url: "."`.
**And** al servir la app por HTTPS (local con `vite --host` + ngrok, o GitHub Pages tras Story 2.4), abrir en Safari iOS muestra la opción "Añadir a pantalla de inicio" y al instalarla aparece el icono propio sin chrome de Safari.
**And** el Service Worker generado por `generateSW` cachea los assets estáticos correctamente — se valida con DevTools → Application → Service Workers.
**And** al abrir la app instalada **sin conexión** (modo avión), la app carga y permite registrar series igualmente.

---

### Story 2.4: Deploy a GitHub Pages con CI

As a usuario,
I want la app desplegada en una URL pública HTTPS,
So that puedo instalarla en mi iPhone desde cualquier red y compartirla si quiero.

**Acceptance Criteria:**

**Given** una cuenta de GitHub creada (si no la tenías) y el repo `gym-tracker` con `git remote` apuntando a `github.com/{usuario}/gym-tracker`,
**When** se crea `.github/workflows/deploy.yml` con un job que ejecuta `npm ci`, `npm run build`, y publica `dist/` a la rama `gh-pages` (o usando `actions/deploy-pages@v4`),
**Then** al hacer `git push` a `main`, la GitHub Action se ejecuta y deploy a Pages se completa sin errores.
**And** la app es accesible en `https://{usuario}.github.io/gym-tracker/` con HTTPS válido.
**And** en `vite.config.js` se configura `base: "/gym-tracker/"` para que los assets carguen correctamente.
**And** se valida instalación PWA en iPhone Safari desde la URL pública: el manifest se detecta, "Añadir a pantalla de inicio" funciona, y la app instalada arranca offline.
**And** README.md se actualiza con la URL pública de la app y una sección "Cómo instalarla en iPhone".

---

## Epic 3: Rutinas y catálogo completo (V1 Features I)

**Objetivo:** El usuario puede iniciar sesión "libre" o "desde rutina", guardar entrenos libres como rutinas reutilizables, y crear ejercicios custom.

### Story 3.1: Pantalla home con prompt "libre o rutina"

As a usuario que va a empezar un entreno,
I want elegir entre "entreno libre" o "rutina guardada" al iniciar,
So that la app me precarga los ejercicios correctos si voy a hacer una rutina conocida.

**Acceptance Criteria:**

**Given** la app V1 abierta sin sesión en curso,
**When** la vista `home` se renderiza,
**Then** se muestran dos botones grandes: "Entreno libre" y "Desde rutina".
**And** **Given** el usuario pulsa "Entreno libre", **When** la acción se procesa, **Then** se crea una nueva `Session` con `routineId: null`, se persiste en Dexie, y `state.currentSession` apunta a ella, y la vista cambia a `session-in-progress` con la lista de ejercicios vacía.
**And** **Given** el usuario pulsa "Desde rutina", **When** hay al menos una rutina guardada, **Then** se muestra un listado de rutinas (nombre + nº ejercicios + fecha creación); al seleccionar una, se crea la `Session` con `routineId` apuntando a esa rutina y se precargan los ejercicios de la rutina como filas pendientes en la vista `session-in-progress`.
**And** **Given** el usuario pulsa "Desde rutina" pero **no hay ninguna rutina guardada**, **Then** se muestra un mensaje "Aún no tienes rutinas. Empieza con un entreno libre y guárdalo como rutina al finalizar" + botón "Entreno libre".

---

### Story 3.2: Guardar entreno libre como rutina al finalizar

As a usuario que acaba de terminar un entreno libre,
I want poder guardarlo como rutina con un nombre,
So that en futuros días puedo arrancarlo precargado en un toque.

**Acceptance Criteria:**

**Given** una sesión libre en curso con al menos 1 ejercicio registrado,
**When** el usuario pulsa "Finalizar entreno",
**Then** se marca `session.endedAt = new Date().toISOString()` y se persiste.
**And** se muestra un modal/toast: "¿Quieres guardar este entreno como rutina?" con botones "Sí, dale nombre" y "No, cerrar".
**And** **Given** el usuario pulsa "Sí, dale nombre", **When** introduce un nombre y confirma, **Then** se crea una nueva `Routine` con `{ id, name, exerciseIds: [...orden único de ejercicios de la sesión], createdAt, createdFromSessionId: session.id }` y se persiste en Dexie. Toast: "Rutina '{nombre}' guardada".
**And** **Given** el usuario pulsa "No, cerrar", **When** la acción se procesa, **Then** la sesión se cierra sin crear rutina.
**And** **Given** una sesión libre sin ningún ejercicio registrado, **When** el usuario pulsa "Finalizar", **Then** no se ofrece guardar como rutina (no tiene sentido guardar una rutina vacía).

---

### Story 3.3: Crear y gestionar ejercicios custom

As a usuario,
I want añadir ejercicios que no están en el catálogo predefinido (ej. un ejercicio específico de mi gimnasio),
So that puedo registrar todo lo que hago, no solo los ejercicios estándar.

**Acceptance Criteria:**

**Given** la app V1 con la vista "Ejercicios" disponible en la navegación,
**When** el usuario navega a esa vista,
**Then** se muestra la lista completa de ejercicios (predefinidos + custom) agrupados por `muscleGroup`, con badge "Custom" en los creados por el usuario.
**And** hay un botón "+ Nuevo ejercicio" que abre un formulario inline o modal con campos: `name` (string, requerido), `muscleGroup` (select con grupos predefinidos), y "Tipo" (peso/bodyweight/tiempo, default "peso").
**And** **Given** el usuario completa el formulario con un nombre único, **When** pulsa "Guardar", **Then** se crea un `Exercise` con `id: crypto.randomUUID()`, `isCustom: true`, se persiste en Dexie, aparece en la lista y queda disponible inmediatamente en el `<select>` del formulario de registro.
**And** **Given** el usuario intenta crear un ejercicio con nombre duplicado (case-insensitive contra los existentes), **When** pulsa "Guardar", **Then** se muestra error inline "Ya existe un ejercicio con ese nombre" y no se persiste.
**And** **Given** un ejercicio custom existente, **When** el usuario pulsa el icono de eliminar, **Then** se pide confirmación; si confirma y el ejercicio **no tiene series asociadas**, se elimina; si **tiene series**, se muestra "No se puede borrar: este ejercicio tiene N series registradas. Renómbralo si quieres."
**And** los ejercicios predefinidos **no son eliminables**.

---

## Epic 4: Insights y soberanía de datos (V1 Features II)

**Objetivo:** El usuario ve evolución (1RM, volumen, frecuencia, "hoy vs última vez") y puede exportar todo a CSV.

### Story 4.1: Indicador "hoy vs última vez" inline en pantalla de sesión

As a usuario que está registrando una serie,
I want ver en pantalla, antes de confirmar, una comparación contra mi última vez con ese ejercicio,
So that tengo el empujón visual de intentar superarme o repetir.

**Acceptance Criteria:**

**Given** un ejercicio seleccionado en la vista de sesión y al menos una serie histórica previa,
**When** el usuario está rellenando peso y reps (en tiempo real durante el input, o tras tocar fuera),
**Then** se muestra un pequeño badge inline con: "Última vez: {peso} kg × {reps}" + un indicador visual de la diferencia respecto a los valores actuales (ej. flecha verde ↑ si supera, gris = si iguala, ámbar ↓ si baja).
**And** **Given** un ejercicio sin historial previo, **Then** se muestra "Primera vez con este ejercicio. ¡A por ello!".
**And** la comparación se basa en la **última serie completada** del mismo ejercicio (la de `completedAt` mayor).
**And** la diferencia se calcula como: PR si `weight > lastWeight` o `(weight == lastWeight && reps > lastReps)`; igual si exactos; menor en otro caso.

---

### Story 4.2: Cálculo y vista de 1RM estimado por ejercicio

As a usuario,
I want ver mi 1RM estimado de los ejercicios principales en el tiempo,
So that veo mi fuerza máxima evolucionar más allá del peso × reps puntual.

**Acceptance Criteria:**

**Given** la vista "Insights" disponible en la navegación,
**When** el usuario navega a "Insights",
**Then** se muestra una sección "1RM estimado por ejercicio" con una lista de los ejercicios que tienen al menos una serie con `reps ≤ 10`.
**And** para cada uno se muestra: el 1RM máximo histórico calculado con la fórmula de Epley (`peso × (1 + reps/30)`), redondeado a 1 decimal, y la fecha en que se logró.
**And** la función `oneRepMax(weight, reps)` está implementada en `src/insights/one-rep-max.js` como **función pura** que devuelve `null` si `reps > 10` o si `weight <= 0` o `reps < 1`.
**And** se exporta también `oneRepMaxByExercise(sets)` que recibe un array de `Set` y devuelve `{ exerciseId, maxEstimated, achievedAt }` agrupado.
**And** **Given** ningún ejercicio con datos válidos (todas las series con reps > 10), **Then** la sección muestra "Sin datos suficientes para calcular 1RM. Haz alguna serie con 1-10 reps."
**And** las funciones puras de insights tienen al menos 1 archivo `*.test.js` co-localizado con casos base (opcional pero recomendado).

---

### Story 4.3: Volumen semanal y frecuencia por grupo muscular

As a usuario,
I want ver cuánto volumen estoy moviendo cada semana y qué grupos musculares estoy trabajando más,
So that detecto desequilibrios y veo la tendencia general de carga.

**Acceptance Criteria:**

**Given** la vista "Insights" abierta,
**When** se renderiza,
**Then** se muestran dos sub-secciones adicionales (debajo del 1RM):
  - **Volumen semanal**: gráfico/tabla con el volumen total (suma de `peso × reps` de todas las series) agrupado por semana ISO, mostrando las **últimas 12 semanas**.
  - **Frecuencia por grupo muscular**: gráfico/tabla mostrando cuántas series se han hecho por grupo muscular en las **últimas 4 semanas**.
**And** `src/insights/volume.js` exporta `volumeByWeek(sets, numWeeks = 12)` como función pura.
**And** `src/insights/frequency.js` exporta `frequencyByMuscleGroup(sets, exercises, numWeeks = 4)` como función pura.
**And** la visualización puede ser una tabla simple, lista con barras de progreso CSS, o un mini-gráfico SVG. **No se requiere librería de gráficos** — vanilla CSS o SVG inline.
**And** **Given** menos de 1 semana de datos, **Then** las secciones muestran lo que haya y un texto "Necesitas más datos para tendencias significativas".

---

### Story 4.4: Export del dataset completo a CSV

As a usuario,
I want descargar todos mis datos en un archivo CSV,
So that puedo importarlo en Google Sheets o cualquier herramienta y mantener soberanía total de mis datos.

**Acceptance Criteria:**

**Given** la vista "Insights" o "Ajustes" con un botón "Exportar a CSV",
**When** el usuario pulsa el botón,
**Then** `src/export-csv.js#exportToCsv()` lee todos los `Set` + `Exercise` + `Routine` de Dexie, los serializa a CSV con encabezados claros, y dispara una descarga del navegador con nombre `gym-tracker-export-{YYYY-MM-DD}.csv`.
**And** el CSV principal tiene una hoja/sección de series con columnas: `setId, sessionId, exerciseId, exerciseName, muscleGroup, weight, reps, completedAt`.
**And** **Given** el archivo descargado, **When** se importa en Google Sheets (File → Import → Upload), **Then** las filas se ven correctamente sin caracteres rotos y las fechas son parseables (ISO 8601).
**And** la función `exportToCsv()` es **pura** en el sentido de que no muta `state` ni la base de datos — solo lee.
**And** **Given** zero datos, **When** el usuario pulsa "Exportar", **Then** se muestra toast "No hay datos para exportar" y no se descarga nada.
