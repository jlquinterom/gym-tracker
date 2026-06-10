// Vista "Home" — punto de entrada al entreno.
// Muestra:
//   - Si hay sesión activa: botón "Continuar entreno".
//   - Si no hay sesión activa y NO se ha elegido "Desde rutina": dos botones grandes.
//   - Si se eligió "Desde rutina" y hay rutinas: lista de rutinas para elegir.
//   - Si se eligió "Desde rutina" y NO hay rutinas: empty state explicativo.

import {
  state,
  setCurrentView,
  startFreeSession,
  startRoutineSession,
} from "../state.js";
import { showToast } from "../ui/toast.js";
import { escapeHtml } from "../utils.js";

let homeContainerEl = null;

// Sub-modo local de la home: "choose" (dos botones) | "pick-routine" (lista).
// No vive en `state` porque es UI puramente local de esta vista.
let homeMode = "choose";

export function bindHomeView() {
  homeContainerEl = document.getElementById("home-content");
  if (!homeContainerEl) return;
  // Delegación de eventos: un único listener para los clicks dentro de home.
  homeContainerEl.addEventListener("click", handleClick);
}

export function renderHomeView() {
  if (!homeContainerEl) return;

  // Caso 1: sesión activa → invitar a continuar.
  if (state.currentSession) {
    homeContainerEl.innerHTML = `
      <div class="home-active-session">
        <p class="home-active-message">
          Tienes un entreno en curso desde
          <strong>${formatTime(state.currentSession.startedAt)}</strong>.
        </p>
        <button type="button" class="btn-primary" data-action="resume-session">
          Continuar entreno
        </button>
      </div>
    `;
    return;
  }

  // Caso 2: el usuario eligió "Desde rutina".
  if (homeMode === "pick-routine") {
    if (state.routines.length === 0) {
      homeContainerEl.innerHTML = `
        <div class="home-empty">
          <p>
            Aún no tienes rutinas. Empieza con un entreno libre y al
            finalizar podrás guardarlo como rutina para usarla más adelante.
          </p>
          <button type="button" class="btn-primary" data-action="start-free">
            Empezar entreno libre
          </button>
          <button type="button" class="btn-secondary" data-action="back-to-choose">
            Volver
          </button>
        </div>
      `;
      return;
    }
    const routineRows = state.routines
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((r) => {
        const totalSets = r.plannedSets?.length ?? 0;
        const meta = totalSets > 0
          ? `${r.exerciseIds.length} ejercicios · ${totalSets} series · creada ${formatDate(r.createdAt)}`
          : `${r.exerciseIds.length} ejercicios · creada ${formatDate(r.createdAt)}`;
        return `
          <li>
            <button type="button" class="routine-card" data-action="start-routine" data-routine-id="${escapeHtml(r.id)}">
              <span class="routine-card-name">${escapeHtml(r.name)}</span>
              <span class="routine-card-meta">${meta}</span>
            </button>
          </li>
        `;
      })
      .join("");
    homeContainerEl.innerHTML = `
      <div class="home-pick-routine">
        <h2 class="home-pick-routine-title">Elige una rutina</h2>
        <ul class="routine-list">${routineRows}</ul>
        <button type="button" class="btn-secondary" data-action="back-to-choose">
          Volver
        </button>
      </div>
    `;
    return;
  }

  // Caso 3 (por defecto): pantalla de elección.
  homeContainerEl.innerHTML = `
    <div class="home-choose">
      <button type="button" class="choice-card" data-action="start-free">
        <span class="choice-card-title">Entreno libre</span>
        <span class="choice-card-desc">Añade ejercicios y series sobre la marcha</span>
      </button>
      <button type="button" class="choice-card" data-action="pick-routine">
        <span class="choice-card-title">Desde rutina</span>
        <span class="choice-card-desc">Carga una rutina guardada</span>
      </button>
    </div>
  `;
}

// ─── Click handler con delegación ───────────────────────────────────────────

async function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;

  try {
    if (action === "start-free") {
      await startFreeSession();
      homeMode = "choose"; // reset por si veníamos del modo pick-routine
    } else if (action === "pick-routine") {
      homeMode = "pick-routine";
      renderHomeView();
    } else if (action === "back-to-choose") {
      homeMode = "choose";
      renderHomeView();
    } else if (action === "start-routine") {
      const routineId = target.dataset.routineId;
      await startRoutineSession(routineId);
      homeMode = "choose";
    } else if (action === "resume-session") {
      setCurrentView("session");
    }
  } catch (err) {
    console.error("Acción de home falló:", err);
    showToast("Algo salió mal. Inténtalo de nuevo.", "error");
  }
}

// ─── Helpers locales ────────────────────────────────────────────────────────

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
  });
}
