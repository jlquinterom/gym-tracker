// Vista "Histórico" — tabla cronológica filtrable por ejercicio.

import { state, setHistoryFilter } from "../state.js";
import { getAllSets } from "../db.js";
import { triggerExport, loadExportContext } from "../export-csv.js";
import { showToast } from "../ui/toast.js";
import { askExportMode } from "../ui/export-csv-modal.js";
import { escapeHtml } from "../utils.js";

let historyContainerEl = null;
let historyFilterEl = null;
let exportBtnEl = null;

// ─── Bind: se llama UNA VEZ al arrancar ─────────────────────────────────────

export function bindHistoryView() {
  historyContainerEl = document.getElementById("history-content");
  historyFilterEl = document.getElementById("history-filter");
  exportBtnEl = document.getElementById("export-csv-btn");

  if (!historyFilterEl) return;

  historyFilterEl.addEventListener("change", () => {
    setHistoryFilter(historyFilterEl.value);
  });

  if (exportBtnEl) {
    exportBtnEl.addEventListener("click", handleExport);
  }
}

async function handleExport() {
  try {
    // Cargar el contexto una vez para poblar el modal (lista de sesiones para elegir).
    const ctx = await loadExportContext();
    const choice = await askExportMode({
      sessions: ctx.sessions,
      routines: ctx.routines,
    });
    if (!choice) return; // canceló

    const exported = await triggerExport(choice);
    if (exported) {
      showToast("CSV descargado");
    } else {
      showToast("No hay datos para exportar", "error");
    }
  } catch (err) {
    console.error("Error exportando a CSV:", err);
    showToast("No se pudo exportar. Inténtalo de nuevo.", "error");
  }
}

// ─── Render: se llama cuando state cambia y la vista está visible ──────────

export async function renderHistoryView() {
  if (!historyContainerEl || !historyFilterEl) return;

  const sets = await getAllSets();

  if (sets.length === 0) {
    historyContainerEl.innerHTML =
      '<p class="empty-state">Aún no has registrado ninguna serie.</p>';
    historyFilterEl.innerHTML = '<option value="">Todos</option>';
    return;
  }

  // Filtro: solo ejercicios con series.
  const exerciseIdsWithSets = [...new Set(sets.map((s) => s.exerciseId))];
  const prevSelected = historyFilterEl.value;
  historyFilterEl.innerHTML = '<option value="">Todos</option>';
  for (const exId of exerciseIdsWithSets) {
    const option = document.createElement("option");
    option.value = exId;
    option.textContent = getExerciseName(exId);
    historyFilterEl.appendChild(option);
  }
  // Restaurar selección previa si sigue siendo válida.
  if (prevSelected === "" || exerciseIdsWithSets.includes(prevSelected)) {
    historyFilterEl.value = prevSelected;
  } else {
    historyFilterEl.value = "";
    setHistoryFilter("");
    return; // setHistoryFilter dispara otro render
  }

  const filtered = state.historyFilter
    ? sets.filter((s) => s.exerciseId === state.historyFilter)
    : sets;

  const sorted = [...filtered].sort((a, b) =>
    a.completedAt < b.completedAt ? 1 : -1,
  );

  if (sorted.length === 0) {
    historyContainerEl.innerHTML =
      '<p class="empty-state">No hay series para este ejercicio.</p>';
    return;
  }

  const rows = sorted
    .map((set) => {
      const date = new Date(set.completedAt);
      const formattedDate = date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      const name = getExerciseName(set.exerciseId);
      return `
        <tr>
          <td data-label="Fecha">${escapeHtml(formattedDate)}</td>
          <td data-label="Ejercicio">${escapeHtml(name)}</td>
          <td data-label="Peso">${set.weight} kg</td>
          <td data-label="Reps">${set.reps}</td>
        </tr>
      `;
    })
    .join("");

  historyContainerEl.innerHTML = `
    <table class="history-table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Ejercicio</th>
          <th>Peso</th>
          <th>Reps</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getExerciseName(exerciseId) {
  const exercise = state.exercises.find((e) => e.id === exerciseId);
  return exercise ? exercise.name : exerciseId;
}
