// Vista "Registrar serie" (vista por defecto).
// Lee `state` y se suscribe a sus cambios. Mutaciones via `state.addSet`.

import { state, addSet } from "../state.js";
import { getLastSetByExercise } from "../db.js";
import { MUSCLE_GROUP_LABELS } from "../seed-exercises.js";
import { showToast } from "../ui/toast.js";
import { formatRelativeDate, groupBy } from "../utils.js";

let homeSelectEl = null;
let homeWeightInputEl = null;
let homeRepsInputEl = null;
let homeIndicatorEl = null;
let homeFormEl = null;

// ─── Bind: se llama UNA VEZ al arrancar ─────────────────────────────────────

export function bindHomeView() {
  homeSelectEl = document.getElementById("exercise-select");
  homeWeightInputEl = document.getElementById("weight-input");
  homeRepsInputEl = document.getElementById("reps-input");
  homeIndicatorEl = document.getElementById("last-set-indicator");
  homeFormEl = document.getElementById("set-form");

  if (!homeFormEl) return;

  populateExerciseSelect();

  homeSelectEl.addEventListener("change", () => {
    updatePreloadAndIndicator(homeSelectEl.value);
  });

  homeFormEl.addEventListener("submit", handleSubmit);
}

// ─── Render: se llama cuando state cambia ───────────────────────────────────

export function renderHomeView() {
  // El select se repobla solo si el catálogo cambia (raro en V0/V1 base).
  // En esta historia no lo recargamos; basta con la población inicial.
  if (homeSelectEl && homeSelectEl.options.length === 0) {
    populateExerciseSelect();
  }
  if (homeSelectEl) {
    updatePreloadAndIndicator(homeSelectEl.value);
  }
}

// ─── Internals ──────────────────────────────────────────────────────────────

function populateExerciseSelect() {
  if (!homeSelectEl) return;
  homeSelectEl.innerHTML = "";

  const grouped = groupBy(state.exercises, (e) => e.muscleGroup);
  const knownKeys = Object.keys(MUSCLE_GROUP_LABELS).filter((k) => grouped[k]);
  const unknownKeys = Object.keys(grouped).filter(
    (k) => !MUSCLE_GROUP_LABELS[k],
  );
  const orderedKeys = [...knownKeys, ...unknownKeys];

  for (const key of orderedKeys) {
    const group = document.createElement("optgroup");
    group.label = MUSCLE_GROUP_LABELS[key] || key;
    for (const exercise of grouped[key]) {
      const option = document.createElement("option");
      option.value = exercise.id;
      option.textContent = exercise.name;
      group.appendChild(option);
    }
    homeSelectEl.appendChild(group);
  }
}

async function updatePreloadAndIndicator(exerciseId) {
  if (!homeWeightInputEl || !homeRepsInputEl || !homeIndicatorEl) return;

  if (!exerciseId) {
    homeWeightInputEl.value = "";
    homeRepsInputEl.value = "";
    homeIndicatorEl.textContent = "Sin historial";
    return;
  }

  const lastSet = await getLastSetByExercise(exerciseId);
  if (!lastSet) {
    homeWeightInputEl.value = "";
    homeRepsInputEl.value = "";
    homeIndicatorEl.textContent = "Sin historial";
    return;
  }

  homeWeightInputEl.value = String(lastSet.weight);
  homeRepsInputEl.value = String(lastSet.reps);
  homeIndicatorEl.textContent =
    `Última vez: ${lastSet.weight} kg × ${lastSet.reps} (${formatRelativeDate(lastSet.completedAt)})`;
}

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
  document.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
    el.hidden = true;
  });
}

async function handleSubmit(event) {
  event.preventDefault();
  clearAllFieldErrors();

  const exerciseId = homeSelectEl.value || "";
  const weight = parseFloat(homeWeightInputEl.value);
  const reps = parseInt(homeRepsInputEl.value, 10);

  const { valid, errors } = validateSetInput({ exerciseId, weight, reps });
  if (!valid) {
    for (const [fieldId, message] of Object.entries(errors)) {
      setFieldError(fieldId, message);
    }
    return;
  }

  try {
    await addSet({ exerciseId, weight, reps });
    showToast(`Serie guardada · ${weight} kg × ${reps}`);
    // Refrescar precarga (la última ahora es la que acabamos de guardar).
    await updatePreloadAndIndicator(exerciseId);
    homeWeightInputEl.focus();
  } catch (err) {
    console.error("Error guardando la serie:", err);
    showToast("No se pudo guardar la serie. Inténtalo de nuevo.", "error");
  }
}
