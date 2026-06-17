// Modal de exportación a CSV con 3 modos.
// Usa <dialog> nativo (mismo patrón que otros modales).
//
// Uso:
//   const result = await askExportMode({ sessions, routines });
//   if (result === null) { /* canceló */ }
//   else { /* result.mode, result.sessionIds */ }

import { escapeHtml } from "../utils.js";

let dialogEl = null;
let resolveCurrent = null;
let sessionsCurrent = [];
let routinesByIdCurrent = new Map();

function ensureDialogExists() {
  if (dialogEl) return;
  dialogEl = document.createElement("dialog");
  dialogEl.className = "modal modal--wide";
  dialogEl.setAttribute("aria-labelledby", "export-modal-title");
  dialogEl.innerHTML = `
    <div class="modal-content">
      <h2 id="export-modal-title" class="modal-title">Exportar a CSV</h2>
      <p class="modal-desc">Elige qué datos quieres exportar.</p>

      <div class="export-modes" role="radiogroup" aria-labelledby="export-modal-title">
        <label class="export-mode">
          <input type="radio" name="export-mode" value="last" checked />
          <span class="export-mode-text">
            <span class="export-mode-label">Solo el último entreno</span>
            <span class="export-mode-desc">Las series de la sesión más reciente</span>
          </span>
        </label>
        <label class="export-mode">
          <input type="radio" name="export-mode" value="selection" />
          <span class="export-mode-text">
            <span class="export-mode-label">Sesiones seleccionadas</span>
            <span class="export-mode-desc">Marca abajo cuáles quieres exportar</span>
          </span>
        </label>
        <label class="export-mode">
          <input type="radio" name="export-mode" value="all" />
          <span class="export-mode-text">
            <span class="export-mode-label">Todo el histórico</span>
            <span class="export-mode-desc">Todas tus series desde el primer registro</span>
          </span>
        </label>
      </div>

      <div id="export-sessions-list" class="export-sessions" hidden></div>

      <p class="field-error" data-for="export-modal" hidden></p>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-modal-action="cancel">
          Cancelar
        </button>
        <button type="button" class="btn-primary" data-modal-action="export">
          Exportar
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(dialogEl);

  // Listener para cambio de modo (mostrar/ocultar lista de sesiones).
  dialogEl
    .querySelectorAll('input[name="export-mode"]')
    .forEach((input) => {
      input.addEventListener("change", () => {
        const listEl = dialogEl.querySelector("#export-sessions-list");
        const isSelection = input.value === "selection" && input.checked;
        listEl.hidden = !isSelection;
        if (isSelection) renderSessionsList();
        clearError();
      });
    });

  // Click handler general.
  dialogEl.addEventListener("click", (event) => {
    if (event.target === dialogEl) {
      dialogEl.close();
      resolveWith(null);
      return;
    }
    const target = event.target.closest("[data-modal-action]");
    if (!target) return;
    const action = target.dataset.modalAction;
    if (action === "cancel") {
      dialogEl.close();
      resolveWith(null);
    } else if (action === "export") {
      submitExport();
    }
  });

  dialogEl.addEventListener("cancel", () => {
    resolveWith(null);
  });
}

function submitExport() {
  const mode = dialogEl.querySelector(
    'input[name="export-mode"]:checked',
  ).value;

  if (mode === "selection") {
    const checked = [
      ...dialogEl.querySelectorAll('input[name="session-checkbox"]:checked'),
    ];
    if (checked.length === 0) {
      showError("Marca al menos una sesión");
      return;
    }
    dialogEl.close();
    resolveWith({ mode, sessionIds: checked.map((c) => c.value) });
  } else {
    dialogEl.close();
    resolveWith({ mode, sessionIds: [] });
  }
}

function renderSessionsList() {
  const listEl = dialogEl.querySelector("#export-sessions-list");
  if (sessionsCurrent.length === 0) {
    listEl.innerHTML =
      '<p class="empty-state">No tienes sesiones registradas todavía.</p>';
    return;
  }
  const sorted = [...sessionsCurrent].sort((a, b) =>
    a.startedAt < b.startedAt ? 1 : -1,
  );
  listEl.innerHTML = sorted
    .map((s) => {
      const date = new Date(s.startedAt).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
      const routineName = s.routineId
        ? routinesByIdCurrent.get(s.routineId)?.name
        : null;
      const meta = routineName
        ? `${date} · <strong>${escapeHtml(routineName)}</strong>`
        : date;
      return `
        <label class="export-session-row">
          <input type="checkbox" name="session-checkbox" value="${escapeHtml(s.id)}" />
          <span>${meta}</span>
        </label>
      `;
    })
    .join("");
}

function showError(message) {
  const errorEl = dialogEl.querySelector('.field-error[data-for="export-modal"]');
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function clearError() {
  const errorEl = dialogEl.querySelector('.field-error[data-for="export-modal"]');
  errorEl.hidden = true;
  errorEl.textContent = "";
}

function resolveWith(result) {
  const r = resolveCurrent;
  resolveCurrent = null;
  if (r) r(result);
}

export function askExportMode({ sessions, routines }) {
  ensureDialogExists();
  sessionsCurrent = sessions;
  routinesByIdCurrent = new Map(routines.map((r) => [r.id, r]));

  // Reset: "last" por defecto, lista de sesiones oculta, sin error.
  dialogEl.querySelector('input[name="export-mode"][value="last"]').checked =
    true;
  dialogEl.querySelector("#export-sessions-list").hidden = true;
  clearError();

  dialogEl.showModal();
  return new Promise((resolve) => {
    resolveCurrent = resolve;
  });
}
