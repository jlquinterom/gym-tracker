// Modal "Nuevo ejercicio" — añadir un ejercicio custom desde el flujo de session.
// Usa <dialog> nativo (mismo patrón que save-routine-modal).
//
// Uso:
//   const result = await askNewExercise({ existingNames, muscleGroupOptions });
//   if (result === null) { /* canceló */ }
//   else { /* result.name, result.muscleGroup */ }

let dialogEl = null;
let resolveCurrent = null;
let existingNamesLowerCurrent = new Set();

function ensureDialogExists(muscleGroupOptions) {
  if (dialogEl) return;
  dialogEl = document.createElement("dialog");
  dialogEl.className = "modal";
  dialogEl.setAttribute("aria-labelledby", "new-exercise-modal-title");

  const optionsHtml = Object.entries(muscleGroupOptions)
    .map(
      ([key, label]) => `<option value="${key}">${label}</option>`,
    )
    .join("");

  dialogEl.innerHTML = `
    <form method="dialog" class="modal-content" id="new-exercise-form" novalidate>
      <h2 id="new-exercise-modal-title" class="modal-title">Nuevo ejercicio</h2>
      <p class="modal-desc">Lo añadirás a tu catálogo y quedará disponible al instante.</p>

      <label for="new-exercise-name" class="field-label">Nombre</label>
      <input
        type="text"
        id="new-exercise-name"
        class="field-input"
        placeholder="Ej. Hip thrust"
        maxlength="60"
        autocomplete="off"
      />
      <p class="field-error" data-for="new-exercise-name" hidden></p>

      <label for="new-exercise-muscle-group" class="field-label">Grupo muscular</label>
      <select id="new-exercise-muscle-group" class="field-input">
        ${optionsHtml}
      </select>

      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-modal-action="cancel">
          Cancelar
        </button>
        <button type="submit" class="btn-primary" data-modal-action="save">
          Crear
        </button>
      </div>
    </form>
  `;
  document.body.appendChild(dialogEl);

  const form = dialogEl.querySelector("#new-exercise-form");
  const nameInput = dialogEl.querySelector("#new-exercise-name");
  const groupSelect = dialogEl.querySelector("#new-exercise-muscle-group");
  const errorEl = dialogEl.querySelector(".field-error");
  const cancelBtn = dialogEl.querySelector('[data-modal-action="cancel"]');

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      errorEl.textContent = "Introduce un nombre";
      errorEl.hidden = false;
      nameInput.focus();
      return;
    }
    if (existingNamesLowerCurrent.has(name.toLowerCase())) {
      errorEl.textContent = "Ya existe un ejercicio con ese nombre";
      errorEl.hidden = false;
      nameInput.focus();
      return;
    }
    dialogEl.close("save");
    resolveWith({ name, muscleGroup: groupSelect.value });
  });

  cancelBtn.addEventListener("click", () => {
    dialogEl.close("cancel");
    resolveWith(null);
  });

  dialogEl.addEventListener("click", (event) => {
    if (event.target === dialogEl) {
      dialogEl.close("cancel");
      resolveWith(null);
    }
  });

  dialogEl.addEventListener("cancel", () => {
    resolveWith(null);
  });
}

function resolveWith(result) {
  const r = resolveCurrent;
  resolveCurrent = null;
  if (r) r(result);
}

export function askNewExercise({ existingNames, muscleGroupOptions }) {
  ensureDialogExists(muscleGroupOptions);
  existingNamesLowerCurrent = new Set(
    existingNames.map((n) => n.toLowerCase()),
  );
  const nameInput = dialogEl.querySelector("#new-exercise-name");
  const errorEl = dialogEl.querySelector(".field-error");
  const groupSelect = dialogEl.querySelector("#new-exercise-muscle-group");
  nameInput.value = "";
  errorEl.hidden = true;
  groupSelect.value = Object.keys(muscleGroupOptions)[0];
  dialogEl.showModal();
  setTimeout(() => nameInput.focus(), 0);
  return new Promise((resolve) => {
    resolveCurrent = resolve;
  });
}
