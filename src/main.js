// Entry point de gym-tracker V1.
// Responsabilidades: importar CSS, migrar V0→IndexedDB, seed inicial, init state,
// bind de listeners, render inicial, y orquestación de re-renders ante cambios.

import "./style.css";
import {
  migrateFromLocalStorageIfNeeded,
  seedExercisesIfEmpty,
} from "./db.js";
import {
  state,
  initState,
  onStateChange,
  setCurrentView,
} from "./state.js";
import { bindHomeView, renderHomeView } from "./views/home.js";
import { bindSessionView, renderSessionView } from "./views/session.js";
import { bindHistoryView, renderHistoryView } from "./views/history.js";
import { showToast } from "./ui/toast.js";

console.log("V1 main.js loaded");

async function main() {
  // 1. Migrar datos V0 → IndexedDB (solo una vez por dispositivo).
  try {
    const result = await migrateFromLocalStorageIfNeeded();
    if (result.migrated) {
      console.log("Migración V0 completada:", result.counts);
      setTimeout(() => {
        showToast(`Datos importados: ${result.counts.sets} series`);
      }, 500);
    }
  } catch (err) {
    console.error("Migración V0 falló:", err);
  }

  // 2. Seed inicial del catálogo si está vacío.
  await seedExercisesIfEmpty();

  // 3. Cargar state desde IndexedDB.
  await initState();

  // 4. Bind de listeners (1 vez por sesión de página).
  bindNavTabs();
  bindHomeView();
  bindSessionView();
  bindHistoryView();

  // 5. Suscribirse a cambios de state → re-render.
  onStateChange(renderView);

  // 6. Render inicial.
  renderView();
}

function bindNavTabs() {
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      // La tab "Entreno" lleva siempre a "home". Desde ahí, si hay sesión activa,
      // el usuario pulsa "Continuar" para entrar en la vista session.
      setCurrentView(tab.dataset.target);
    });
  });
}

function renderView() {
  // Mostrar/ocultar secciones según data-view.
  document.querySelectorAll("[data-view]").forEach((section) => {
    section.hidden = section.dataset.view !== state.currentView;
  });
  // Marcar la pestaña activa en la nav: "session" y "home" comparten la tab "Entreno".
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    const matchesTab =
      tab.dataset.target === state.currentView ||
      (tab.dataset.target === "home" && state.currentView === "session");
    tab.classList.toggle("nav-tab--active", matchesTab);
  });
  // Renders específicos por vista.
  if (state.currentView === "home") {
    renderHomeView();
  } else if (state.currentView === "session") {
    renderSessionView();
  } else if (state.currentView === "history") {
    renderHistoryView();
  }
}

main().catch((err) => {
  console.error("Init falló:", err);
  showToast("Error al iniciar la app", "error");
});
