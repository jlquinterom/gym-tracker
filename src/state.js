// Estado central de la app. Único módulo que habla con `db.js`.
// Las vistas leen `state` y se suscriben a `onStateChange` para re-renderizar.

import {
  getAllExercises,
  getActiveSessionForToday,
  getAllRoutines,
  getSetsBySession,
  putSession,
  putSet,
  putRoutine,
  countSetsInSession,
} from "./db.js";

export const state = {
  currentView: "home", // "home" | "session" | "history"
  historyFilter: "", // exerciseId o "" para "Todos"
  exercises: [], // catálogo cargado desde IndexedDB
  routines: [], // rutinas guardadas
  currentSession: null, // Session activa, o null si no hay
  // Si la sesión viene de una rutina, plantilla completa cargada (en orden);
  // si es libre, queda vacío.
  sessionPlannedSets: [], // PlannedSet[]: { exerciseId, weight, reps }
};

// ─── Pub/sub minimal ────────────────────────────────────────────────────────

const subscribers = new Set();

export function onStateChange(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

function notify() {
  for (const fn of subscribers) {
    try {
      fn();
    } catch (err) {
      console.error("Subscriber falló:", err);
    }
  }
}

// ─── Inicialización ─────────────────────────────────────────────────────────

export async function initState() {
  state.exercises = await getAllExercises();
  state.routines = await getAllRoutines();

  state.currentSession = await getActiveSessionForToday();

  if (state.currentSession?.routineId) {
    const routine = state.routines.find(
      (r) => r.id === state.currentSession.routineId,
    );
    // Compatibilidad: rutinas creadas antes de añadir plannedSets pueden no tenerlo.
    state.sessionPlannedSets = routine?.plannedSets ?? [];
  } else {
    state.sessionPlannedSets = [];
  }

  if (state.currentSession) {
    state.currentView = "session";
  }
}

// ─── Mutaciones de navegación ───────────────────────────────────────────────

export function setCurrentView(view) {
  state.currentView = view;
  notify();
}

export function setHistoryFilter(exerciseId) {
  state.historyFilter = exerciseId;
  notify();
}

// ─── Mutaciones de sesión ───────────────────────────────────────────────────

export async function startFreeSession() {
  const session = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    routineId: null,
  };
  await putSession(session);
  state.currentSession = session;
  state.sessionPlannedSets = [];
  state.currentView = "session";
  notify();
  return session;
}

export async function startRoutineSession(routineId) {
  const routine = state.routines.find((r) => r.id === routineId);
  if (!routine) {
    throw new Error(`Routine no encontrada: ${routineId}`);
  }
  const session = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    routineId: routine.id,
  };
  await putSession(session);
  state.currentSession = session;
  // Compatibilidad: si la rutina fue creada antes del cambio, no tiene plannedSets.
  state.sessionPlannedSets = routine.plannedSets ? [...routine.plannedSets] : [];
  state.currentView = "session";
  notify();
  return session;
}

/**
 * Cierra la sesión actual marcando endedAt. Vuelve a la home.
 * Devuelve la sesión cerrada para que el caller pueda crear una rutina si quiere.
 */
export async function endCurrentSession() {
  if (!state.currentSession) return null;
  const closed = {
    ...state.currentSession,
    endedAt: new Date().toISOString(),
  };
  await putSession(closed);
  state.currentSession = null;
  state.sessionPlannedSets = [];
  state.currentView = "home";
  notify();
  return closed;
}

/**
 * Devuelve las series de una sesión en el orden en que se hicieron,
 * mapeadas a PlannedSet ({ exerciseId, weight, reps }).
 */
export async function getPlannedSetsForSession(sessionId) {
  const sets = await getSetsBySession(sessionId);
  sets.sort(
    (a, b) =>
      a.order - b.order ||
      (a.completedAt < b.completedAt ? -1 : a.completedAt > b.completedAt ? 1 : 0),
  );
  return sets.map((s) => ({
    exerciseId: s.exerciseId,
    weight: s.weight,
    reps: s.reps,
  }));
}

/**
 * Crea y persiste una nueva Routine a partir de una sesión finalizada.
 * `plannedSets` es la lista en orden de las series del entreno.
 * `exerciseIds` se deriva como lista de ejercicios únicos (primera aparición).
 */
export async function saveRoutineFromSession({ session, name, plannedSets }) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) throw new Error("El nombre de la rutina no puede estar vacío.");
  if (!Array.isArray(plannedSets) || plannedSets.length === 0) {
    throw new Error("La rutina debe tener al menos una serie.");
  }

  // Derivar exerciseIds (orden de primera aparición).
  const seen = new Set();
  const exerciseIds = [];
  for (const ps of plannedSets) {
    if (!seen.has(ps.exerciseId)) {
      seen.add(ps.exerciseId);
      exerciseIds.push(ps.exerciseId);
    }
  }

  const routine = {
    id: crypto.randomUUID(),
    name: trimmed,
    exerciseIds,
    plannedSets: plannedSets.map((p) => ({
      exerciseId: p.exerciseId,
      weight: p.weight,
      reps: p.reps,
    })),
    createdAt: new Date().toISOString(),
    createdFromSessionId: session?.id ?? null,
  };
  await putRoutine(routine);
  state.routines.push(routine);
  notify();
  return routine;
}

// ─── Mutaciones de series ───────────────────────────────────────────────────

export async function addSet({ exerciseId, weight, reps }) {
  if (!state.currentSession) {
    throw new Error("No hay sesión activa. Empieza un entreno desde la home.");
  }
  const orderInSession =
    (await countSetsInSession(state.currentSession.id)) + 1;

  const newSet = {
    id: crypto.randomUUID(),
    sessionId: state.currentSession.id,
    exerciseId,
    order: orderInSession,
    weight,
    reps,
    completedAt: new Date().toISOString(),
  };
  await putSet(newSet);
  notify();
  return newSet;
}
