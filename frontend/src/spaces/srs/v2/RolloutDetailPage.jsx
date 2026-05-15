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
import { useTranslation } from "react-i18next";
import i18n from "../../../i18n";

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
import { driftMinutes, driftSeverity } from "../../../lib/wo-metrics";
import {
  getBallSide, getBallColor, getBallLabel, ballAgeHours,
  getTechId, getTag, computeSlaInfo,
  ACTIVE_STATUSES, TERMINAL_STATUSES,
} from "../../../lib/woFields";
import EmptyState from "../../../components/v2-shared/EmptyState";
import { SkeletonKpiCard } from "../../../components/v2-shared/Skeleton";
import RolloutNotesPanel from "../../../components/rollout-v2/RolloutNotesPanel";

const TAB_KEYS = [
  { key: "mapa",     i18n: "tab_map",       icon: ICONS.map },
  { key: "kanban",   i18n: "tab_kanban",    icon: ICONS.kanban },
  { key: "cuadro",   i18n: "tab_dashboard", icon: ICONS.gauge },
  { key: "timeline", i18n: "tab_timeline",  icon: ICONS.calendar },
];

// Banderita SVG · 3 estados según dictado del owner
const FLAG_COLORS = {
  done:       "#22C55E",  // verde · hecho o en marcha
  problem:    "#DC2626",  // rojo · con problemas
  scheduled:  "#3B82F6",  // azul · en calendario (bombillo)
  pending:    "#8B95A8",  // gris · sin estado claro
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
 * Marker visual: pin Lucide map-pin con fill color status (Iter 2.14).
 *
 * Antes (Iter 2.2): teardrop SVG custom con fill negro + Solar flag dentro
 * = "féretro funerario" (roast del owner 2026-05-03). Ahora glyph nativo
 * Lucide map-pin (lucide.dev/icons/map-pin) inline con stroke del color
 * status + fill semi-transparente. Pin reconocible universal · adios cripta.
 *
 *   - viewBox 24x24 estándar Lucide
 *   - stroke 2.5 + linecap/linejoin round (firma técnica Lucide)
 *   - Fill blanco para contraste sobre fondo color (mejor visibilidad)
 *   - Color del stroke = status (verde/rojo/azul/gris)
 *   - Anchor: punta inferior del pin
 */
// Helper compartido · resuelve el label del flag desde i18n con variant.
//   "long" → "Hecho/Marcha" · "Con problema" · "Programado" · "Pendiente"
//   "short" → "Hecho/Marcha" · "Problema" · "Programado" · "Pendiente"
//   "scheduled_unassigned" se usa en el popup mapa para flag=scheduled
function flagLabelFor(flagKind, variant = "long") {
  const map = {
    long: { done: "flag_done", problem: "flag_problem", scheduled: "flag_scheduled", pending: "flag_pending" },
    short: { done: "flag_done", problem: "flag_problem_short", scheduled: "flag_scheduled", pending: "flag_pending" },
  };
  const keys = map[variant] || map.long;
  const k = keys[flagKind] || "flag_pending";
  return i18n.t(`page_rollout_detail.${k}`);
}

function flagMarkerHtml(color, flagKind) {
  const label = flagLabelFor(flagKind, "long");
  return `
    <div class="rollout-pin" title="${label}" style="position:relative;width:32px;height:38px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.45));">
      <svg viewBox="0 0 24 24" width="32" height="38" xmlns="http://www.w3.org/2000/svg"
           fill="${color}" stroke="#FFFFFF" stroke-width="1.5"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3" fill="#FFFFFF" stroke="${color}" stroke-width="2"/>
      </svg>
    </div>
  `;
}

export default function RolloutDetailPage() {
  const { t } = useTranslation("common");
  const TABS = useMemo(
    () => TAB_KEYS.map((tab) => ({ ...tab, label: t(`page_rollout_detail.${tab.i18n}`) })),
    [t]
  );
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
      <div className="h-full flex items-center justify-center text-cl-text-mid font-mono text-[12px]">
        {t("page_rollout_detail.loading_rollout")}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon="magniferBug"
          title={t("page_rollout_detail.not_found_title")}
          sublabel={`project_id: ${project_id}`}
          action={{ label: t("page_rollout_detail.back_to_list"), onClick: () => navigate("/srs/rollouts") }}
        />
      </div>
    );
  }

  const totalSites = dashboard?.total_sites_target || wos.length;
  const completed = dashboard?.work_orders?.completed || counts.done;
  const progressPct = totalSites > 0 ? Math.round((completed / totalSites) * 100) : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header sticky · bg blanco con border-bottom strong para presencia */}
      <header className="bg-cl-bg flex-shrink-0" style={{ borderBottom: "1px solid #C8CDD8" }}>
        <div className="px-10 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1 flex-wrap">
              <p className="label-caps-v2" style={{ color: "#0A1628", fontWeight: 800 }}>{t("page_rollout_detail.label_rollout")}</p>
              <span className="font-mono text-[11px] text-cl-text-dim">{project.code}</span>
              <span
                className="font-jakarta text-[10px] uppercase px-2 py-0.5 rounded-sm"
                style={{
                  color: project.status === "active" ? "#0A6131" : "#3D4A66",
                  background: project.status === "active" ? "#D9F1E5" : "#F4F6F8",
                  border: project.status === "active" ? "1px solid #16A34A" : "1px solid #C8CDD8",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                {project.status}
              </span>
            </div>
            <h1
              className="font-jakarta text-[22px] leading-tight"
              style={{ color: "#0A1628", fontWeight: 800, letterSpacing: "-0.015em" }}
            >
              {project.title}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-[12px] flex-wrap" style={{ color: "#3D4A66", fontWeight: 500 }}>
              <span className="font-mono">
                <strong style={{ color: "#0A1628", fontWeight: 700 }}>{completed}</strong> / {totalSites} sites
                <span> · </span>
                <span style={{ color: "#16A34A", fontWeight: 700 }}>{progressPct}%</span>
              </span>
              <span style={{ color: FLAG_COLORS.problem, fontWeight: 600 }}>● {counts.problem} con problemas</span>
              <span style={{ color: FLAG_COLORS.scheduled, fontWeight: 600 }}>● {counts.scheduled} en calendario</span>
              <span style={{ color: FLAG_COLORS.done, fontWeight: 600 }}>● {counts.done} hecho/marcha</span>
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

        {/* Tabs nav · activo navy strong + bottom-border-3px navy + bold */}
        <nav className="px-10 flex items-center gap-0">
          {TABS.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className="flex items-center gap-2 px-4 py-3 transition font-jakarta"
                style={{
                  fontSize: 13,
                  color: isActive ? "#0A1628" : "#3D4A66",
                  borderBottom: isActive ? "3px solid #0A1628" : "3px solid transparent",
                  fontWeight: isActive ? 700 : 600,
                  letterSpacing: "0.02em",
                  background: isActive ? "#F7F8FA" : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "#0A1628";
                    e.currentTarget.style.background = "#F7F8FA";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = "#3D4A66";
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <Icon icon={t.icon} size={14} />
                {t.label}
              </button>
            );
          })}

          {/* Filter rápido (solo en Mapa y Kanban) · pills outline navy strong */}
          {(activeTab === "mapa" || activeTab === "kanban") && (
            <div className="ml-auto flex items-center gap-2 py-2">
              <span className="font-jakarta uppercase" style={{ fontSize: 10, color: "#3D4A66", fontWeight: 700, letterSpacing: "0.12em" }}>{t("page_rollout_detail.view_label")}</span>
              {[
                { key: "all", label: t("page_rollout_detail.filter_all") },
                { key: "problems", label: `${t("page_rollout_detail.kpi_problems")} (${counts.problem})`, color: FLAG_COLORS.problem },
                { key: "scheduled", label: `${t("page_rollout_detail.kpi_scheduled")} (${counts.scheduled})`, color: FLAG_COLORS.scheduled },
              ].map((f) => {
                const isActive = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className="font-jakarta px-3 py-1 rounded-sm transition"
                    style={{
                      fontSize: 11,
                      color: isActive ? "#FFFFFF" : (f.color || "#3D4A66"),
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: isActive ? "#0A1628" : "#C8CDD8",
                      background: isActive ? "#0A1628" : "#FFFFFF",
                      fontWeight: isActive ? 700 : 600,
                      boxShadow: isActive ? "0 1px 3px rgba(10, 22, 40, 0.18)" : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "#F4F6F8";
                        e.currentTarget.style.borderColor = "#0A1628";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.background = "#FFFFFF";
                        e.currentTarget.style.borderColor = "#C8CDD8";
                      }
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
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
          <DashboardTab dashboard={dashboard} counts={counts} totalSites={totalSites} progressPct={progressPct} wos={wos} />
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
  const { t } = useTranslation("common");
  const hasPending = count > 0;
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-sm font-jakarta uppercase transition"
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: hasPending ? "#0066B8" : "#8B95A8",
        border: hasPending ? "1px solid #0066B8" : "1px solid #C8CDD8",
        background: hasPending ? "#DEEAF7" : "#FFFFFF",
        letterSpacing: "0.08em",
        cursor: hasPending ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        if (hasPending) {
          e.currentTarget.style.background = "#0066B8";
          e.currentTarget.style.color = "#FFFFFF";
        }
      }}
      onMouseLeave={(e) => {
        if (hasPending) {
          e.currentTarget.style.background = "#DEEAF7";
          e.currentTarget.style.color = "#0066B8";
        }
      }}
      title={hasPending ? t("page_rollout_detail.bulk_btn_title_pending", { count }) : t("page_rollout_detail.bulk_btn_title_no_pending")}
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
  const { t } = useTranslation("common");
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
      toast.error(t("page_rollout_detail.bulk_select_one_site"));
      return;
    }
    if (!techId || !scheduledAt) {
      toast.error(t("page_rollout_detail.tech_date_required"));
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
      toast.success(t("page_rollout_detail.bulk_success", { count: successes }));
      onDone?.();
    } else if (successes > 0) {
      toast.warning(t("page_rollout_detail.bulk_partial", { ok: successes, errors: errors.length }));
    } else {
      toast.error(t("page_rollout_detail.bulk_all_failed", { errors: errors.length }));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center"
      style={{ background: "rgba(10, 22, 40, 0.55)", backdropFilter: "blur(2px)" }}
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="rounded-md w-[640px] max-w-[95vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          border: "1px solid #C8CDD8",
          boxShadow: "0 24px 48px -8px rgba(10, 22, 40, 0.32)",
        }}
      >
        {/* Header · navy strong title con presencia */}
        <header className="px-5 py-4 flex-shrink-0" style={{ borderBottom: "1px solid #C8CDD8", background: "#F7F8FA", borderRadius: "6px 6px 0 0" }}>
          <p className="label-caps-v2 mb-1" style={{ color: "#0A1628", fontWeight: 800 }}>{t("page_rollout_detail.bulk_modal_title")}</p>
          <h2 className="font-jakarta text-[18px] leading-tight" style={{ color: "#0A1628", fontWeight: 700, letterSpacing: "-0.005em" }}>
            {t("page_rollout_detail.bulk_modal_subtitle", { count: selected.size, total: wos.length })}
          </h2>
          <p className="text-[12px] mt-1 font-mono" style={{ color: "#3D4A66", fontWeight: 500 }}>
            {t("page_rollout_detail.bulk_modal_explainer")}
          </p>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Tech + Date pickers */}
          <div className="px-5 py-3 border-b border-cl-border grid grid-cols-2 gap-3 flex-shrink-0">
            <div>
              <label className="block text-[10px] text-cl-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
                {t("page_rollout_detail.modal_label_tech")}
              </label>
              <select
                value={techId}
                onChange={(e) => setTechId(e.target.value)}
                disabled={submitting}
                className="w-full bg-cl-surface/40 border border-cl-border rounded-sm px-3 py-2 text-[12px] text-cl-text font-mono"
              >
                <option value="">{t("page_rollout_detail.modal_select_tech_placeholder")}</option>
                {techCandidates.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-cl-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
                {t("page_rollout_detail.bulk_modal_label_date")}
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={submitting}
                className="w-full bg-cl-surface/40 border border-cl-border rounded-sm px-3 py-2 text-[12px] text-cl-text font-mono"
              />
            </div>
          </div>

          {/* Lista checkboxes */}
          <div className="px-5 py-2 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid #E2E5EC" }}>
            <button
              onClick={toggleAll}
              disabled={submitting}
              className="font-jakarta text-[11px] uppercase transition"
              style={{ letterSpacing: "0.08em", color: "#0A1628", fontWeight: 700 }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              {selected.size === wos.length ? t("page_rollout_detail.bulk_modal_deselect_all") : t("page_rollout_detail.bulk_modal_select_all")}
            </button>
            <span className="text-[11px] text-cl-text-mid font-mono">{selected.size} / {wos.length}</span>
          </div>
          {wos.length === 0 && (
            <div className="flex-1 flex items-center justify-center px-5 py-12 text-center">
              <div>
                <p className="text-[13px] mb-1" style={{ color: "#3D4A66", fontWeight: 600 }}>{t("page_rollout_detail.no_pending_sites")}</p>
                <p className="text-[11px] text-cl-text-dim font-mono">{t("page_rollout_detail.no_pending_explainer")}</p>
              </div>
            </div>
          )}
          {wos.length > 0 && (
          <ul className="flex-1 overflow-y-auto wr-scroll divide-y divide-cl-border">
            {wos.map((w) => {
              const s = sites[w.site_id] || {};
              const isSelected = selected.has(w.id);
              return (
                <li
                  key={w.id}
                  onClick={() => !submitting && toggle(w.id)}
                  className="px-5 py-2 flex items-center gap-3 cursor-pointer hover:bg-cl-surface/30 transition"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(w.id)}
                    disabled={submitting}
                    style={{ accentColor: "#0A1628" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] text-cl-text truncate">{s.name || t("page_rollout_detail.site_no_name")}</div>
                    <div className="text-[10px] text-cl-text-dim font-mono truncate">
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
            <div className="px-5 py-2 flex-shrink-0" style={{ borderTop: "1px solid #E2E5EC" }}>
              <div className="flex items-center justify-between text-[12px] mb-1" style={{ color: "#0A1628" }}>
                <span style={{ fontWeight: 600 }}>{t("page_rollout_detail.scheduling")}</span>
                <span className="font-mono" style={{ fontWeight: 700 }}>{progress.done} / {progress.total}</span>
              </div>
              <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "#E8EDF5" }}>
                <div
                  className="h-1.5 transition-all"
                  style={{
                    width: progress.total ? `${(progress.done / progress.total) * 100}%` : "0%",
                    background: "#0A1628",
                  }}
                />
              </div>
            </div>
          )}
          {!submitting && progress.errors.length > 0 && (
            <div className="px-5 py-2 flex-shrink-0 max-h-[100px] overflow-y-auto wr-scroll" style={{ borderTop: "1px solid #E2E5EC", background: "#FCE4E6" }}>
              <p className="text-[11px] font-mono mb-1" style={{ color: "#8E1F2A", fontWeight: 700 }}>{t("page_rollout_detail.bulk_modal_errors_label", { count: progress.errors.length })}</p>
              {progress.errors.map((e, i) => (
                <p key={i} className="text-[10px] font-mono" style={{ color: "#3D4A66" }}>{e.code}: {e.msg}</p>
              ))}
            </div>
          )}
        </div>

        {/* Footer · navy strong primary CTA */}
        <footer className="px-5 py-3 flex items-center justify-end gap-2 flex-shrink-0" style={{ borderTop: "1px solid #E2E5EC", background: "#F7F8FA", borderRadius: "0 0 6px 6px" }}>
          <button
            onClick={onClose}
            disabled={submitting}
            className="font-jakarta text-[11px] uppercase px-3 py-2 transition"
            style={{ letterSpacing: "0.08em", color: "#3D4A66", fontWeight: 600 }}
            onMouseEnter={(e) => !submitting && (e.currentTarget.style.color = "#0A1628")}
            onMouseLeave={(e) => !submitting && (e.currentTarget.style.color = "#3D4A66")}
          >
            {submitting ? t("page_rollout_detail.bulk_modal_wait") : t("page_rollout_detail.bulk_modal_cancel")}
          </button>
          <button
            onClick={execute}
            disabled={submitting || selected.size === 0 || !techId || !scheduledAt}
            className="font-jakarta text-[11px] uppercase px-5 py-2 rounded-sm transition"
            style={{
              background: submitting || selected.size === 0 || !techId || !scheduledAt ? "#E2E5EC" : "#0A1628",
              color: submitting || selected.size === 0 || !techId || !scheduledAt ? "#8B95A8" : "#FFFFFF",
              border: submitting || selected.size === 0 || !techId || !scheduledAt ? "1px solid #E2E5EC" : "1px solid #0A1628",
              cursor: submitting || selected.size === 0 || !techId || !scheduledAt ? "not-allowed" : "pointer",
              letterSpacing: "0.08em",
              fontWeight: 700,
              boxShadow: submitting || selected.size === 0 || !techId || !scheduledAt ? "none" : "0 2px 6px -1px rgba(10, 22, 40, 0.18)",
            }}
          >
            {submitting
              ? t("page_rollout_detail.bulk_modal_progress_count", { done: progress.done, total: progress.total })
              : t("page_rollout_detail.bulk_modal_schedule_n", { count: selected.size })}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─────────────────────── Botón Notas (Iter 2.7) ─────────────────────── */
function NotesButton({ onClick }) {
  const { t } = useTranslation("common");
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-sm font-jakarta uppercase transition"
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#3D4A66",
        border: "1px solid #C8CDD8",
        background: "#FFFFFF",
        letterSpacing: "0.08em",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "#F4F6F8";
        e.currentTarget.style.borderColor = "#0A1628";
        e.currentTarget.style.color = "#0A1628";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "#FFFFFF";
        e.currentTarget.style.borderColor = "#C8CDD8";
        e.currentTarget.style.color = "#3D4A66";
      }}
      title={t("page_rollout_detail.notes_btn_tooltip")}
    >
      <Icon icon={ICONS.document} size={14} />
      {t("page_rollout_detail.notes_btn")}
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
        <svg viewBox="0 0 24 24" width="14" height="18" xmlns="http://www.w3.org/2000/svg"
             fill={color} stroke="#FFFFFF" strokeWidth={1.5}
             strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3" fill="#FFFFFF" stroke={color} strokeWidth={2}/>
        </svg>
      </span>
      <span className="text-cl-text-mid">{label}</span>
    </span>
  );
}

/* ─────────────────────── Modal "Programar desde Mapa" ─────────────────────── */
function ScheduleSiteModal({ wo, site, users, onClose, onScheduled }) {
  const { t } = useTranslation("common");
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
      toast.error(t("page_rollout_detail.tech_date_required"));
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
      toast.success(t("page_rollout_detail.single_scheduled_toast", { code: site?.code || wo.reference }));
      onScheduled?.();
      onClose();
    } catch (err) {
      toast.error(t("page_rollout_detail.single_scheduled_error", { message: err.message || err }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[5000] flex items-center justify-center"
      style={{ background: "rgba(10, 22, 40, 0.55)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="rounded-md w-[460px] max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          border: "1px solid #C8CDD8",
          boxShadow: "0 24px 48px -8px rgba(10, 22, 40, 0.32)",
        }}
      >
        {/* Header · navy strong title */}
        <header className="px-5 py-4" style={{ borderBottom: "1px solid #E2E5EC", background: "#F7F8FA", borderRadius: "6px 6px 0 0" }}>
          <p className="label-caps-v2 mb-1" style={{ color: "#0A1628", fontWeight: 800 }}>{t("page_rollout_detail.schedule_install_modal_title")}</p>
          <h2 className="font-jakarta text-[18px] leading-tight" style={{ color: "#0A1628", fontWeight: 700, letterSpacing: "-0.005em" }}>
            {site?.name || t("page_rollout_detail.site_no_name")}
          </h2>
          <p className="text-[11px] text-cl-text-mid font-mono mt-0.5">
            {site?.code} · {site?.city || site?.country}
          </p>
        </header>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block font-jakarta text-[10px] uppercase mb-1.5" style={{ letterSpacing: "0.14em", color: "#3D4A66", fontWeight: 700 }}>
              {t("page_rollout_detail.modal_label_tech")}
            </label>
            <select
              value={techId}
              onChange={(e) => setTechId(e.target.value)}
              className="w-full rounded-sm px-3 py-2 text-[13px] font-mono"
              style={{ background: "#FFFFFF", border: "1px solid #C8CDD8", color: "#0A1628", outline: "none" }}
            >
              <option value="">{t("page_rollout_detail.modal_select_tech_placeholder")}</option>
              {techCandidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email} · {u.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-jakarta text-[10px] uppercase mb-1.5" style={{ letterSpacing: "0.14em", color: "#3D4A66", fontWeight: 700 }}>
              {t("page_rollout_detail.single_modal_label_date")}
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-sm px-3 py-2 text-[13px] font-mono"
              style={{ background: "#FFFFFF", border: "1px solid #C8CDD8", color: "#0A1628", outline: "none" }}
            />
          </div>

          <p className="text-[12px] leading-relaxed" style={{ color: "#3D4A66", fontWeight: 500 }}>
            {t("page_rollout_detail.single_modal_explainer")}
          </p>
        </div>

        {/* Footer · navy strong primary CTA */}
        <footer className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: "1px solid #E2E5EC", background: "#F7F8FA", borderRadius: "0 0 6px 6px" }}>
          <button
            onClick={onClose}
            disabled={submitting}
            className="font-jakarta text-[11px] uppercase px-3 py-2 transition"
            style={{ letterSpacing: "0.08em", color: "#3D4A66", fontWeight: 600 }}
            onMouseEnter={(e) => !submitting && (e.currentTarget.style.color = "#0A1628")}
            onMouseLeave={(e) => !submitting && (e.currentTarget.style.color = "#3D4A66")}
          >
            {t("page_rollout_detail.bulk_modal_cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !techId || !scheduledAt}
            className="font-jakarta text-[11px] uppercase px-5 py-2 rounded-sm transition"
            style={{
              background: submitting || !techId || !scheduledAt ? "#E2E5EC" : "#0A1628",
              color: submitting || !techId || !scheduledAt ? "#8B95A8" : "#FFFFFF",
              border: submitting || !techId || !scheduledAt ? "1px solid #E2E5EC" : "1px solid #0A1628",
              cursor: submitting || !techId || !scheduledAt ? "not-allowed" : "pointer",
              letterSpacing: "0.08em",
              fontWeight: 700,
              boxShadow: submitting || !techId || !scheduledAt ? "none" : "0 2px 6px -1px rgba(10, 22, 40, 0.18)",
            }}
          >
            {submitting ? t("page_rollout_detail.schedule_modal_submitting") : t("page_rollout_detail.schedule_modal_submit")}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ─────────────────────── Tab MAPA ─────────────────────── */
function MapTab({ wos, sites, users, onScheduled }) {
  const { t } = useTranslation("common");
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

  const clusterGroupRef = useRef(null);
  const originalBoundsRef = useRef(null);  // Iter 2.15: para botón "Vista general"

  // Marker rendering — banderitas SVG según classification + clustering (Iter 2.13)
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Cleanup previous cluster group + markers
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
      clusterGroupRef.current = null;
    }
    markersRef.current = {};

    // Crear cluster group con styling DS v2 (color dominante por status del grupo)
    if (!L.markerClusterGroup) {
      console.warn("[Rollout] Leaflet.markercluster no cargado; fallback sin clustering");
    }
    const cluster = L.markerClusterGroup ? L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c) => {
        // Contar status de los markers del cluster · color cluster = peor status presente
        const childCount = c.getChildCount();
        const childMarkers = c.getAllChildMarkers();
        let dominant = "done";
        for (const m of childMarkers) {
          const f = m.options._flagKind;
          if (f === "problem") { dominant = "problem"; break; }
          if (f === "scheduled" && dominant !== "problem") dominant = "scheduled";
          if (f === "pending" && dominant === "done") dominant = "pending";
        }
        const color = FLAG_COLORS[dominant];
        const size = childCount < 10 ? 36 : childCount < 100 ? 44 : 52;
        const fontSize = childCount < 10 ? 13 : childCount < 100 ? 14 : 15;
        return L.divIcon({
          className: "rollout-cluster",
          html: `
            <div style="
              width:${size}px;height:${size}px;
              background:${color};
              border:2px solid #FFFFFF;
              border-radius:50%;
              display:flex;align-items:center;justify-content:center;
              color:#FFFFFF;
              font-family:'JetBrains Mono',monospace;
              font-size:${fontSize}px;font-weight:700;
              box-shadow:0 2px 6px rgba(0,0,0,0.4), 0 0 0 4px ${color}33;
            ">${childCount}</div>
          `,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    }) : null;

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
      const techName = tech?.full_name || tech?.name || i18n.t("page_rollout_detail.tech_unassigned");

      const icon = L.divIcon({
        className: "rollout-flag-marker",
        html: flagMarkerHtml(color, flag),
        iconSize: [32, 38],
        iconAnchor: [16, 38],  // punta inferior del pin = posición exacta del site
      });

      // Iter 2.13: NO addTo(map) directo · vamos via cluster group si existe
      const marker = L.marker([lat, lng], { icon, _flagKind: flag });
      if (cluster) {
        cluster.addLayer(marker);
      } else {
        marker.addTo(map);  // fallback si plugin no cargó
      }
      const isScheduled = flag === "scheduled";
      const ctaButton = isScheduled
        ? `<button data-action="schedule" data-wo-id="${wo.id}" style="margin-top:6px;width:100%;background:#0A1628;color:#FFFFFF;border:0;border-radius:3px;padding:6px 10px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;">${i18n.t("page_rollout_detail.popup_schedule_install")}</button>`
        : "";
      // Para popup variant: scheduled muestra "Programado · sin agendar", problem usa short
      const popupFlagLabel = flag === "scheduled"
        ? i18n.t("page_rollout_detail.flag_scheduled_unassigned")
        : flagLabelFor(flag, "short");
      const popupHtml = `
        <div style="background:#FFFFFF;color:#0A1628;font-family:'JetBrains Mono',monospace;min-width:220px;">
          <div style="padding:9px 12px;border-bottom:1px solid #E2E5EC;">
            <div style="font-size:10px;color:${color};font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">${popupFlagLabel}</div>
            <div style="font-size:13px;color:#FFFFFF;font-weight:600;margin-top:2px;">${site.name || i18n.t("page_rollout_detail.site_no_name_alt")}</div>
            <div style="font-size:10px;color:#3D4A66;">${site.code || ""}</div>
          </div>
          <div style="padding:8px 12px;font-size:11px;line-height:1.5;">
            <div><span style="color:#8B95A8;">WO:</span> ${formatWoCode(wo)}</div>
            <div><span style="color:#8B95A8;">${i18n.t("page_rollout_detail.popup_status")}:</span> ${wo.status}</div>
            <div><span style="color:#8B95A8;">${i18n.t("page_rollout_detail.popup_tech")}:</span> ${techName}</div>
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

    // Iter 2.13: añadir cluster group al map ahora que tiene markers
    if (cluster) {
      map.addLayer(cluster);
      clusterGroupRef.current = cluster;
    }

    // Fit bounds + guardar para botón "Vista general" (Iter 2.15)
    if (bounds && wos.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
        originalBoundsRef.current = bounds;
      } catch (e) { /* ignore */ }
    }
  }, [wos, sites, users]);

  // Iter 2.15: reset al overview general (botón flotante + Esc shortcut)
  const resetToOverview = useCallback(() => {
    if (!mapInstanceRef.current || !originalBoundsRef.current) return;
    try {
      mapInstanceRef.current.fitBounds(originalBoundsRef.current, {
        padding: [40, 40],
        maxZoom: 12,
        animate: true,
        duration: 0.4,
      });
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") resetToOverview(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [resetToOverview]);

  return (
    <div className="h-full relative">
      <div ref={mapRef} className="absolute inset-0" />

      {/* Iter 2.15: botón "Vista general" top-right · navy strong + sombra para call-to-action visible */}
      <button
        onClick={resetToOverview}
        className="absolute top-3 right-3 z-[400] rounded-sm px-3 py-2 flex items-center gap-2 font-jakarta uppercase transition backdrop-blur-sm"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          background: "#FFFFFF",
          color: "#0A1628",
          border: "1px solid #0A1628",
          boxShadow: "0 4px 12px -2px rgba(10, 22, 40, 0.18), 0 2px 4px -1px rgba(10, 22, 40, 0.10)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#0A1628";
          e.currentTarget.style.color = "#FFFFFF";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#FFFFFF";
          e.currentTarget.style.color = "#0A1628";
        }}
        title={t("page_rollout_detail.map_overview_tooltip")}
      >
        <Icon icon="map" size={14} />
        {t("page_rollout_detail.map_overview_btn")}
      </button>

      {/* Leyenda · pins con la misma visual del marker (consistencia) */}
      <div className="absolute bottom-3 left-5 z-[400] bg-cl-surface/95 border border-cl-border rounded-sm px-3 py-2 flex items-center gap-4 text-[10px] backdrop-blur-sm">
        <p className="label-caps-v2">{t("page_rollout_detail.map_legend")}</p>
        <LegendPin color={FLAG_COLORS.done} label={t("page_rollout_detail.flag_done")} />
        <LegendPin color={FLAG_COLORS.problem} label={t("page_rollout_detail.flag_problem_short")} />
        <LegendPin color={FLAG_COLORS.scheduled} label={t("page_rollout_detail.flag_scheduled")} />
      </div>
      {!window.L && (
        <div className="absolute inset-0 flex items-center justify-center text-cl-text-dim text-[12px] font-mono">
          {t("common.loading")}
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
const KANBAN_COLUMN_KEYS = [
  { key: "solicitado",  i18n: "kanban_col_requested",  statuses: ["intake", "triage"] },
  { key: "preparando",  i18n: "kanban_col_preparing",  statuses: ["pre_flight", "assigned", "dispatched"] },
  { key: "en_campo",    i18n: "kanban_col_in_field",   statuses: ["en_route", "on_site", "in_progress"] },
  { key: "cerrando",    i18n: "kanban_col_closing",    statuses: ["in_closeout", "resolved"] },
  { key: "cerrado",     i18n: "kanban_col_closed",     statuses: ["completed", "closed"] },
];

function KanbanTab({ wos, sites, users, reload }) {
  const { t } = useTranslation("common");
  const KANBAN_COLUMNS = useMemo(
    () => KANBAN_COLUMN_KEYS.map((c) => ({ ...c, label: t(`page_rollout_detail.${c.i18n}`) })),
    [t]
  );
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
    <div className="px-10 h-full flex flex-col">
      <div className="flex gap-3 overflow-x-auto wr-scroll py-4" style={{ minWidth: 0 }}>
      {KANBAN_COLUMNS.map((col) => (
        <div
          key={col.key}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, col)}
          className="flex-shrink-0 w-[260px] bg-cl-surface/40 border border-cl-border rounded-sm flex flex-col"
          style={{ minHeight: 200 }}
        >
          <div className="px-3 py-2 border-b border-cl-border flex items-center justify-between">
            <span className="label-caps-v2">{col.label}</span>
            <span className="font-mono text-[11px] text-cl-text">{wosByColumn[col.key].length}</span>
          </div>
          <div className="p-2 space-y-2 overflow-y-auto flex-1">
            {wosByColumn[col.key].length === 0 && (
              <p className="text-[10px] text-cl-text-dim italic px-2 py-3">{t("page_rollout_detail.kanban_col_empty")}</p>
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
                  className="bg-cl-bg border border-cl-border rounded-sm p-3 cursor-grab"
                  style={{ borderLeftWidth: 2, borderLeftColor: FLAG_COLORS[flag] }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] text-cl-text-dim">{formatWoCode(wo)}</span>
                    <span className="text-[9px]" style={{ color: FLAG_COLORS[flag] }}>● {flag}</span>
                  </div>
                  <div className="text-[12px] text-cl-text font-medium leading-tight mb-1 truncate">
                    {site?.name || wo.title || "—"}
                  </div>
                  <div className="text-[10px] text-cl-text-mid truncate">
                    {site?.code || ""} · {tech?.full_name || tech?.name || t("page_rollout_detail.tech_unassigned_short")}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}

/* ─────────────────────── Tab CUADRO DE MANDO ─────────────────────── */
function DashboardTab({ dashboard, counts, totalSites, progressPct, wos }) {
  const { t, i18n } = useTranslation("common");
  const numLocale = (i18n.language || "es").startsWith("en") ? "en-US" : "es-ES";
  const k = dashboard?.kpis || {};
  const wo = dashboard?.work_orders || {};

  // Iter 2.63j · Q5 Agustín · contadores de drift de llegada por WO
  const driftStats = useMemo(() => {
    if (!Array.isArray(wos)) return { measured: 0, late: 0, severe: 0 };
    let measured = 0, late = 0, severe = 0;
    for (const w of wos) {
      const d = driftMinutes(w);
      if (d == null) continue;
      measured++;
      const sev = driftSeverity(d);
      if (sev === "warn") late++;
      else if (sev === "danger") { late++; severe++; }
    }
    return { measured, late, severe };
  }, [wos]);

  return (
    <div className="px-10 py-6 space-y-6">
      {/* Hero metric · navy strong + border-strong para autoridad */}
      <div className="rounded-sm px-6 py-6" style={{ background: "#FFFFFF", border: "1px solid #C8CDD8", borderLeft: "4px solid #0A1628" }}>
        <p className="label-caps-v2 mb-2" style={{ color: "#0A1628", fontWeight: 800 }}>{t("page_rollout_detail.dashboard_title")}</p>
        <div className="flex items-baseline gap-3 mb-3 flex-wrap">
          {/* Número GIGANTE 48px navy strong (NO text-white) */}
          <span
            className="font-jakarta leading-none"
            style={{ color: "#0A1628", fontSize: 48, fontWeight: 800, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums" }}
          >
            {wo.completed || counts.done}
          </span>
          <span className="text-[20px]" style={{ color: "#8B95A8" }}>de</span>
          <span className="font-jakarta text-[28px]" style={{ color: "#3D4A66", fontWeight: 600 }}>{totalSites}</span>
          <span className="text-[14px]" style={{ color: "#8B95A8" }}>sites · </span>
          <span
            className="font-jakarta text-[28px]"
            style={{ color: progressPct >= 80 ? "#16A34A" : progressPct >= 50 ? "#E8A33D" : "#D63944", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
          >
            {progressPct}%
          </span>
        </div>
        <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "#E8EDF5" }}>
          <div
            className="h-2 rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: progressPct >= 80 ? "#16A34A" : progressPct >= 50 ? "#E8A33D" : "#D63944",
            }}
          />
        </div>
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label={t("page_rollout_detail.kpi_done")} value={counts.done} color={FLAG_COLORS.done} />
        <KpiCard label={t("page_rollout_detail.kpi_problems")} value={counts.problem} color={FLAG_COLORS.problem} />
        <KpiCard label={t("page_rollout_detail.kpi_scheduled")} value={counts.scheduled} color={FLAG_COLORS.scheduled} />
        <KpiCard label={t("page_rollout_detail.kpi_active_today")} value={wo.active || 0} color="#3D4A66" />
      </div>

      {/* Velocidad + drift project + ETA + drift llegada (Q5 Agustín) */}
      <div className="grid grid-cols-4 gap-3">
        <DataPanel
          title={t("page_rollout_detail.panel_velocity")}
          value={k.throughput_week ?? "—"}
          unit={`sites / 7d`}
        />
        <DataPanel
          title={t("page_rollout_detail.panel_drift")}
          value={k.on_schedule_pct != null ? `${k.on_schedule_pct}%` : "—"}
          unit={k.on_schedule_pct == null ? "—" : k.on_schedule_pct >= 100 ? "↑" : "↓"}
          color={k.on_schedule_pct == null ? "#3D4A66" : k.on_schedule_pct >= 100 ? "#22C55E" : k.on_schedule_pct >= 80 ? "#0A1628" : "#DC2626"}
        />
        <DataPanel
          title={t("page_rollout_detail.panel_eta_100")}
          value={k.eta_to_100pct_weeks != null ? `${k.eta_to_100pct_weeks}` : "—"}
          unit={k.eta_to_100pct_weeks == null ? "—" : "weeks"}
        />
        <DataPanel
          title={t("page_rollout_detail.panel_drift_arrival")}
          value={driftStats.measured === 0 ? "—" : driftStats.late}
          unit={
            driftStats.measured === 0
              ? "—"
              : t("page_rollout_detail.panel_drift_arrival_unit", {
                  measured: driftStats.measured,
                })
          }
          color={
            driftStats.measured === 0
              ? "#3D4A66"
              : driftStats.severe > 0
              ? "#DC2626"
              : driftStats.late > 0
              ? "#E8A33D"
              : "#22C55E"
          }
        />
      </div>

      {/* SLA + incidents */}
      <div className="grid grid-cols-2 gap-3">
        <DataPanel
          title={t("page_rollout_detail.panel_sla_compliance")}
          value={k.sla_compliance_pct != null ? `${k.sla_compliance_pct}%` : "—"}
          unit={t("page_rollout_detail.panel_sla_unit")}
          color={k.sla_compliance_pct == null ? "#3D4A66" : k.sla_compliance_pct >= 90 ? "#22C55E" : "#0A1628"}
        />
        <DataPanel
          title={t("page_rollout_detail.panel_incidents_active")}
          value={k.incidents_active || 0}
          unit="high/critical"
          color={k.incidents_active > 0 ? "#DC2626" : "#22C55E"}
        />
      </div>

      <p className="text-[10px] text-cl-text-dim font-mono">
        {dashboard?.generated_at ? new Date(dashboard.generated_at).toLocaleString(numLocale) : "—"}
      </p>
    </div>
  );
}

function KpiCard({ label, value, color }) {
  return (
    <div className="rounded-sm px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #E2E5EC", borderLeftWidth: 4, borderLeftColor: color }}>
      <p className="label-caps-v2 mb-1" style={{ color: color, fontWeight: 800 }}>{label}</p>
      <p className="font-jakarta leading-none" style={{ fontSize: 32, color: "#0A1628", fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{value}</p>
    </div>
  );
}

function DataPanel({ title, value, unit, color }) {
  return (
    <div className="rounded-sm px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #E2E5EC" }}>
      <p className="label-caps-v2 mb-1" style={{ color: "#0A1628", fontWeight: 800 }}>{title}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-jakarta" style={{ fontSize: 26, fontWeight: 800, color: color || "#0A1628", letterSpacing: "-0.015em" }}>{value}</span>
        <span className="text-[11px]" style={{ color: "#3D4A66", fontWeight: 500 }}>{unit}</span>
      </div>
    </div>
  );
}

/* ─────────────────────── Tab TIMELINE (Iter 2.4 polish) ───────────────────────
 * Gantt: filas = sites con WO, eje X = mes.
 * Iter 2.4 añade: selector de rango (1m/3m/6m/Todo), línea HOY amber,
 * tooltip detallado al hover, sin límite de 100 rows. */
const TIMELINE_RANGE_KEYS = [
  { key: "1m",  i18n: "timeline_range_1m",  days: 30 },
  { key: "3m",  i18n: "timeline_range_3m",  days: 90 },
  { key: "6m",  i18n: "timeline_range_6m",  days: 180 },
  { key: "all", i18n: "timeline_range_all", days: null },
];

function TimelineTab({ wos, sites }) {
  const { t, i18n } = useTranslation("common");
  const numLocale = (i18n.language || "es").startsWith("en") ? "en-US" : "es-ES";
  const TIMELINE_RANGES = useMemo(
    () => TIMELINE_RANGE_KEYS.map((r) => ({ ...r, label: t(`page_rollout_detail.${r.i18n}`) })),
    [t]
  );
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
  const todayLabel = new Date().toLocaleDateString(numLocale, { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="px-10 py-6 h-full overflow-auto wr-scroll">
      {/* Header con selector de rango */}
      <div className="mb-4 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <p className="label-caps-v2 mb-1">{t("page_rollout_detail.timeline_title")}</p>
          <p className="text-[11px] text-cl-text-dim">
            HOY ({todayLabel}) · {rows.length} sites
          </p>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-cl-text-dim uppercase mr-1.5" style={{ letterSpacing: "0.1em" }}>{t("page_rollout_detail.timeline_range_label")}</span>
          {TIMELINE_RANGES.map((b) => (
            <button
              key={b.key}
              onClick={() => setRangeKey(b.key)}
              className="text-[11px] px-2.5 py-1 rounded-sm border transition"
              style={{
                color: rangeKey === b.key ? "#0A1628" : "#3D4A66",
                borderColor: rangeKey === b.key ? "#0A1628" : "#E2E5EC",
                background: rangeKey === b.key ? "rgba(255, 107, 53, 0.08)" : "transparent",
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
          title={t("page_rollout_detail.timeline_empty_title")}
          sublabel={t("page_rollout_detail.timeline_empty_sublabel")}
        />
      ) : (
        <div className="border border-cl-border rounded-sm overflow-hidden">
          {/* Header months */}
          <div className="grid border-b border-cl-border bg-cl-surface/40" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
            <div className="px-3 py-2 label-caps-v2">{t("page_rollout_detail.timeline_col_site")}</div>
            {months.map((m, i) => (
              <div key={i} className="px-2 py-2 text-[10px] text-cl-text-dim font-mono uppercase border-l border-cl-border" style={{ letterSpacing: "0.1em" }}>
                {m.toLocaleDateString(numLocale, { month: "short", year: "2-digit" })}
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
                  background: "#0A1628",
                  opacity: 0.7,
                  boxShadow: "0 0 6px rgba(255, 107, 53, 0.55)",
                }}
                title={`HOY · ${todayLabel}`}
              />
            )}
            {rows.map((r) => {
              const startPct = r.startDate ? pctOf(r.startDate) : null;
              const endPct = r.endDate ? pctOf(r.endDate) : (r.startDate ? pctOf(new Date()) : null);
              const widthPct = startPct != null && endPct != null ? Math.max(1, endPct - startPct) : null;
              const color = FLAG_COLORS[r.flag];
              const flagLabel = flagLabelFor(r.flag, "long");
              const durationDays = r.startDate
                ? Math.max(1, Math.ceil(((r.endDate || new Date()).getTime() - r.startDate.getTime()) / (1000 * 60 * 60 * 24)))
                : null;
              const durationLabel = durationDays
                ? `${t(durationDays === 1
                    ? "page_rollout_detail.timeline_duration_one"
                    : "page_rollout_detail.timeline_duration_other",
                    { count: durationDays })}${r.endDate ? "" : ` ${t("page_rollout_detail.timeline_in_progress_suffix")}`}`
                : t("page_rollout_detail.timeline_no_duration");
              const tooltip = [
                r.site.name || "—",
                r.site.code || "",
                `${formatWoCode(r.wo)} · ${r.wo.status}`,
                flagLabel,
                durationLabel,
              ].filter(Boolean).join(" · ");

              return (
                <div
                  key={r.wo.id}
                  className="grid border-b border-cl-border hover:bg-cl-surface/20 transition relative"
                  style={{ gridTemplateColumns: `200px 1fr`, minHeight: 28 }}
                >
                  <div className="px-3 py-2 text-[11px] text-cl-text font-mono truncate border-r border-cl-border" title={r.site.name || ""}>
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
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  function exportCsv() {
    setOpen(false);
    try {
      const headers = [
        t("page_rollout_detail.csv_header_site_code"),
        t("page_rollout_detail.csv_header_site_name"),
        t("page_rollout_detail.csv_header_country"),
        t("page_rollout_detail.csv_header_city"),
        t("page_rollout_detail.csv_header_wo_code"),
        t("page_rollout_detail.csv_header_status"),
        t("page_rollout_detail.csv_header_flag"),
        t("page_rollout_detail.csv_header_tech"),
        t("page_rollout_detail.csv_header_created"),
        t("page_rollout_detail.csv_header_closed"),
        t("page_rollout_detail.csv_header_lat"),
        t("page_rollout_detail.csv_header_lng"),
      ];
      const rows = wos.map((w) => {
        const s = sites[w.site_id] || {};
        const tech = users[getTechId(w)];
        const flag = classifyWoForFlag(w);
        return [
          s.code || "",
          s.name || "",
          s.country || "",
          s.city || "",
          formatWoCode(w),
          w.status,
          flagLabelFor(flag, "long"),
          tech?.full_name || tech?.name || t("page_rollout_detail.tech_unassigned"),
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
      toast.success(t("page_rollout_detail.export_csv_success", { count: rows.length }));
    } catch (err) {
      toast.error(t("page_rollout_detail.export_csv_error", { message: err.message || err }));
    }
  }

  function exportPdf() {
    setOpen(false);
    try {
      const reportId = "rollout-print-report";
      document.getElementById(reportId)?.remove();
      const numLocale = i18n.language && i18n.language.startsWith("en") ? "en-US" : "es-ES";
      const date = new Date().toLocaleString(numLocale, { dateStyle: "long", timeStyle: "short" });

      const rowsHtml = wos.map((w) => {
        const s = sites[w.site_id] || {};
        const tech = users[getTechId(w)];
        const flag = classifyWoForFlag(w);
        const flagLabel = flagLabelFor(flag, "short");
        const flagColor = FLAG_COLORS[flag];
        return `<tr>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-family:monospace;font-size:9px;">${s.code || "—"}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:10px;">${s.name || "—"}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:9px;color:#555;">${s.country || ""}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-family:monospace;font-size:9px;">${formatWoCode(w)}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:9px;">${w.status}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:9px;color:${flagColor};font-weight:600;">${flagLabel}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #ddd;font-size:9px;">${tech?.full_name || tech?.name || t("page_rollout_detail.tech_unassigned")}</td>
        </tr>`;
      }).join("");

      const summaryProblems = `<div style="color:#DC2626;">● ${t("page_rollout_detail.pdf_summary_problems", { count: counts.problem })}</div>`;
      const summaryScheduled = `<div style="color:#3B82F6;">● ${t("page_rollout_detail.pdf_summary_scheduled", { count: counts.scheduled })}</div>`;
      const summaryDone = `<div style="color:#16A34A;">● ${t("page_rollout_detail.pdf_summary_done", { count: counts.done })}</div>`;
      const summaryPending = counts.pending
        ? `<div style="color:#8B95A8;">● ${t("page_rollout_detail.pdf_summary_pending", { count: counts.pending })}</div>`
        : "";

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
          <div style="font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#666;">${t("page_rollout_detail.pdf_header_kicker")}</div>
          <h1 style="font-size:18px;margin:5px 0 2px 0;font-weight:700;">${project.title}</h1>
          <div style="font-size:10px;color:#555;font-family:monospace;">${project.code} · ${t("page_rollout_detail.pdf_status_label")}: ${project.status}</div>
          <div style="font-size:9px;color:#888;margin-top:3px;">${t("page_rollout_detail.pdf_generated_at", { date })}</div>
        </header>
        <section style="margin-bottom:12px;display:flex;gap:18px;font-size:11px;align-items:baseline;">
          <div><strong style="font-size:18px;">${counts.done}</strong> / ${totalSites} sites · <span style="color:#16A34A;font-weight:600;">${progressPct}%</span></div>
          ${summaryProblems}
          ${summaryScheduled}
          ${summaryDone}
          ${summaryPending}
        </section>
        <table style="width:100%;border-collapse:collapse;font-size:10px;">
          <thead><tr style="background:#f5f5f5;">
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">${t("page_rollout_detail.csv_header_site_code")}</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">${t("page_rollout_detail.csv_header_site_name")}</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">${t("page_rollout_detail.csv_header_country")}</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">${t("page_rollout_detail.pdf_col_wo")}</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">${t("page_rollout_detail.csv_header_status")}</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">${t("page_rollout_detail.csv_header_flag")}</th>
            <th style="text-align:left;padding:6px;border-bottom:2px solid #111;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;">${t("page_rollout_detail.csv_header_tech")}</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <footer style="margin-top:14px;border-top:1px solid #ccc;padding-top:6px;font-size:8px;color:#888;">
          ${t("page_rollout_detail.pdf_footer", { count: wos.length, date })}
        </footer>
      `;
      document.body.appendChild(wrapper);

      setTimeout(() => {
        window.print();
        setTimeout(() => document.getElementById(reportId)?.remove(), 1500);
      }, 60);

      toast.success(t("page_rollout_detail.export_pdf_success"));
    } catch (err) {
      toast.error(t("page_rollout_detail.export_pdf_error", { message: err.message || err }));
    }
  }

  return (
    <div className="relative flex-shrink-0">
      {/* Botón EXPORTAR · cambio a navy strong cuando está abierto = autoridad serena (no orange acento) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-sm font-jakarta uppercase transition"
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: open ? "#FFFFFF" : "#0A1628",
          border: "1px solid #0A1628",
          background: open ? "#0A1628" : "#FFFFFF",
          letterSpacing: "0.08em",
          boxShadow: open ? "0 2px 6px rgba(10, 22, 40, 0.24)" : "none",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = "#F4F6F8";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = "#FFFFFF";
          }
        }}
        title={t("page_rollout_detail.export_btn_tooltip")}
      >
        <Icon icon={ICONS.download} size={14} />
        {t("page_rollout_detail.export_btn")}
        <Icon icon={open ? ICONS.chevronUp : ICONS.chevronDown} size={12} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[3000]" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 mt-1 z-[3001] rounded-sm overflow-hidden"
            style={{
              minWidth: 240,
              background: "#FFFFFF",
              border: "1px solid #C8CDD8",
              boxShadow: "0 16px 32px -4px rgba(10, 22, 40, 0.20), 0 8px 16px -4px rgba(10, 22, 40, 0.12)",
            }}
          >
            <button
              onClick={exportCsv}
              className="w-full flex items-center gap-3 px-3 py-3 transition text-left font-jakarta"
              style={{ color: "#0A1628", fontSize: 12 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F6F8")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Icon icon={ICONS.document} size={16} color="#0A1628" />
              <div className="flex-1">
                <div style={{ fontWeight: 700 }}>{t("page_rollout_detail.export_option_csv_title")}</div>
                <div className="text-[10px] text-cl-text-dim font-mono mt-0.5">{t("page_rollout_detail.export_option_csv_sub", { count: wos.length })}</div>
              </div>
            </button>
            <button
              onClick={exportPdf}
              className="w-full flex items-center gap-3 px-3 py-3 transition text-left font-jakarta"
              style={{
                color: "#0A1628",
                fontSize: 12,
                borderTop: "1px solid #E2E5EC",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F4F6F8")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Icon icon={ICONS.printer} size={16} color="#0A1628" />
              <div className="flex-1">
                <div style={{ fontWeight: 700 }}>{t("page_rollout_detail.export_option_pdf_title")}</div>
                <div className="text-[10px] text-cl-text-dim font-mono mt-0.5">{t("page_rollout_detail.export_option_pdf_sub")}</div>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
