// Entry point de gym-tracker V0.
// La lógica de registro y persistencia crecerá aquí en stories posteriores (1.3+).

console.log("V0 ready");

// Etiquetas legibles por grupo muscular (también define el orden de presentación).
const MUSCLE_GROUP_LABELS = {
  pecho: "Pecho",
  espalda: "Espalda",
  pierna: "Pierna",
  hombro: "Hombro",
  brazo: "Brazo",
  core: "Core",
  otros: "Otros",
};

async function loadExercises() {
  try {
    const res = await fetch("./exercises.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("No se pudo cargar el catálogo de ejercicios:", err);
    return [];
  }
}

function groupByMuscleGroup(exercises) {
  const groups = {};
  for (const exercise of exercises) {
    const key = exercise.muscleGroup;
    if (!groups[key]) groups[key] = [];
    groups[key].push(exercise);
  }
  return groups;
}

function renderExerciseSelect(selectEl, groupedExercises) {
  selectEl.innerHTML = "";

  // Primero los grupos en el orden definido por MUSCLE_GROUP_LABELS,
  // luego cualquier grupo extra que no esté etiquetado (por seguridad).
  const knownKeys = Object.keys(MUSCLE_GROUP_LABELS).filter(
    (key) => groupedExercises[key],
  );
  const unknownKeys = Object.keys(groupedExercises).filter(
    (key) => !MUSCLE_GROUP_LABELS[key],
  );
  const orderedKeys = [...knownKeys, ...unknownKeys];

  for (const key of orderedKeys) {
    const group = document.createElement("optgroup");
    group.label = MUSCLE_GROUP_LABELS[key] || key;
    for (const exercise of groupedExercises[key]) {
      const option = document.createElement("option");
      option.value = exercise.id;
      option.textContent = exercise.name;
      group.appendChild(option);
    }
    selectEl.appendChild(group);
  }
}

async function init() {
  const selectEl = document.getElementById("exercise-select");
  if (!selectEl) return;

  const exercises = await loadExercises();
  if (exercises.length === 0) {
    selectEl.innerHTML =
      '<option disabled selected>No se pudieron cargar los ejercicios</option>';
    return;
  }

  const grouped = groupByMuscleGroup(exercises);
  renderExerciseSelect(selectEl, grouped);
}

init();
