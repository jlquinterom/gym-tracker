// Capa de persistencia con Dexie 4. Único punto del proyecto que habla con IndexedDB.
// Las vistas (`views/*.js`) NO importan este módulo: pasan por `state.js`.

import Dexie from "dexie";
import { SEED_EXERCISES } from "./seed-exercises.js";

const DB_NAME = "gym-tracker";
const DB_VERSION = 1;

const V0_STORAGE_KEY = "gym-tracker-data";
const V0_MIGRATED_FLAG = "v0-migrated";

const db = new Dexie(DB_NAME);

db.version(DB_VERSION).stores({
  exercises: "id, muscleGroup",
  sessions: "id, startedAt",
  sets: "id, sessionId, exerciseId, completedAt",
  routines: "id, name",
});

// ─── Seed inicial del catálogo (solo si está vacío) ─────────────────────────

export async function seedExercisesIfEmpty() {
  const count = await db.exercises.count();
  if (count > 0) return { seeded: false };
  await db.exercises.bulkPut(SEED_EXERCISES);
  return { seeded: true, count: SEED_EXERCISES.length };
}

// ─── Migración desde localStorage V0 (idempotente) ──────────────────────────

/**
 * Lee `localStorage["gym-tracker-data"]` y vuelca su contenido a IndexedDB en una
 * sola transacción. Se ejecuta como máximo UNA VEZ por dispositivo (marca `v0-migrated`).
 */
export async function migrateFromLocalStorageIfNeeded() {
  if (localStorage.getItem(V0_MIGRATED_FLAG) === "true") {
    return { migrated: false, reason: "already-migrated" };
  }

  const raw = localStorage.getItem(V0_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(V0_MIGRATED_FLAG, "true");
    return { migrated: false, reason: "no-v0-data" };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error("Migración V0: localStorage corrupto, se descarta.", err);
    localStorage.setItem(V0_MIGRATED_FLAG, "true");
    return { migrated: false, reason: "parse-error" };
  }

  if (!data || typeof data !== "object" || data.schemaVersion !== 0) {
    console.warn("Migración V0: schemaVersion no es 0, se omite.", data?.schemaVersion);
    localStorage.setItem(V0_MIGRATED_FLAG, "true");
    return { migrated: false, reason: "schema-mismatch" };
  }

  const exercises = Array.isArray(data.exercises) ? data.exercises : [];
  const sessions = Array.isArray(data.sessions) ? data.sessions : [];
  const sets = Array.isArray(data.sets) ? data.sets : [];
  const routines = Array.isArray(data.routines) ? data.routines : [];

  await db.transaction(
    "rw",
    db.exercises,
    db.sessions,
    db.sets,
    db.routines,
    async () => {
      if (exercises.length > 0) await db.exercises.bulkPut(exercises);
      if (sessions.length > 0) await db.sessions.bulkPut(sessions);
      if (sets.length > 0) await db.sets.bulkPut(sets);
      if (routines.length > 0) await db.routines.bulkPut(routines);
    },
  );

  localStorage.setItem(V0_MIGRATED_FLAG, "true");
  return {
    migrated: true,
    counts: {
      exercises: exercises.length,
      sessions: sessions.length,
      sets: sets.length,
      routines: routines.length,
    },
  };
}

// ─── CRUD: Exercises ────────────────────────────────────────────────────────

export async function getAllExercises() {
  return db.exercises.toArray();
}

export async function putExercise(exercise) {
  return db.exercises.put(exercise);
}

// ─── CRUD: Sessions ─────────────────────────────────────────────────────────

export async function putSession(session) {
  return db.sessions.put(session);
}

/**
 * Devuelve la sesión activa de hoy (endedAt === null y startedAt del día actual), o null.
 * En Epic 3 (Story 3.1) este auto-comportamiento se sustituye por un flujo explícito.
 */
export async function getActiveSessionForToday() {
  const todayIso = new Date().toISOString().slice(0, 10);
  const sessions = await db.sessions.toArray();
  return (
    sessions.find(
      (s) => s.endedAt === null && s.startedAt.slice(0, 10) === todayIso,
    ) ?? null
  );
}

export async function getAllSessions() {
  return db.sessions.toArray();
}

// ─── CRUD: Sets ─────────────────────────────────────────────────────────────

export async function putSet(set) {
  return db.sets.put(set);
}

export async function getAllSets() {
  return db.sets.toArray();
}

export async function getSetsByExercise(exerciseId) {
  return db.sets.where("exerciseId").equals(exerciseId).toArray();
}

export async function getSetsBySession(sessionId) {
  return db.sets.where("sessionId").equals(sessionId).toArray();
}

/**
 * Devuelve la serie más reciente para un ejercicio dado, o null si no hay ninguna.
 */
export async function getLastSetByExercise(exerciseId) {
  const sets = await db.sets.where("exerciseId").equals(exerciseId).toArray();
  if (sets.length === 0) return null;
  return sets.reduce(
    (latest, current) =>
      latest === null || current.completedAt > latest.completedAt
        ? current
        : latest,
    null,
  );
}

export async function countSetsInSession(sessionId) {
  return db.sets.where("sessionId").equals(sessionId).count();
}

// ─── CRUD: Routines ─────────────────────────────────────────────────────────

export async function getAllRoutines() {
  return db.routines.toArray();
}

export async function putRoutine(routine) {
  return db.routines.put(routine);
}

// Exportado por si se necesita acceso directo en debug (no usar en código de app).
export { db };
