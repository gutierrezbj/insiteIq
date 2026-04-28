/**
 * Helpers para mostrar WO codes legibles.
 *
 * El backend usa ObjectIds Mongo (24 hex chars) como `wo.id`. Si el WO
 * tiene un campo `code` formal (ej "DXC-UK-WO-2026-0007"), se usa.
 * Si no, derivamos un código legible cortando el ObjectId a 8 chars
 * en uppercase con prefijo "WO-".
 *
 * Esto es UI-only — el ID interno (ObjectId completo) se sigue usando
 * para todas las llamadas a la API.
 */

export function formatWoCode(wo) {
  if (!wo) return "—";
  if (wo.code) return wo.code;
  if (wo.external_code) return wo.external_code;
  const id = wo.id || wo._id;
  if (!id) return "—";
  // Últimos 8 chars del ObjectId en uppercase, prefijo WO-
  const tail = String(id).slice(-8).toUpperCase();
  return `WO-${tail}`;
}
