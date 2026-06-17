// Export del dataset a CSV con 3 modos: último entreno, sesiones seleccionadas, todo.
// Función pura para el build del CSV (solo lee Dexie).

import {
  getAllSets,
  getAllExercises,
  getAllSessions,
  getAllRoutines,
} from "./db.js";

const COLUMNS = [
  "setId",
  "sessionId",
  "sessionStartedAt",
  "sessionEndedAt",
  "routineId",
  "routineName",
  "setOrder",
  "exerciseId",
  "exerciseName",
  "muscleGroup",
  "weight",
  "reps",
  "completedAt",
];

/**
 * Carga todo el contexto necesario para exportar. Función pura: solo lee.
 */
export async function loadExportContext() {
  const [sets, exercises, sessions, routines] = await Promise.all([
    getAllSets(),
    getAllExercises(),
    getAllSessions(),
    getAllRoutines(),
  ]);
  return { sets, exercises, sessions, routines };
}

/**
 * Construye el CSV a partir de un contexto y un subconjunto de sets ya filtrado.
 * Devuelve null si el array de sets está vacío.
 */
export function buildCsvFromContext({ sets, exercises, sessions, routines }) {
  if (sets.length === 0) return null;

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));
  const routineById = new Map(routines.map((r) => [r.id, r]));

  // Ordenar por completedAt ascendente (más antiguo primero).
  const sorted = [...sets].sort((a, b) =>
    a.completedAt < b.completedAt ? -1 : a.completedAt > b.completedAt ? 1 : 0,
  );

  const lines = [COLUMNS.join(",")];
  for (const s of sorted) {
    const ex = exerciseById.get(s.exerciseId);
    const session = sessionById.get(s.sessionId);
    const routine = session?.routineId
      ? routineById.get(session.routineId)
      : null;

    lines.push(
      [
        s.id,
        s.sessionId,
        session?.startedAt ?? "",
        session?.endedAt ?? "",
        routine?.id ?? "",
        routine?.name ?? "",
        s.order,
        s.exerciseId,
        ex?.name ?? "",
        ex?.muscleGroup ?? "",
        s.weight,
        s.reps,
        s.completedAt,
      ]
        .map(escapeCsvValue)
        .join(","),
    );
  }
  return lines.join("\n");
}

/**
 * Ejecuta la exportación según el modo solicitado.
 * Devuelve true si se descargó algo, false si no había datos.
 *
 * mode: "last" | "selection" | "all"
 * sessionIds: requerido si mode === "selection"
 */
export async function triggerExport({ mode = "all", sessionIds = [] } = {}) {
  const ctx = await loadExportContext();

  let filteredSets;
  let filenameSuffix;

  if (mode === "last") {
    if (ctx.sessions.length === 0) return false;
    const lastSession = ctx.sessions.reduce((a, b) =>
      a.startedAt > b.startedAt ? a : b,
    );
    filteredSets = ctx.sets.filter((s) => s.sessionId === lastSession.id);
    filenameSuffix = "last";
  } else if (mode === "selection") {
    if (!sessionIds || sessionIds.length === 0) return false;
    const idSet = new Set(sessionIds);
    filteredSets = ctx.sets.filter((s) => idSet.has(s.sessionId));
    filenameSuffix = "selection";
  } else {
    // "all"
    filteredSets = ctx.sets;
    filenameSuffix = "export";
  }

  const csv = buildCsvFromContext({ ...ctx, sets: filteredSets });
  if (csv === null) return false;

  const filename = `gym-tracker-${filenameSuffix}-${todayIsoDate()}.csv`;
  downloadCsv(csv, filename);
  return true;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadCsv(content, filename) {
  // BOM UTF-8 para que Excel/Sheets respeten caracteres no-ASCII.
  const blob = new Blob(["﻿" + content], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
