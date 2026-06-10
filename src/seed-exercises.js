// Catálogo predefinido de ejercicios.
// En V1 los importamos estáticamente como módulo ES (en V0 venían de exercises.json vía fetch).
// Los slugs en `id` siguen el patrón kebab-case definido en architecture.md.

export const SEED_EXERCISES = [
  { id: "bench-press", name: "Press banca", muscleGroup: "pecho", isCustom: false },
  { id: "incline-bench-press", name: "Press inclinado", muscleGroup: "pecho", isCustom: false },
  { id: "pull-up", name: "Dominadas", muscleGroup: "espalda", isCustom: false },
  { id: "barbell-row", name: "Remo con barra", muscleGroup: "espalda", isCustom: false },
  { id: "squat", name: "Sentadilla", muscleGroup: "pierna", isCustom: false },
  { id: "deadlift", name: "Peso muerto", muscleGroup: "pierna", isCustom: false },
  { id: "overhead-press", name: "Press militar", muscleGroup: "hombro", isCustom: false },
  { id: "lateral-raise", name: "Elevaciones laterales", muscleGroup: "hombro", isCustom: false },
  { id: "bicep-curl", name: "Curl de bíceps", muscleGroup: "brazo", isCustom: false },
  { id: "plank", name: "Plancha", muscleGroup: "core", isCustom: false },
];

// Etiquetas legibles por grupo muscular (define el orden de presentación en la UI).
export const MUSCLE_GROUP_LABELS = {
  pecho: "Pecho",
  espalda: "Espalda",
  pierna: "Pierna",
  hombro: "Hombro",
  brazo: "Brazo",
  core: "Core",
  otros: "Otros",
};
