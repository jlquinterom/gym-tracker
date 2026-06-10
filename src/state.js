// Estado central de la app. Único módulo que habla con `db.js`.
// Las vistas leen `state` y se suscriben a `onStateChange` para re-renderizar.

import {
  getAllExercises,
  getActiveSessionForToday,
  putSession,
  putSet,
  countSetsInSession,
} from "./db.js";

export const state = {
  currentView: "home", // "home" | "history"
  historyFilter: "", // exerciseId o "" para "Todos"
  exercises: [], // catálogo cargado desde IndexedDB
  currentSession: null, // Session activa de hoy
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
  state.currentSession = await ensureCurrentSession();
}

async function ensureCurrentSession() {
  const existing = await getActiveSessionForToday();
  if (existing) return existing;

  const session = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    routineId: null,
  };
  await putSession(session);
  return session;
}

// ─── Mutaciones ─────────────────────────────────────────────────────────────

export function setCurrentView(view) {
  state.currentView = view;
  notify();
}

export function setHistoryFilter(exerciseId) {
  state.historyFilter = exerciseId;
  notify();
}

/**
 * Persiste una serie nueva con el shape del modelo de datos formal.
 * Lanza si la persistencia falla (lo captura el caller para mostrar toast).
 */
export async function addSet({ exerciseId, weight, reps }) {
  if (!state.currentSession) {
    state.currentSession = await ensureCurrentSession();
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
