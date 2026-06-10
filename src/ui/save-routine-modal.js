// Modal específico de "Guardar entreno como rutina".
// Usa <dialog> HTML5 nativo: showModal() / close() + ::backdrop CSS, sin depender
// de `hidden` o `display:none` (que sufren conflictos de especificidad y HMR).
//
// Uso:
//   const result = await askSaveAsRoutine();
//   if (result === null) { /* canceló */ }
//   else { /* result.name */ }

let dialogEl = null;
let resolveCurrent = null;

function ensureDialogExists() {
  if (dialogEl) return;
  dialogEl = document.createElement("dialog");
  dialogEl.className = "modal";
  dialogEl.setAttribute("aria-labelledby", "save-routine-modal-title");
  dialogEl.innerHTML = `
    <form method="dialog" class="modal-content" id="save-routine-form" novalidate>
      <h2 id="save-routine-modal-title" class="modal-title">¿Guardar como rutina?</h2>
      <p class="modal-desc">Podrás usarla como plantilla en próximos entrenos.</p>
      <label for="routine-name-input" class="field-label">Nombre de la rutina</label>
      <input
        type="text"
        id="routine-name-input"
        class="field-input"
        placeholder="Ej. Día de pecho"
        maxlength="80"
        autocomplete="off"
      />
      <p class="field-error" data-for="routine-name-input" hidden></p>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" data-modal-action="cancel">
          No, cerrar
        </button>
        <button type="submit" class="btn-primary" data-modal-action="save">
          Guardar
        </button>
      </div>
    </form>
  `;
  document.body.appendChild(dialogEl);

  const form = dialogEl.querySelector("#save-routine-form");
  const input = dialogEl.querySelector("#routine-name-input");
  const errorEl = dialogEl.querySelector(".field-error");
  const cancelBtn = dialogEl.querySelector('[data-modal-action="cancel"]');

  // Submit: validación inline. Si falla, NO cerramos.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = input.value.trim();
    if (!name) {
      errorEl.textContent = "Introduce un nombre para la rutina";
      errorEl.hidden = false;
      input.focus();
      return;
    }
    dialogEl.close("save");
    resolveWith({ name });
  });

  // Cancel: cierra siempre, resolve(null).
  cancelBtn.addEventListener("click", () => {
    dialogEl.close("cancel");
    resolveWith(null);
  });

  // Click en backdrop (fuera del .modal-content) = cancelar.
  // Cuando se hace click sobre el dialog directamente (no su contenido), e.target === dialogEl.
  dialogEl.addEventListener("click", (event) => {
    if (event.target === dialogEl) {
      dialogEl.close("cancel");
      resolveWith(null);
    }
  });

  // Escape cierra el dialog por defecto; capturamos el evento `cancel` para resolver.
  dialogEl.addEventListener("cancel", () => {
    resolveWith(null);
  });
}

function resolveWith(result) {
  const r = resolveCurrent;
  resolveCurrent = null;
  if (r) r(result);
}

export function askSaveAsRoutine() {
  ensureDialogExists();
  const input = dialogEl.querySelector("#routine-name-input");
  input.value = "";
  dialogEl.querySelector(".field-error").hidden = true;
  dialogEl.showModal();
  // El focus al input se hace tras el render del dialog.
  setTimeout(() => input.focus(), 0);
  return new Promise((resolve) => {
    resolveCurrent = resolve;
  });
}
