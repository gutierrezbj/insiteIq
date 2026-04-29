/**
 * scope.js — helpers para scope client (Principio #1 refinado del Blueprint).
 *
 * Cuando user.space === "client_coordinator", el frontend filtra:
 *   - WOs por organization_id === clientOrgId
 *   - Sites por organization_id === clientOrgId  (o vía site.organization_id)
 *   - Alerts por scope_ref.organization_id === clientOrgId
 *   - Agreements por client_organization_id === clientOrgId
 *
 * Y oculta:
 *   - threads_internal (solo threads_shared visibles)
 *   - cross-cliente metrics (Facturado MTD, etc.)
 *   - audit log SRS-internal
 *   - GPS exacto del tech (timezone + estado laboral sí, lat/lng no)
 *   - ball_in_court "SRS" se muestra como "En revisión interna" sin detalle
 *
 * En SRS scope (juang@systemrapid.io, etc) todo se muestra completo.
 */

/**
 * Lee el organization_id del membership client_coordinator del user.
 * Devuelve null si el user no es client_coordinator.
 */
export function getClientOrgId(user) {
  if (!user || !user.memberships) return null;
  const m = user.memberships.find((mb) => mb.space === "client_coordinator");
  return m?.organization_id || null;
}

/**
 * True si el user es client_coordinator (no SRS).
 */
export function isClientUser(user) {
  return getClientOrgId(user) !== null;
}

/**
 * Predicate para filtrar WO por scope client.
 * En SRS scope siempre devuelve true (no filtra).
 */
export function woMatchesClientScope(wo, clientOrgId) {
  if (!clientOrgId) return true; // SRS: ve todo
  return wo?.organization_id === clientOrgId;
}

/**
 * Predicate para sites.
 */
export function siteMatchesClientScope(site, clientOrgId) {
  if (!clientOrgId) return true;
  return site?.organization_id === clientOrgId;
}

/**
 * Predicate para agreements.
 */
export function agreementMatchesClientScope(agreement, clientOrgId) {
  if (!clientOrgId) return true;
  return agreement?.client_organization_id === clientOrgId;
}

/**
 * Predicate para alerts via scope_ref.
 */
export function alertMatchesClientScope(alert, clientOrgId, sites) {
  if (!clientOrgId) return true;
  // Si el alert tiene organization_id directo, usar
  if (alert?.scope_ref?.organization_id) {
    return alert.scope_ref.organization_id === clientOrgId;
  }
  // Si tiene work_order_id o site_id, derivar via sites map
  const sid = alert?.scope_ref?.site_id;
  if (sid && sites) {
    const site = sites.find((s) => s.id === sid);
    return site?.organization_id === clientOrgId;
  }
  return false;
}

/**
 * Renombra ball-in-court "SRS" a algo neutral en client scope.
 * En SRS muestra el detalle real ("SRS · 4h stuck").
 * En Client muestra "En revisión interna" sin tiempo stuck (Principio #1).
 */
export function ballLabelForScope(wo, clientOrgId) {
  const side = wo?.ball_in_court?.side?.toUpperCase();
  if (!side) return "—";
  if (clientOrgId && side === "SRS") {
    return "EN REVISIÓN INTERNA";
  }
  return side;
}
