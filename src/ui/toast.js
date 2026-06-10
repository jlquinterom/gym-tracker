// Componente toast no intrusivo. Sustituye `alert()` / `confirm()` (anti-patrón en architecture.md).

const TOAST_DURATION_MS = 2500;

let toastHideTimer = null;

export function showToast(message, type = "success") {
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
