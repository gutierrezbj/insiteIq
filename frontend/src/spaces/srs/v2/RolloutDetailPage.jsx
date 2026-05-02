/**
 * RolloutDetailPage — Vista del rollout (Modo 2 v2 dictado por owner 30-abr)
 *
 * Dictado del owner (literal, sesión café):
 *   "el mapa de la evolución, sitios completados, sitios por completar e
 *   impedimentos"
 *
 *   "sería genial, algo como un mapa, con su banderita, verde hecho o en
 *   marcha, rojo con problemas, bombillo azul en calendario, un kanban
 *   también sería muy útil, y un cuadro de mando :) área de rollouts con 3
 *   sub pestañas, algo práctico fácil de ver y poder sacar un reporte con
 *   3 clicks"
 *
 * Decisiones cerradas con owner:
 *   1. Reporte simple primero (no master CMDB-ready) — PDF + XLSX
 *   2. Drag&drop activo en Kanban
 *   3. Timeline gantt sí (4ª pestaña)
 *   4. Modal "Programar desde Mapa" sí
 *
 * Estructura: header + tabs + content
 *   Tabs: Mapa | Kanban | Cuadro de Mando | Timeline
 *   Botón Exportar arriba derecha (PDF/XLSX dropdown)
 *
 * Iteración 1 (esta versión): chasis funcional sin pulir
 *   - Tab Mapa: Leaflet con banderitas verde/rojo/azul + popup quick-ref
 *   - Tab Kanban: 5 columnas D&D scoped al project
 *   - Tab Cuadro de Mando: KPIs reales del endpoint /dashboard
 *   - Tab Timeline: gantt simple sites x tiempo (placeholder funcional)
 *   - Modal Programar + Botón Exportar: stubs marcados como próxima iteración
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * useLocalStorageState — hook genérico para persistir state en localStorage.
 * Iter 2.6: filter / activeTab / rangeKey sobreviven recargas y cierre de pestaña.
 * Sin TTL (consistencia: si el user dejó "Problemas" activo, vuelve activo).
 */
function useLocalStorageState(key, defaultValue) {
  const [state, setState] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored);
    } catch { /* ignore corrupt JSON */ }
    return defaultValue;
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); }
    catch { /* ignore quota errors */ }
  }, [key, state]);
  return [state, setState];
}
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api } from "../../../lib/api";
import { useAuth } from "../../../contexts/AuthContext";
import { useRefresh } from "../../../contexts/RefreshContext";
import { Icon, ICONS } from "../../../lib/icons";
import { formatWoCode } from "../../../lib/woCode";
import {
  getBallSide, getBallColor, getBallLabel, ballAgeHours,
  getTechId, getTag, computeSlaInfo,
  ACTIVE_STATUSES, TERMINAL_STATUSES,
} from "../../../lib/woFields";
import EmptyState from "../../../components/v2-shared/EmptyState";
import { SkeletonKpiCard } from "../../../components/v2-shared/Skeleton";
import RolloutNotesPanel from "../../../components/rollout-v2/RolloutNotesPanel";

const TABS = [
  { key: "mapa",     label: "Mapa",            icon: ICONS.map },
  { key: "kanban",   label: "Kanban",          icon: ICONS.kanban },
  { key: "cuadro",   label: "Cuadro de Mando", icon: ICONS.gauge },
  { key: "timeline", label: "Timeline",        icon: ICONS.calendar },
];

// Banderita SVG · 3 estados según dictado del owner
const FLAG_COLORS = {
  done:       "#22C55E",  // verde · hecho o en marcha
  problem:    "#DC2626",  // rojo · con problemas
  scheduled:  "#3B82F6",  // azul · en calendario (bombillo)
  pending:    "#6B7280",  // gris · sin estado claro
};

function classifyWoForFlag(wo) {
  if (!wo) return "pending";
  // Problema: SLA breach o ball SRS stuck >6h
  const sla = computeSlaInfo(wo).status;
  if (sla === "BREACH") return "problem";
  if (getBallSide(wo) === "srs" && ballAgeHours(wo) >= 6) return "problem";
  // Hecho o en marcha: cualquier status que NO sea intake (intake = sin tocar)
  if (TERMINAL_STATUSES.includes(wo.status)) return "done";
  if (wo.status === "intake") return "scheduled";  // pendiente agendar
  return "done";  // en marcha
}

/**
 * Marker visual: pin con halo + iconify Solar flag dentro.
 * Consistente con DS v2 (Solar Linear único set, ICONS.flag).
 *
 * Estructura visual:
 *   - Pin shape (gota) con borde del color del status + relleno oscuro
 *   - Solar flag-bold en el color del status dentro del pin
 *   - Drop shadow profesional
 *   - Anchor: punta inferior del pin (donde toca el sitio en el mapa)
 */
function flagMarkerHtml(color, flagKind) {
  // Tooltip text para accesibilidad
  const label = flagKind === "done" ? "Hecho/Marcha"
    : flagKind === "problem" ? "Con problema"
    : flagKind === "scheduled" ? "Programado"
    : "Pendiente";
  return `
    <div class="rollout-pin" title="${label}" style="position:relative;width:32px;height:38px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));">
      <svg viewBox="0 0 32 38" width="32" height="38" xmlns="http://www.w3.org/2000/svg" style="position:absolute;top:0;left:0;">
        <path d="M16 0 C7.16 0 0 7.16 0 16 C0 27.5 16 38 16 38 C16 38 32 27.5 32 16 C32 7.16 24.84 0 16 0 Z"
              fill="#0A0A0A" stroke="${color}" stroke-width="2.2"/>
      </svg>
      <iconify-icon
        icon="solar:flag-bold"
        style="position:absolute;top:5px;left:6px;font-size:20px;color:${color};"
      ></iconify-icon>
    </div>
  `;
}

export default function RolloutDetailPage() {
  const { project_id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { markRefreshing, markFresh } = useRefresh();

  const [project, setProject] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [wos, setWos] = useState([]);
  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // Iter 2.6: state scoped per project_id, persisted en localStorage
  const [activeTab, setActiveTab] = useLocalStorageState(`rollout-${project_id}-tab`, "mapa");
  const [filter, setFilter] = useLocalStorageState(`rollout-${project_id}-filter`, "all"); // all · problems · scheduled
  // Iter 2.7: notes panel slide-in derecha
  const [notesOpen, setNotesOpen] = useState(false);
  // Iter 2.9: bulk re-schedule modal (Pain log #006-6)
  const [bulkOpen, setBulkOpen] = useState(false);

  // Carga
  const load = useCallback(async () => {
    if (!project_id) return;
    markRefreshing();
    try {
      const [proj, dash, woList, siteList, userList] = await Promise.all([
        api.get(`/projects/${project_id}`),
        api.get(`/projects/${project_id}/dashboard`).catch(() => null),
        api.get(`/projects/${project_id}/work-orders?limit=500`).catch(() => []),
        api.get(`/sites?limit=500`).catch(() => []),
        api.get(`/users?limit=500`).catch(() => []),
      ]);
      setProject(proj);
      setDashboard(dash);
      setWos(Array.isArray(woList) ? woList : woList?.items || []);
      setSites(Array.isArray(siteList) ? siteList : siteList?.items || []);
      setUsers(Array.isArray(userList) ? userList : userList?.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      markFresh();
    }
  }, [project_id, markRefreshing, markFresh]);

  useEffect(() => {
    load();
  }, [load]);

  const siteMap = useMemo(
    () => Object.fromEntries(sites.map((s) => [s.id, s])),
    [sites]
  );
  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  // Counts según clasificación banderita
  const counts = useMemo(() => {
    const c = { done: 0, problem: 0, scheduled: 0, pending: 0 };
    wos.forEach((w) => {
      c[classifyWoForFlag(w)]++;
    });
    return c;
  }, [wos]);

  // WOs filtradas según filter button arriba
  const filteredWos = useMemo(() => {
    if (filter === "all") return wos;
    if (filter === "problems") return wos.filter((w) => classifyWoForFlag(w) === "problem");
    if (filter === "scheduled") return wos.filter((w) => classifyWoForFlag(w) === "scheduled");
    return wos;
  }, [wos, filter]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-wr-text-mid font-mono text-[12px]">
        Cargando rollout…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="magniferBug"
          title="Rollout no encontrado"
          sublabel={`project_id: ${project_id}`}
          action={{ label: "Volver a la lista", onClick: () => navigate("/srs/rollouts") }}
        />
      </div>
    );
  }

  const totalSites = dashboard?.total_sites_target || wos.length;
  const completed = dashboard?.work_orders?.completed || counts.done;
  const progressPct = totalSites > 0 ? Math.round((completed / totalSites) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header sticky */}
      <header className="border-b border-wr-border bg-wr-bg flex-shrink-0">
        <div className="px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <p className="label-caps-v2">Rollout</p>
              <span className="font-mono text-[10px] text-wr-text-dim">{project.code}</span>
              <span
                className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded-sm"
                style={{
                  color: project.status === "active" ? "#22C55E" : "#9CA3AF",
                  background: project.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(156,163,175,0.1)",
                  letterSpacing: "0.1em",
                }}
              >
                {project.status}
              </span>
            </div>
            <h1
              className="font-display text-[20px] font-semibold text-white leading-tight"
              style={{ letterSpacing: "0.01em" }}
            >
              {project.title}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-[12px] text-wr-text-mid font-mono">
              <span><strong className="text-wr-text">{completed}</strong> / {totalSites} sites · <span style={{ color: "#22C55E" }}>{progressPct}%</span></span>
              <span style={{ color: FLAG_COLORS.problem }}>● {counts.problem} con problemas</span>
              <span style={{ color: FLAG_COLORS.scheduled }}>● {counts.scheduled} en calendario</span>
              <span style={{ color: FLAG_COLORS.done }}>● {counts.done} hecho/marcha</span>
            </div>
          </div>

          {/* Botones de acción del header · Bulk + Notas + Exportar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {wos.length > 0 && (
              <BulkRescheduleButton count={counts.scheduled} onClick={() => setBulkOpen(true)} />
            )}
            <NotesButton onClick={() => setNotesOpen(true)} />
            <ExportReportButton
              project={project}
              wos={wos}
              sites={siteMap}
              users={userMap}
              counts={counts}
              totalSites={totalSites}
              progressPct={progressPct}
            />
          </div>
        </div>

        {/* Tabs nav */}
        <nav className="px-6 flex items-center gap-1">
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-medium border-b-2 transition`}
                style={{
                  color: isActive ? "#F59E0B" : "#9CA3AF",
                  borderBottomColor: isActive ? "#F59E0B" : "transparent",
                  letterSpacing: "0.04em",
                }}
              >
                <Icon icon={t.icon} size={14} />
                {t.label}
              </button>
            );
          })}

          {/* Filter rápido (solo en Mapa y Kanban) */}
          {(activeTab === "mapa" || activeTab === "kanban") && (
            <div className="ml-auto flex items-center gap-2 py-2">
              <span className="text-[10px] text-wr-text-dim uppercase" style={{ letterSpacing: "0.1em" }}>Ver:</span>
              {[
                { key: "all", label: "Todos" },
                { key: "problems", label: `Problemas (${counts.problem})`, color: FLAG_COLORS.problem },
                { key: "scheduled", label: `Programados (${counts.scheduled})`, color: FLAG_COLORS.scheduled },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`text-[11px] px-2.5 py-1 rounded-sm border transition`}
                  style={{
                    color: filter === f.key ? "#F59E0B" : (f.color || "#9CA3AF"),
                    borderColor: filter === f.key ? "#F59E0B" : "#1F1F1F",
                    background: filter === f.key ? "rgba(245, 158, 11, 0.08)" : "transparent",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </nav>
      </header>

      {/* Tab content */}
      <div className="flex-1 overflow-auto wr-scroll">
        {activeTab === "mapa" && (
          <MapTab wos={filteredWos} sites={siteMap} users={userMap} onScheduled={load} />
        )}
        {activeTab === "kanban" && (
          <KanbanTab wos={filteredWos} sites={siteMap} users={userMap} reload={load} />
        )}
        {activeTab === "cuadro" && (
          <DashboardTab dashboard={dashboard} counts={counts} totalSites={totalSites} progressPct={progressPct} />
        )}
        {activeTab === "timeline" && (
          <TimelineTab wos={wos} sites={siteMap} />
        )}
      </div>

      {/* Iter 2.7 · Panel de notas internas slide-in */}
      {notesOpen && (
        <RolloutNotesPanel
          projectId={project_id}
          currentUser={user}
          onClose={() => setNotesOpen(false)}
        />
      )}

      {/* Iter 2.9 · Bulk Re-schedule modal */}
      {bulkOpen && (
        <BulkRescheduleModal
          wos={wos.filter((w) => classifyWoForFlag(w) === "scheduled")}
          sites={siteMap}
          users={userMap}
          onClose={() => setBulkOpen(false)}
          onDone={() => { setBulkOpen(false); load(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Botón Bulk Re-schedule (Iter 2.9) ─────────────────────── */
function BulkRescheduleButton({ count, onClick }) {
  const hasPending = count > 0;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border text-[11px] uppercase font-medium transition"
      style={{
        color: hasPending ? "#3B82F6" : "#6B7280",
        borderColor: hasPending ? "#3B82F6" : "#1F1F1F",
        background: hasPending ? "rgba(59, 130, 246, 0.08)" : "transparent",
        letterSpacing: "0.08em",
      }}
      title={hasPending ? `Programar ${count} sites pending en bulk` : "Sin sites pending"}
    >
      <Icon icon={ICONS.calendar} size={14} />
      Bulk{hasPending ? ` · ${count}` : ""}
    </button>
  );
}

/* ─────────────────────── Modal Bulk Re-schedule (Iter 2.9 · Pain #006-6) ───────────────────────
 * Cierra Pain Evidence Log #006 dolor #6: re-scheduling de pending = email-tennis.
 * Approach v1 simple: lista checkboxes + select tech + datetime + loop secuencial
 * de POSTs a /work-orders/{id}/advance (target=triage). Cero backend nuevo.
 * Tracking de progreso visible: "Programando 5 de 17…". */
function BulkRescheduleModal({ wos, sites, users, onClose, onDone }) {
  // Default: todos los pending seleccionados
  const [selected, setSelected] = useState(() => new Set(wos.map((w) => w.id)));
  const [techId, setTechId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: [] });

  const techCandidates = useMemo(() =>
    Object.values(users).filter((u) =>
      u.email?.endsWith("@systemrapid.com") || u.email?.endsWith("@systemrapid.io")
    ),
  [users]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) => prev.size === wos.length ? new Set() : new Set(wos.map((w) => w.id)));
  }

  async function execute() {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      toast.error("Seleccioná al menos 1 site");
      return;
    }
    if (!techId || !scheduledAt) {
      toast.error("Tech y fecha son obligatorios");
      return;
    }
    setSubmitting(true);
    setProgress({ done: 0, total: ids.length, errors: [] });
    const errors = [];
    const techName = users[techId]?.full_name || users[techId]?.email || techId;
    const isoDate = new Date(scheduledAt).toISOString();

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const wo = wos.find((w) => w.id === id);
      try {
        await api.post(`/work-orders/${id}/advance`, {
          target_status: "triage",
          notes: `Programado vía Bulk (${i + 1}/${ids.length}) · tech: ${techName}`,
          assigned_tech_user_id: techId,
          scheduled_at: isoDate,
        });
      } catch (err) {
        errors.push({ id, code: formatWoCode(wo), msg: err.message || String(err) });
      }
      setProgress({ done: i + 1, total: ids.length, errors });
    }

    setSubmitting(false);
    const successes = ids.length - errors.length;
    if (errors.length === 0) {
      toast.success(`${successes} sites programados correctamente`);
      onDone?.();
    } else if (successes > 0) {
      toast.warning(`${successes} OK · ${errors.length} con error · revisá lista`);
    } else {
      toast.error(`Falló todo · ${errors.length} errores`);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center"
      style={{ background: "rgba(10, 10, 10, 0.65)" }}
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="bg-wr-bg border border-wr-border rounded-sm w-[640px] max-w-[95vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-4 border-b border-wr-border flex-shrink-0">
          <p className="label-caps-v2 mb-1">Programar bulk</p>
          <h2 className="font-display text-[18px] font-semibold text-white leading-tight">
            {selected.size} de {wos.length} sites pending seleccionados
          </h2>
          <p className="text-[11px] text-wr-text-mid font-mono mt-0.5">
            Avanza intake → triage con tech + fecha. Operación secuencial (1 POST por site).
          </p>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tech + Date pickers */}
          <div className="px-5 py-3 border-b border-wr-border grid grid-cols-2 gap-3 flex-shrink-0">
            <div>
              <label className="block text-[10px] text-wr-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
                Técnico asignado
              </label>
              <select
                value={techId}
                onChange={(e) => setTechId(e.target.value)}
                disabled={submitting}
                className="w-full bg-wr-surface/40 border border-wr-border rounded-sm px-3 py-2 text-[12px] text-wr-text font-mono"
              >
                <option value="">— Selecciona técnico —</option>
                {techCandidates.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-wr-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
                Fecha programada (mismo día para todos)
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={submitting}
                className="w-full bg-wr-surface/40 border border-wr-border rounded-sm px-3 py-2 text-[12px] text-wr-text font-mono"
              />
            </div>
          </div>

          {/* Lista checkboxes */}
          <div className="px-5 py-2 border-b border-wr-border flex items-center justify-between flex-shrink-0">
            <button
              onClick={toggleAll}
              disabled={submitting}
              className="text-[11px] text-wr-amber hover:underline uppercase"
              style={{ letterSpacing: "0.08em" }}
            >
              {selected.size === wos.length ? "Deseleccionar todos" : "Seleccionar todos"}
            </button>
            <span className="text-[10px] text-wr-text-dim font-mono">{selected.size} / {wos.length}</span>
          </div>
          {wos.length === 0 && (
            <div className="flex-1 flex items-center justify-center px-5 py-12 text-center">
              <div>
                <p className="text-[12px] text-wr-text-mid mb-1">Sin sites pending para programar</p>
                <p className="text-[10px] text-wr-text-dim font-mono">Solo aparecen aquí los sites en estado <span className="text-wr-amber">intake</span> (no asignados todavía)</p>
              </div>
            </div>
          )}
          {wos.length > 0 && (
          <ul className="flex-1 overflow-y-auto wr-scroll divide-y divide-wr-border">
            {wos.map((w) => {
              const s = sites[w.site_id] || {};
              const isSelected = selected.has(w.id);
              return (
                <li
                  key={w.id}
                  onClick={() => !submitting && toggle(w.id)}
                  className="px-5 py-2 flex items-center gap-3 cursor-pointer hover:bg-wr-surface/30 transition"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(w.id)}
                    disabled={submitting}
                    className="accent-wr-amber"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-wr-text truncate">{s.name || "Site sin nombre"}</div>
                    <div className="text-[10px] text-wr-text-dim font-mono truncate">
                      {s.code || "—"} · {formatWoCode(w)} · {s.country || ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          )}

          {/* Progress bar / errors */}
          {submitting && (
            <div className="px-5 py-2 border-t border-wr-border flex-shrink-0">
              <div className="flex items-center justify-between text-[11px] text-wr-text mb-1">
                <span>Programando…</span>
                <span className="font-mono">{progress.done} / {progress.total}</span>
              </div>
              <div className="w-full bg-wr-bg rounded-full h-1 overflow-hidden">
                <div
                  className="h-1 transition-all"
                  style={{
                    width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%",
                    background: "#F59E0B",
                  }}
                />
              </div>
            </div>
          )}
          {!submitting && progress.errors.length > 0 && (
            <div className="px-5 py-2 border-t border-wr-border flex-shrink-0 max-h-[100px] overflow-y-auto">
              <p className="text-[10px] text-red-400 font-mono mb-1">{progress.errors.length} errores:</p>
              {progress.errors.map((e, i) => (
                <p key={i} className="text-[10px] text-wr-text-mid font-mono">{e.code}: {e.msg}</p>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 border-t border-wr-border flex items-center justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[11px] text-wr-text-mid hover:text-wr-text uppercase px-3 py-2 transition"
            style={{ letterSpacing: "0.08em" }}
          >
            {submitting ? "Esperá…" : "Cancelar"}
          </button>
          <button
            onClick={execute}
            disabled={submitting || selected.size === 0 || !techId || !scheduledAt}
            className="text-[11px] uppercase font-medium px-4 py-2 rounded-sm transition"
            style={{
              background: submitting || selected.size === 0 || !techId || !scheduledAt ? "#1F1F1F" : "#F59E0B",
              color: submitting || selected.size === 0 || !techId || !scheduledAt ? "#6B7280" : "#0A0A0A",
              cursor: submitting || selected.size === 0 || !techId || !scheduledAt ? "not-allowed" : "pointer",
              letterSpacing: "0.08em",
            }}
          >
            {submitting ? `Programando ${progress.done}/${progress.total}…` : `Programar ${selected.size} sites`}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─────────────────────── Botón Notas (Iter 2.7) ─────────────────────── */
function NotesButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border text-[11px] uppercase font-medium transition"
      style={{
        color: "#9CA3AF",
        borderColor: "#1F1F1F",
        background: "transparent",
        letterSpacing: "0.08em",
      }}
      title="Notas internas del rollout"
    >
      <Icon icon={ICONS.document} size={14} />
      Notas
    </button>
  );
}

/**
 * LegendPin — pin pequeño para leyenda del mapa, mismo SVG que markers.
 * Para coherencia visual: lo que ves en el mapa es lo que ves en la leyenda.
 */
function LegendPin({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span style={{ display: "inline-block", position: "relative", width: 14, height: 18, flexShrink: 0 }}>
        <svg viewBox="0 0 32 38" width="14" height="18" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M16 0 C7.16 0 0 7.16 0 16 C0 27.5 16 38 16 38 C16 38 32 27.5 32 16 C32 7.16 24.84 0 16 0 Z"
            fill="#0A0A0A"
            stroke={color}
            strokeWidth={2.5}
          />
        </svg>
      </span>
      <span className="text-wr-text-mid">{label}</span>
    </span>
  );
}

/* ─────────────────────── Modal "Programar desde Mapa" ─────────────────────── */
function ScheduleSiteModal({ wo, site, users, onClose, onScheduled }) {
  const [techId, setTechId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const techCandidates = useMemo(() => {
    return Object.values(users).filter((u) =>
      u.email?.endsWith("@systemrapid.com") || u.email?.endsWith("@systemrapid.io")
    );
  }, [users]);

  async function handleSubmit() {
    if (!techId || !scheduledAt) {
      toast.error("Tech y fecha son obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      // Avanza intake → triage con tech + fecha. SRS coordinator authority.
      await api.post(`/work-orders/${wo.id}/advance`, {
        target_status: "triage",
        notes: `Programado vía Mapa Rollout · tech: ${users[techId]?.full_name || techId}`,
        assigned_tech_user_id: techId,
        scheduled_at: new Date(scheduledAt).toISOString(),
      });
      toast.success(`${site?.code || wo.reference} programado`);
      onScheduled?.();
      onClose();
    } catch (err) {
      toast.error(`Error: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center"
      style={{ background: "rgba(10, 10, 10, 0.65)" }}
      onClick={onClose}
    >
      <div
        className="bg-wr-bg border border-wr-border rounded-sm w-[460px] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-4 border-b border-wr-border">
          <p className="label-caps-v2 mb-1">Programar instalación</p>
          <h2 className="font-display text-[18px] font-semibold text-white leading-tight">
            {site?.name || "Site sin nombre"}
          </h2>
          <p className="text-[11px] text-wr-text-mid font-mono mt-0.5">
            {site?.code} · {site?.city || site?.country}
          </p>
        </header>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[10px] text-wr-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
              Técnico asignado
            </label>
            <select
              value={techId}
              onChange={(e) => setTechId(e.target.value)}
              className="w-full bg-wr-surface/40 border border-wr-border rounded-sm px-3 py-2 text-[13px] text-wr-text font-mono"
            >
              <option value="">— Selecciona técnico —</option>
              {techCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} · {u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-wr-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
              Fecha y hora programada (local)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full bg-wr-surface/40 border border-wr-border rounded-sm px-3 py-2 text-[13px] text-wr-text font-mono"
            />
          </div>

          <p className="text-[11px] text-wr-text-mid leading-relaxed">
            Avanza este site de <span className="text-wr-text-dim">intake</span> a{" "}
            <span style={{ color: "#F59E0B" }}>triage</span> con tech asignado y fecha
            agendada. La banderita pasa de azul (programado) a verde (en marcha).
          </p>
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 border-t border-wr-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-[11px] text-wr-text-mid hover:text-wr-text uppercase px-3 py-2 transition"
            style={{ letterSpacing: "0.08em" }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !techId || !scheduledAt}
            className="text-[11px] uppercase font-medium px-4 py-2 rounded-sm transition"
            style={{
              background: submitting || !techId || !scheduledAt ? "#1F1F1F" : "#F59E0B",
              color: submitting || !techId || !scheduledAt ? "#6B7280" : "#0A0A0A",
              cursor: submitting || !techId || !scheduledAt ? "not-allowed" : "pointer",
              letterSpacing: "0.08em",
            }}
          >
            {submitting ? "Programando…" : "Programar"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─────────────────────── Tab MAPA ─────────────────────── */
function MapTab({ wos, sites, users, onScheduled }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});
  const [modalWo, setModalWo] = useState(null);

  // Init map
  useEffect(() => {
    if (typeof window === "undefined" || !window.L) return;
    if (mapInstanceRef.current) return;
    if (!mapRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
    }).setView([8.97, -79.55], 8);  // Panamá City default

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      subdomains: "abcd",
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current = {};
    };
  }, []);

  // Marker rendering — banderitas SVG según classification
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    let bounds = null;
    wos.forEach((wo) => {
      const site = sites[wo.site_id];
      if (!site) return;
      const lat = site.lat ?? site.latitude;
      const lng = site.lng ?? site.longitude;
      if (lat == null || lng == null) return;

      const flag = classifyWoForFlag(wo);
      const color = FLAG_COLORS[flag];
      const tech = users[getTechId(wo)];
      const techName = tech?.full_name || tech?.name || "Sin asignar";

      const icon = L.divIcon({
        className: "rollout-flag-marker",
        html: flagMarkerHtml(color, flag),
        iconSize: [32, 38],
        iconAnchor: [16, 38],  // punta inferior del pin = posición exacta del site
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      const isScheduled = flag === "scheduled";
      const ctaButton = isScheduled
        ? `<button data-action="schedule" data-wo-id="${wo.id}" style="margin-top:6px;width:100%;background:#F59E0B;color:#0A0A0A;border:0;border-radius:3px;padding:6px 10px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;">Programar instalación →</button>`
        : "";
      const popupHtml = `
        <div style="background:#0A0A0A;color:#E5E5E5;font-family:'JetBrains Mono',monospace;min-width:220px;">
          <div style="padding:9px 12px;border-bottom:1px solid #1F1F1F;">
            <div style="font-size:10px;color:${color};font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">${flag === "done" ? "Hecho/Marcha" : flag === "problem" ? "Problema" : flag === "scheduled" ? "Programado · sin agendar" : "Pendiente"}</div>
            <div style="font-size:13px;color:#FFFFFF;font-weight:600;margin-top:2px;">${site.name || "Sin nombre"}</div>
            <div style="font-size:10px;color:#9CA3AF;">${site.code || ""}</div>
          </div>
          <div style="padding:8px 12px;font-size:11px;line-height:1.5;">
            <div><span style="color:#6B7280;">WO:</span> ${formatWoCode(wo)}</div>
            <div><span style="color:#6B7280;">Status:</span> ${wo.status}</div>
            <div><span style="color:#6B7280;">Tech:</span> ${techName}</div>
            ${ctaButton}
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml, {
        closeButton: false,
        autoClose: true,
        maxWidth: 280,
        autoPan: true,
        autoPanPaddingTopLeft: [20, 100],
        autoPanPaddingBottomRight: [20, 20],
      });

      // Wire CTA button cuando popup abre
      if (isScheduled) {
        marker.on("popupopen", () => {
          setTimeout(() => {
            const popupNode = marker.getPopup().getElement();
            if (!popupNode) return;
            popupNode.querySelectorAll('[data-action="schedule"]').forEach((btn) => {
              btn.addEventListener("click", (e) => {
                e.stopPropagation();
                marker.closePopup();
                setModalWo(wo);
              });
            });
          }, 0);
        });
      }

      markersRef.current[wo.id] = marker;
      bounds = bounds ? bounds.extend([lat, lng]) : L.latLngBounds([[lat, lng]]);
    });

    // Fit bounds
    if (bounds && wos.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
      } catch (e) { /* ignore */ }
    }
  }, [wos, sites, users]);

  return (
    <div className="h-full relative">
      <div ref={mapRef} className="absolute inset-0" />
      {/* Leyenda · pins con la misma visual del marker (consistencia) */}
      <div className="absolute bottom-3 left-5 z-[400] bg-wr-surface/95 border border-wr-border rounded-sm px-3 py-2 flex items-center gap-4 text-[10px] backdrop-blur-sm">
        <p className="label-caps-v2">Leyenda</p>
        <LegendPin color={FLAG_COLORS.done} label="Hecho/Marcha" />
        <LegendPin color={FLAG_COLORS.problem} label="Problema" />
        <LegendPin color={FLAG_COLORS.scheduled} label="Programado" />
      </div>
      {!window.L && (
        <div className="absolute inset-0 flex items-center justify-center text-wr-text-dim text-[12px] font-mono">
          Cargando mapa…
        </div>
      )}

      {/* Modal "Programar desde Mapa" */}
      {modalWo && (
        <ScheduleSiteModal
          wo={modalWo}
          site={sites[modalWo.site_id]}
          users={users}
          onClose={() => setModalWo(null)}
          onScheduled={() => {
            setModalWo(null);
            onScheduled?.();
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Tab KANBAN ─────────────────────── */
const KANBAN_COLUMNS = [
  { key: "solicitado",  label: "Solicitado",  statuses: ["intake", "triage"] },
  { key: "preparando",  label: "Preparando",  statuses: ["pre_flight", "assigned", "dispatched"] },
  { key: "en_campo",    label: "En campo",    statuses: ["en_route", "on_site", "in_progress"] },
  { key: "cerrando",    label: "Cerrando",    statuses: ["in_closeout", "resolved"] },
  { key: "cerrado",     label: "Cerrado",     statuses: ["completed", "closed"] },
];

function KanbanTab({ wos, sites, users, reload }) {
  const [draggedId, setDraggedId] = useState(null);
  const wosByColumn = useMemo(() => {
    const map = {};
    KANBAN_COLUMNS.forEach((col) => { map[col.key] = []; });
    wos.forEach((w) => {
      if (w.status === "cancelled") return;
      const col = KANBAN_COLUMNS.find((c) => c.statuses.includes(w.status));
      if (col) map[col.key].push(w);
    });
    return map;
  }, [wos]);

  function onDragStart(e, woId) {
    setDraggedId(woId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", woId);
  }
  function onDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
  async function onDrop(e, targetCol) {
    e.preventDefault();
    const woId = e.dataTransfer.getData("text/plain");
    if (!woId) return;
    const wo = wos.find((w) => w.id === woId);
    if (!wo) return;
    const targetStatus = targetCol.statuses[0]; // primer status de la columna
    if (wo.status === targetStatus) return;
    try {
      await api.post(`/work-orders/${woId}/advance`, { target_status: targetStatus });
      toast.success(`${formatWoCode(wo)} → ${targetCol.label}`);
      reload();
    } catch (err) {
      toast.error(`Error moviendo WO: ${err.message || err}`);
    } finally {
      setDraggedId(null);
    }
  }

  return (
    <div className="px-4 py-4 h-full flex gap-3 overflow-x-auto wr-scroll">
      {KANBAN_COLUMNS.map((col) => (
        <div
          key={col.key}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, col)}
          className="flex-shrink-0 w-[260px] bg-wr-surface/40 border border-wr-border rounded-sm flex flex-col"
          style={{ minHeight: 200 }}
        >
          <div className="px-3 py-2 border-b border-wr-border flex items-center justify-between">
            <span className="label-caps-v2">{col.label}</span>
            <span className="font-mono text-[11px] text-wr-text">{wosByColumn[col.key].length}</span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {wosByColumn[col.key].length === 0 && (
              <p className="text-[10px] text-wr-text-dim italic px-2 py-3">Vacía</p>
            )}
            {wosByColumn[col.key].map((wo) => {
              const site = sites[wo.site_id];
              const tech = users[getTechId(wo)];
              const flag = classifyWoForFlag(wo);
              return (
                <article
                  key={wo.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, wo.id)}
                  className="bg-wr-bg border border-wr-border rounded-sm p-2.5 cursor-grab"
                  style={{ borderLeftWidth: 2, borderLeftColor: FLAG_COLORS[flag] }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-wr-text-dim">{formatWoCode(wo)}</span>
                    <span className="text-[9px]" style={{ color: FLAG_COLORS[flag] }}>● {flag}</span>
                  </div>
                  <div className="text-[12px] text-wr-text font-medium leading-tight mb-1 truncate">
                    {site?.name || wo.title || "—"}
                  </div>
                  <div className="text-[10px] text-wr-text-mid truncate">
                    {site?.code || ""} · {tech?.full_name || tech?.name || "Sin tech"}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────── Tab CUADRO DE MANDO ─────────────────────── */
function DashboardTab({ dashboard, counts, totalSites, progressPct }) {
  const k = dashboard?.kpis || {};
  const wo = dashboard?.work_orders || {};

  return (
    <div className="px-6 py-6 space-y-6">
      {/* Hero metric */}
      <div className="bg-wr-surface/50 border border-wr-border rounded-sm px-6 py-6">
        <p className="label-caps-v2 mb-2">Avance del rollout</p>
        <div className="flex items-baseline gap-3 mb-3">
          <span className="font-display text-[48px] font-semibold text-white leading-none">
            {wo.completed || counts.done}
          </span>
          <span className="text-[20px] text-wr-text-dim">de</span>
          <span className="font-display text-[28px] text-wr-text">{totalSites}</span>
          <span className="text-[14px] text-wr-text-dim">sites · </span>
          <span
            className="font-mono text-[24px] font-semibold"
            style={{ color: progressPct >= 80 ? "#22C55E" : progressPct >= 50 ? "#F59E0B" : "#9CA3AF" }}
          >
            {progressPct}%
          </span>
        </div>
        <div className="w-full bg-wr-bg rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 80 ? "#22C55E" : progressPct >= 50 ? "#F59E0B" : "#3B82F6",
            }}
          />
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Hecho/Marcha" value={counts.done} color={FLAG_COLORS.done} />
        <KpiCard label="Con problemas" value={counts.problem} color={FLAG_COLORS.problem} />
        <KpiCard label="Programados" value={counts.scheduled} color={FLAG_COLORS.scheduled} />
        <KpiCard label="Activas hoy" value={wo.active || 0} color="#9CA3AF" />
      </div>

      {/* Velocidad + drift + ETA */}
      <div className="grid grid-cols-3 gap-3">
        <DataPanel
          title="Velocidad"
          value={k.throughput_week ?? "—"}
          unit="sites cerrados / 7 días"
        />
        <DataPanel
          title="Drift vs SOW"
          value={k.on_schedule_pct != null ? `${k.on_schedule_pct}%` : "—"}
          unit={k.on_schedule_pct == null ? "sin baseline" : k.on_schedule_pct >= 100 ? "adelantados" : "atrasados"}
          color={k.on_schedule_pct == null ? "#9CA3AF" : k.on_schedule_pct >= 100 ? "#22C55E" : k.on_schedule_pct >= 80 ? "#F59E0B" : "#DC2626"}
        />
        <DataPanel
          title="ETA 100%"
          value={k.eta_to_100pct_weeks != null ? `${k.eta_to_100pct_weeks}` : "—"}
          unit={k.eta_to_100pct_weeks == null ? "sin throughput" : "semanas restantes"}
        />
      </div>

      {/* SLA + incidents */}
      <div className="grid grid-cols-2 gap-3">
        <DataPanel
          title="SLA compliance"
          value={k.sla_compliance_pct != null ? `${k.sla_compliance_pct}%` : "—"}
          unit="WOs cerradas dentro deadline"
          color={k.sla_compliance_pct == null ? "#9CA3AF" : k.sla_compliance_pct >= 90 ? "#22C55E" : "#F59E0B"}
        />
        <DataPanel
          title="Incidentes activos"
          value={k.incidents_active || 0}
          unit="severity high/critical sin cerrar"
          color={k.incidents_active > 0 ? "#DC2626" : "#22C55E"}
        />
      </div>

      <p className="text-[10px] text-wr-text-dim font-mono">
        Generado {dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleString("es-ES") : "—"}
      </p>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div className="bg-wr-surface/50 border border-wr-border rounded-sm px-4 py-3" style={{ borderLeftWidth: 2, borderLeftColor: color }}>
      <p className="label-caps-v2 mb-1">{label}</p>
      <p className="font-display text-[28px] font-semibold leading-none" style={{ color }}>{value}</p>
    </div>
  );
}

function DataPanel({ title, value, unit, color }) {
  return (
    <div className="bg-wr-surface/40 border border-wr-border rounded-sm px-4 py-3">
      <p className="label-caps-v2 mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[22px] font-semibold" style={{ color: color || "#E5E5E5" }}>{value}</span>
        <span className="text-[10px] text-wr-text-dim">{unit}</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Tab TIMELINE (Iter 2.4 polish) ───────────────────────
 * Gantt: filas = sites con WO, eje X = mes.
 * Iter 2.4 añade: selector de rango (1m/3m/6m/Todo), línea HOY amber,
 * tooltip detallado al hover, sin límite de 100 rows. */
const TIMELINE_RANGES = [
  { key: "1m",  label: "Últ. mes", days: 30 },
  { key: "3m",  label: "3M",       days: 90 },
  { key: "6m",  label: "6M",       days: 180 },
  { key: "all", label: "Todo",     days: null },
];

function TimelineTab({ wos, sites }) {
  // Iter 2.6: rangeKey persistido global cross-rollouts (preferencia del user)
  const [rangeKey, setRangeKey] = useLocalStorageState("rollout-timeline-range", "3m");

  const allRows = useMemo(() => {
    return wos
      .filter((w) => sites[w.site_id])
      .map((w) => ({
        wo: w,
        site: sites[w.site_id],
        flag: classifyWoForFlag(w),
        startDate: w.created_at ? new Date(w.created_at) : null,
        endDate: w.closed_at ? new Date(w.closed_at) : null,
      }))
      .sort((a, b) => (a.site.code || "").localeCompare(b.site.code || ""));
  }, [wos, sites]);

  // Filter por rango temporal
  const rows = useMemo(() => {
    const range = TIMELINE_RANGES.find((r) => r.key === rangeKey);
    if (!range || !range.days) return allRows;
    const cutoff = new Date(Date.now() - range.days * 24 * 60 * 60 * 1000);
    return allRows.filter((r) => {
      if (r.startDate && r.startDate >= cutoff) return true;
      if (r.endDate && r.endDate >= cutoff) return true;
      // WOs en marcha que arrancaron antes del cutoff pero siguen abiertas
      if (r.startDate && !r.endDate && r.startDate <= cutoff) return true;
      return false;
    });
  }, [allRows, rangeKey]);

  // Time range derivado del filtered rows
  const allDates = rows.flatMap((r) => [r.startDate, r.endDate].filter(Boolean));
  const minDate = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()), Date.now())) : new Date();
  const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  const totalMs = Math.max(1, endMonth.getTime() - startMonth.getTime());

  function pctOf(date) {
    if (!date) return null;
    return ((date.getTime() - startMonth.getTime()) / totalMs) * 100;
  }

  const months = [];
  let cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  const todayPct = pctOf(new Date());
  const todayInRange = todayPct != null && todayPct >= 0 && todayPct <= 100;
  const todayLabel = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="px-6 py-6 h-full overflow-auto wr-scroll">
      {/* Header con selector de rango */}
      <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="label-caps-v2 mb-1">Timeline del rollout</p>
          <p className="text-[11px] text-wr-text-dim">
            Sites × tiempo · barras por status · línea amber = HOY ({todayLabel}) · {rows.length} sites en rango
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-wr-text-dim uppercase mr-1.5" style={{ letterSpacing: "0.1em" }}>Rango:</span>
          {TIMELINE_RANGES.map((b) => (
            <button
              key={b.key}
              onClick={() => setRangeKey(b.key)}
              className="text-[11px] px-2.5 py-1 rounded-sm border transition"
              style={{
                color: rangeKey === b.key ? "#F59E0B" : "#9CA3AF",
                borderColor: rangeKey === b.key ? "#F59E0B" : "#1F1F1F",
                background: rangeKey === b.key ? "rgba(245, 158, 11, 0.08)" : "transparent",
                letterSpacing: "0.04em",
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Sin WOs en este rango"
          sublabel="Ampliá el rango o seleccioná 'Todo' para ver el histórico completo"
        />
      ) : (
        <div className="border border-wr-border rounded-sm overflow-hidden">
          {/* Header months */}
          <div className="grid border-b border-wr-border bg-wr-surface/40" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
            <div className="px-3 py-2 label-caps-v2">Site</div>
            {months.map((m, i) => (
              <div key={i} className="px-2 py-2 text-[10px] text-wr-text-dim font-mono uppercase border-l border-wr-border" style={{ letterSpacing: "0.1em" }}>
                {m.toLocaleDateString("es-ES", { month: "short", year: "2-digit" })}
              </div>
            ))}
          </div>

          {/* Rows + línea HOY · contenedor relative */}
          <div className="relative max-h-[60vh] overflow-y-auto wr-scroll">
            {/* Línea vertical HOY · cubre toda el área de barras (después del label 200px) */}
            {todayInRange && (
              <div
                className="absolute top-0 bottom-0 z-10 pointer-events-none"
                style={{
                  left: `calc(200px + (100% - 200px) * ${todayPct / 100})`,
                  width: 2,
                  background: "#F59E0B",
                  opacity: 0.7,
                  boxShadow: "0 0 6px rgba(245, 158, 11, 0.55)",
                }}
                title={`HOY · ${todayLabel}`}
              />
            )}
            {rows.map((r) => {
              const startPct = r.startDate ? pctOf(r.startDate) : null;
              const endPct = r.endDate ? pctOf(r.endDate) : (r.startDate ? pctOf(new Date()) : null);
              const widthPct = startPct != null && endPct != null ? Math.max(1, endPct - startPct) : null;
              const color = FLAG_COLORS[r.flag];
              const flagLabel = r.flag === "done" ? "Hecho/Marcha"
                : r.flag === "problem" ? "Con problema"
                : r.flag === "scheduled" ? "Programado" : "Pendiente";
              const durationDays = r.startDate
                ? Math.max(1, Math.ceil(((r.endDate || new Date()).getTime() - r.startDate.getTime()) / (1000 * 60 * 60 * 24)))
                : null;
              const tooltip = [
                r.site.name || "—",
                r.site.code || "",
                `${formatWoCode(r.wo)} · ${r.wo.status}`,
                flagLabel,
                durationDays ? `${durationDays} día${durationDays !== 1 ? "s" : ""}${r.endDate ? "" : " (en marcha)"}` : "sin duración",
              ].filter(Boolean).join(" · ");

              return (
                <div
                  key={r.wo.id}
                  className="grid border-b border-wr-border hover:bg-wr-surface/20 transition relative"
                  style={{ gridTemplateColumns: `200px 1fr`, minHeight: 28 }}
                >
                  <div className="px-3 py-2 text-[11px] text-wr-text font-mono truncate border-r border-wr-border" title={r.site.name || ""}>
                    {r.site.code || r.site.name?.slice(0, 20)}
                  </div>
                  <div className="relative h-full">
                    {startPct != null && widthPct != null && (
                      <div
                        className="absolute top-1 bottom-1 rounded-sm cursor-pointer hover:opacity-100 transition"
                        style={{
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          background: color,
                          opacity: 0.78,
                          minWidth: 4,
                        }}
                        title={tooltip}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Botón Exportar · CSV + Print PDF (Iter 2.3) ───────────────────────
 * Implementación 100% client-side. NO toca backend (regla #5 del cuaderno):
 *   - CSV: Blob UTF-8 con BOM, Excel-ready, descarga directa.
 *   - PDF: window.print() sobre vista print-only inyectada al DOM,
 *          usuario elige "Guardar como PDF" en el diálogo nativo del browser.
 * Dictado original owner: "poder sacar un reporte con 3 clicks".
 * Aquí: 2 clicks (Exportar → CSV/PDF). Cumple. */
function ExportReportButton({ project, wos, sites, users, counts, totalSites, progressPct }) {
  const [open, setOpen] = useState(false);

  function exportCsv() {
    setOpen(false);
    try {
      const headers = [
        "Site Code", "Site Name", "Pais", "Ciudad",
        "WO Code", "Status", "Banderita", "Tech",
        "Creado", "Cerrado", "Lat", "Lng",
      ];
      const rows = wos.map((w) => {
        const s = sites[w.site_id] || {};
        const tech = users[getTechId(w)];
        const flag = classifyWoForFlag(w);
        const flagLabel = flag === "done" ? "Hecho/Marcha"
          : flag === "problem" ? "Con problema"
          : flag === "scheduled" ? "Programado" : "Pendiente";
        return [
          s.code || "",
          s.name || "",
          s.country || "",
          s.city || "",
          formatWoCode(w),
          w.status,
          flagLabel,
          tech?.full_name || tech?.name || "Sin asignar",
          w.created_at || "",
          w.closed_at || "",
          s.lat ?? s.latitude ?? "",
          s.lng ?? s.longitude ?? "",
        ];
      });
      const esc = (v) => {
        const str = String(v ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      const csv = [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
      const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.code}-rollout-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`CSV exportado · ${rows.length} sites`);
    } catch (err) {
      toast.error(`Error CSV: ${err.message || err}`);
    }
  }

  function exportPdf() {
    setOpen(false);
    try {
      const reportId = "rollout-print-report";
      document.getElementById(reportId)?.remove();
      const date = new Date().toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" });

      const rowsHtml = wos.map((w) => {
        const s = sites[w.site_id] || {};
        const tech = users[getTechId(w)];
        const flag = classifyWoForFlag(w);
        const flagLabel = flag === "done" ? "Hecho/Marcha"
          : flag === "problem" ? "Problema"
          : flag === "scheduled" ? "Programado" : "Pendiente";
        const flagColor = FLAG_COLORS[flag];
        return `<tr>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-family:monospace;font-size:9px;">${s.code || "—"}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:10px;">${s.name || "—"}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:9px;color:#555;">${s.country || ""}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-family:monospace;font-size:9px;">${formatWoCode(w)}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:9px;">${w.status}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:9px;color:${flagColor};font-weight:600;">${flagLabel}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:9px;">${tech?.full_name || tech?.name || "Sin asignar"}</td>
        </tr>`;
      }).join("");

      const wrapper = document.createElement("div");
      wrapper.id = reportId;
      wrapper.innerHTML = `
        <style>
          @media print {
            body * { visibility: hidden; }
            #${reportId}, #${reportId} * { visibility: visible; }
            #${reportId} { position: absolute; top: 0; left: 0; width: 100%; padding: 16px 18px; background: white; color: #111; font-family: 'Helvetica Neue', Arial, sans-serif; }
            @page { size: A4 landscape; margin: 10mm; }
          }
          @media screen { #${reportId} { display: none; } }
        </style>
        <header style="border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:14px;">
          <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#666;">InsiteIQ · SRS · Reporte de Rollout</div>
          <h1 style="font-size:18px;margin:5px 0 2px 0;font-weight:700;">${project.title}</h1>
          <div style="font-size:10px;color:#555;font-family:monospace;">${project.code} · Status: ${project.status}</div>
          <div style="font-size:9px;color:#888;margin-top:3px;">Generado ${date}</div>
        </header>
        <section style="margin-bottom:12px;display:flex;gap:18px;font-size:11px;align-items:baseline;">
          <div><strong style="font-size:18px;">${counts.done}</strong> / ${totalSites} sites · <span style="color:#16A34A;font-weight:600;">${progressPct}%</span></div>
          <div style="color:#DC2626;">● ${counts.problem} con problemas</div>
          <div style="color:#3B82F6;">● ${counts.scheduled} en calendario</div>
          <div style="color:#16A34A;">● ${counts.done} hecho/marcha</div>
          ${counts.pending ? `<div style="color:#6B7280;">● ${counts.pending} pendientes</div>` : ""}
        </section>
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead><tr style="background:#f5f5f5;">
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">Site Code</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">Site Name</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">País</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">WO</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">Status</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">Banderita</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">Tech</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <footer style="margin-top:14px;border-top:1px solid #ccc;padding-top:6px;font-size:8px;color:#888;">
          InsiteIQ · System Rapid Solutions · Documento confidencial · ${wos.length} WOs · ${date}
        </footer>
      `;
      document.body.appendChild(wrapper);

      setTimeout(() => {
        window.print();
        setTimeout(() => document.getElementById(reportId)?.remove(), 1500);
      }, 60);

      toast.success("Reporte listo · usá 'Guardar como PDF' en el diálogo");
    } catch (err) {
      toast.error(`Error PDF: ${err.message || err}`);
    }
  }

  return (
    <div className="relative flex-shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-sm border text-[11px] uppercase font-medium transition"
        style={{
          color: "#F59E0B",
          borderColor: "#F59E0B",
          background: open ? "rgba(245, 158, 11, 0.18)" : "rgba(245, 158, 11, 0.08)",
          letterSpacing: "0.08em",
        }}
        title="Exportar reporte"
      >
        <Icon icon={ICONS.download} size={14} />
        Exportar
        <Icon icon={open ? ICONS.chevronUp : ICONS.chevronDown} size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[3000]" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 z-[3001] bg-wr-bg border border-wr-border rounded-sm overflow-hidden"
            style={{ minWidth: 220, boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)" }}
          >
            <button
              onClick={exportCsv}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] text-wr-text hover:bg-wr-surface/50 transition text-left"
            >
              <Icon icon={ICONS.document} size={16} color="#F59E0B" />
              <div className="flex-1">
                <div className="font-medium">Exportar CSV / XLSX</div>
                <div className="text-[9px] text-wr-text-dim font-mono mt-0.5">{wos.length} sites · Excel-ready</div>
              </div>
            </button>
            <button
              onClick={exportPdf}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] text-wr-text hover:bg-wr-surface/50 transition text-left border-t border-wr-border"
            >
              <Icon icon={ICONS.printer} size={16} color="#F59E0B" />
              <div className="flex-1">
                <div className="font-medium">Imprimir PDF</div>
                <div className="text-[9px] text-wr-text-dim font-mono mt-0.5">A4 landscape · "Guardar como PDF"</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
