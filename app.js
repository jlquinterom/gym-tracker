// Entry point de gym-tracker V0.
// La vista de histórico crecerá aquí en la Story 1.5.

console.log("V0 ready");

// ─── Constantes ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "gym-tracker-data";
const SCHEMA_VERSION = 0;
const TOAST_DURATION_MS = 2500;

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

// ─── Helpers de fechas y consulta ───────────────────────────────────────────

/**
 * Devuelve una etiqueta relativa en español ("hoy", "ayer", "hace 3 días",
 * "hace 2 semanas"…) calculada sobre días civiles (no diferencia en ms).
 */
function formatRelativeDate(isoString) {
  const then = new Date(isoString);
  const now = new Date();

  const thenDay = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayMs = 1000 * 60 * 60 * 24;
  const diffDays = Math.round((thenDay - nowDay) / dayMs);

  const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

  if (Math.abs(diffDays) < 7) return rtf.format(diffDays, "day");
  if (Math.abs(diffDays) < 30) return rtf.format(Math.round(diffDays / 7), "week");
  if (Math.abs(diffDays) < 365) return rtf.format(Math.round(diffDays / 30), "month");
  return rtf.format(Math.round(diffDays / 365), "year");
}

/**
 * Devuelve la serie más reciente registrada para un ejercicio dado, o null si no hay ninguna.
 * Función pura: no muta nada.
 */
function getLastSetByExercise(data, exerciseId) {
  let last = null;
  for (const set of data.sets) {
    if (set.exerciseId !== exerciseId) continue;
    if (last === null || set.completedAt > last.completedAt) {
      last = set;
    }
  }
  return last;
}

// ─── Persistencia (localStorage) ────────────────────────────────────────────

/**
 * Lee el dataset completo del storage. Si no existe o está corrupto, devuelve
 * un dataset vacío con la estructura del contrato de datos compartido.
 */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDataset();
    const parsed = JSON.parse(raw);
    // Validación mínima: si el shape no encaja, descarto y devuelvo vacío.
    if (typeof parsed !== "object" || parsed === null) return emptyDataset();
    return {
      schemaVersion: parsed.schemaVersion ?? SCHEMA_VERSION,
      sets: Array.isArray(parsed.sets) ? parsed.sets : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises : [],
      routines: Array.isArray(parsed.routines) ? parsed.routines : [],
    };
  } catch (err) {
    console.error("loadData falló:", err);
    return emptyDataset();
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function emptyDataset() {
  return {
    schemaVersion: SCHEMA_VERSION,
    sets: [],
    sessions: [],
    exercises: [],
    routines: [],
  };
}

// ─── Auto-sesión por día ────────────────────────────────────────────────────

/**
 * Devuelve la sesión activa de hoy. Si no existe, la crea y la persiste.
 * Una sesión "activa de hoy" es una con endedAt === null y startedAt del día actual.
 */
function ensureCurrentSession(data) {
  const todayIso = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const existing = data.sessions.find(
    (s) => s.endedAt === null && s.startedAt.slice(0, 10) === todayIso,
  );
  if (existing) return existing;

  const session = {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    routineId: null,
  };
  data.sessions.push(session);
  saveData(data);
  return session;
}

// ─── Catálogo de ejercicios ─────────────────────────────────────────────────

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

// ─── Validación de formulario ───────────────────────────────────────────────

/**
 * Valida los inputs del form y devuelve { valid: boolean, errors: {fieldId: msg} }.
 */
function validateSetInput({ exerciseId, weight, reps }) {
  const errors = {};
  if (!exerciseId) errors["exercise-select"] = "Selecciona un ejercicio";
  if (!Number.isFinite(weight) || weight <= 0)
    errors["weight-input"] = "Introduce un peso mayor que 0";
  if (!Number.isInteger(reps) || reps < 1)
    errors["reps-input"] = "Introduce un número entero de reps ≥ 1";
  return { valid: Object.keys(errors).length === 0, errors };
}

function setFieldError(fieldId, message) {
  const errorEl = document.querySelector(`.field-error[data-for="${fieldId}"]`);
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearAllFieldErrors() {
  document
    .querySelectorAll(".field-error")
    .forEach((el) => {
      el.textContent = "";
      el.hidden = true;
    });
}

// ─── Precarga última serie ──────────────────────────────────────────────────

/**
 * Lee la última serie del ejercicio seleccionado y precarga peso/reps + indicador.
 * Si no hay historial, deja los inputs vacíos y muestra "Sin historial".
 */
function updatePreloadAndIndicator(exerciseId) {
  const weightInput = document.getElementById("weight-input");
  const repsInput = document.getElementById("reps-input");
  const indicator = document.getElementById("last-set-indicator");
  if (!weightInput || !repsInput || !indicator) return;

  if (!exerciseId) {
    weightInput.value = "";
    repsInput.value = "";
    indicator.textContent = "Sin historial";
    return;
  }

  const data = loadData();
  const lastSet = getLastSetByExercise(data, exerciseId);

  if (!lastSet) {
    weightInput.value = "";
    repsInput.value = "";
    indicator.textContent = "Sin historial";
    return;
  }

  weightInput.value = String(lastSet.weight);
  repsInput.value = String(lastSet.reps);
  indicator.textContent = `Última vez: ${lastSet.weight} kg × ${lastSet.reps} (${formatRelativeDate(lastSet.completedAt)})`;
}

// ─── Toast ──────────────────────────────────────────────────────────────────

let toastHideTimer = null;

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("toast--error", type === "error");
  toast.classList.toggle("toast--success", type === "success");
  toast.hidden = false;
  if (toastHideTimer) clearTimeout(toastHideTimer);
  toastHideTimer = setTimeout(() => {
    toast.hidden = true;
  }, TOAST_DURATION_MS);
}

// ─── Submit handler ─────────────────────────────────────────────────────────

function handleSubmit(event) {
  event.preventDefault();
  clearAllFieldErrors();

  const exerciseSelect = document.getElementById("exercise-select");
  const weightInput = document.getElementById("weight-input");
  const repsInput = document.getElementById("reps-input");

  const exerciseId = exerciseSelect.value || "";
  const weight = parseFloat(weightInput.value);
  const reps = parseInt(repsInput.value, 10);

  const { valid, errors } = validateSetInput({ exerciseId, weight, reps });
  if (!valid) {
    for (const [fieldId, message] of Object.entries(errors)) {
      setFieldError(fieldId, message);
    }
    return;
  }

  try {
    const data = loadData();
    const session = ensureCurrentSession(data);
    const orderInSession =
      data.sets.filter((s) => s.sessionId === session.id).length + 1;

    const newSet = {
      id: crypto.randomUUID(),
      sessionId: session.id,
      exerciseId,
      order: orderInSession,
      weight,
      reps,
      completedAt: new Date().toISOString(),
    };
    data.sets.push(newSet);
    saveData(data);

    showToast(`Serie guardada · ${weight} kg × ${reps}`);

    // Refrescar la precarga: la última serie ahora es la que acabamos de guardar.
    // Esto vuelve a llenar peso/reps con los mismos valores y actualiza el indicador.
    updatePreloadAndIndicator(exerciseId);
    weightInput.focus();
  } catch (err) {
    console.error("Error guardando la serie:", err);
    showToast("No se pudo guardar la serie. Inténtalo de nuevo.", "error");
  }
}

// ─── Init ───────────────────────────────────────────────────────────────────

async function init() {
  const selectEl = document.getElementById("exercise-select");
  const formEl = document.getElementById("set-form");
  if (!selectEl || !formEl) return;

  const exercises = await loadExercises();
  if (exercises.length === 0) {
    selectEl.innerHTML =
      '<option disabled selected>No se pudieron cargar los ejercicios</option>';
    return;
  }

  const grouped = groupByMuscleGroup(exercises);
  renderExerciseSelect(selectEl, grouped);

  // Al cambiar de ejercicio, precarga peso/reps del último registro de ese ejercicio.
  selectEl.addEventListener("change", () => updatePreloadAndIndicator(selectEl.value));

  // Estado inicial: el primer ejercicio queda seleccionado por defecto, así que
  // intentamos precargarlo al arrancar.
  updatePreloadAndIndicator(selectEl.value);

  formEl.addEventListener("submit", handleSubmit);
}

init();
