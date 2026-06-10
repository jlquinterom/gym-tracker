// Vista "Sesión en curso" — formulario de registro de series.
// Se accede tras pulsar "Entreno libre" o "Desde rutina" en la home.

import {
  state,
  addSet,
  endCurrentSession,
  getPlannedSetsForSession,
  saveRoutineFromSession,
  addCustomExercise,
} from "../state.js";
import { getLastSetByExercise } from "../db.js";
import { MUSCLE_GROUP_LABELS } from "../seed-exercises.js";
import { showToast } from "../ui/toast.js";
import { askSaveAsRoutine } from "../ui/save-routine-modal.js";
import { askNewExercise } from "../ui/new-exercise-modal.js";
import { escapeHtml, formatRelativeDate, groupBy } from "../utils.js";

let selectEl = null;
let weightInputEl = null;
let repsInputEl = null;
let indicatorEl = null;
let formEl = null;
let plannedEl = null;
let endSessionBtnEl = null;
let newExerciseBtnEl = null;

// ─── Bind: se llama UNA VEZ al arrancar ─────────────────────────────────────

export function bindSessionView() {
  selectEl = document.getElementById("exercise-select");
  weightInputEl = document.getElementById("weight-input");
  repsInputEl = document.getElementById("reps-input");
  indicatorEl = document.getElementById("last-set-indicator");
  formEl = document.getElementById("set-form");
  plannedEl = document.getElementById("session-planned-exercises");
  endSessionBtnEl = document.getElementById("end-session-btn");
  newExerciseBtnEl = document.getElementById("new-exercise-btn");

  if (!formEl) return;

  selectEl.addEventListener("change", () => {
    updatePreloadAndIndicator(selectEl.value);
  });

  formEl.addEventListener("submit", handleSubmit);

  if (endSessionBtnEl) {
    endSessionBtnEl.addEventListener("click", handleEndSession);
  }

  if (newExerciseBtnEl) {
    newExerciseBtnEl.addEventListener("click", handleNewExercise);
  }
}

async function handleNewExercise() {
  try {
    const result = await askNewExercise({
      existingNames: state.exercises.map((e) => e.name),
      muscleGroupOptions: MUSCLE_GROUP_LABELS,
    });
    if (!result) return; // canceló

    const newExercise = await addCustomExercise(result);
    // Re-renderizar el select (incluye el nuevo agrupado correctamente)
    populateExerciseSelect();
    // Seleccionar el ejercicio recién creado
    selectEl.value = newExercise.id;
    await updatePreloadAndIndicator(newExercise.id);
    showToast(`"${newExercise.name}" añadido al catálogo`);
  } catch (err) {
    console.error("Error creando ejercicio custom:", err);
    showToast(
      err?.message ?? "No se pudo crear el ejercicio. Inténtalo de nuevo.",
      "error",
    );
  }
}

// ─── Render: se llama cuando state cambia ───────────────────────────────────

export function renderSessionView() {
  if (!formEl) return;

  populateExerciseSelect();
  renderPlannedExercises();
  updatePreloadAndIndicator(selectEl?.value);
}

// ─── Internals ──────────────────────────────────────────────────────────────

function populateExerciseSelect() {
  if (!selectEl) return;
  selectEl.innerHTML = "";

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
    selectEl.appendChild(group);
  }

  // Si la sesión vino de una rutina, pre-seleccionar el primer ejercicio del plan.
  if (state.sessionPlannedSets.length > 0) {
    const firstPlanned = state.sessionPlannedSets[0].exerciseId;
    if ([...selectEl.options].some((o) => o.value === firstPlanned)) {
      selectEl.value = firstPlanned;
    }
  }
}

function renderPlannedExercises() {
  if (!plannedEl) return;
  const planned = state.sessionPlannedSets;
  if (planned.length === 0) {
    plannedEl.hidden = true;
    plannedEl.innerHTML = "";
    return;
  }
  plannedEl.hidden = false;
  const items = planned
    .map((ps) => {
      const ex = state.exercises.find((e) => e.id === ps.exerciseId);
      const name = ex ? ex.name : ps.exerciseId;
      return `
        <li class="planned-row">
          <span class="planned-row-name">${escapeHtml(name)}</span>
          <span class="planned-row-meta">${ps.weight} kg × ${ps.reps}</span>
        </li>
      `;
    })
    .join("");
  plannedEl.innerHTML = `
    <p class="planned-title">Rutina cargada — series sugeridas:</p>
    <ol class="planned-list">${items}</ol>
  `;
}

async function updatePreloadAndIndicator(exerciseId) {
  if (!weightInputEl || !repsInputEl || !indicatorEl) return;

  if (!exerciseId) {
    weightInputEl.value = "";
    repsInputEl.value = "";
    indicatorEl.textContent = "Sin historial";
    return;
  }

  const lastSet = await getLastSetByExercise(exerciseId);
  if (!lastSet) {
    weightInputEl.value = "";
    repsInputEl.value = "";
    indicatorEl.textContent = "Sin historial";
    return;
  }

  weightInputEl.value = String(lastSet.weight);
  repsInputEl.value = String(lastSet.reps);
  indicatorEl.textContent =
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

  const exerciseId = selectEl.value || "";
  const weight = parseFloat(weightInputEl.value);
  const reps = parseInt(repsInputEl.value, 10);

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
    await updatePreloadAndIndicator(exerciseId);
    weightInputEl.focus();
  } catch (err) {
    console.error("Error guardando la serie:", err);
    showToast("No se pudo guardar la serie. Inténtalo de nuevo.", "error");
  }
}

/**
 * Cierra la sesión actual. Si es libre y tiene al menos un ejercicio, pregunta
 * si guardar como rutina antes de cerrarla. Si es sesión-desde-rutina o vacía,
 * cierra directamente.
 */
async function handleEndSession() {
  const session = state.currentSession;
  if (!session) return;

  try {
    const isFreeSession = !session.routineId;
    const plannedSets = isFreeSession
      ? await getPlannedSetsForSession(session.id)
      : [];

    // Solo ofrecer guardar como rutina si: es libre Y tiene >=1 serie.
    const offerSaveAsRoutine = isFreeSession && plannedSets.length > 0;

    if (offerSaveAsRoutine) {
      const result = await askSaveAsRoutine();
      if (result?.name) {
        const routine = await saveRoutineFromSession({
          session,
          name: result.name,
          plannedSets,
        });
        await endCurrentSession();
        showToast(`Rutina "${routine.name}" guardada`);
        return;
      }
      // Si result === null → canceló: cerrar sesión sin crear rutina.
    }

    await endCurrentSession();
    showToast("Entreno finalizado");
  } catch (err) {
    console.error("Error finalizando sesión:", err);
    showToast("No se pudo finalizar el entreno. Inténtalo de nuevo.", "error");
  }
}
