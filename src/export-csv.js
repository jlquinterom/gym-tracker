// Export del dataset a CSV. Función pura: solo lee (no muta state ni DB).
//
// El CSV se serializa con BOM UTF-8 al inicio para que Excel y Google Sheets
// abran caracteres Unicode (acentos, ñ) correctamente.

import { getAllSets, getAllExercises } from "./db.js";

const COLUMNS = [
  "setId",
  "sessionId",
  "exerciseId",
  "exerciseName",
  "muscleGroup",
  "weight",
  "reps",
  "completedAt",
];

/**
 * Construye el CSV completo del dataset.
 * Devuelve null si no hay sets que exportar.
 */
export async function buildCsv() {
  const [sets, exercises] = await Promise.all([
    getAllSets(),
    getAllExercises(),
  ]);

  if (sets.length === 0) return null;

  const exerciseById = new Map(exercises.map((e) => [e.id, e]));

  // Ordenar por completedAt ascendente (más antiguo primero).
  const sortedSets = [...sets].sort((a, b) =>
    a.completedAt < b.completedAt ? -1 : a.completedAt > b.completedAt ? 1 : 0,
  );

  const lines = [COLUMNS.join(",")];
  for (const s of sortedSets) {
    const ex = exerciseById.get(s.exerciseId);
    lines.push(
      [
        s.id,
        s.sessionId,
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
 * Lanza la descarga del CSV desde el navegador con el nombre `gym-tracker-export-YYYY-MM-DD.csv`.
 * Devuelve true si exportó, false si no había datos.
 */
export async function triggerExport() {
  const csv = await buildCsv();
  if (csv === null) return false;
  const filename = `gym-tracker-export-${todayIsoDate()}.csv`;
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
