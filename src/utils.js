// Utilidades puras compartidas entre views.

/**
 * Etiqueta relativa en español ("hoy", "ayer", "hace 3 días", "hace 2 semanas"…)
 * calculada sobre días civiles (no diferencia en ms).
 */
export function formatRelativeDate(isoString) {
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
 * Escapa HTML para insertar de forma segura en `innerHTML`. Crucial cuando metamos
 * ejercicios custom creados por el usuario (Story 3.3).
 */
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Agrupa un array por una key calculada. Devuelve { groupKey: [items] }.
 */
export function groupBy(items, keyFn) {
  const out = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!out[key]) out[key] = [];
    out[key].push(item);
  }
  return out;
}
