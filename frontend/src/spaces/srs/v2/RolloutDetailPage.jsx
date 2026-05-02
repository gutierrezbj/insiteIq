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
  const [activeTab, setActiveTab] = useState("mapa");
  const [filter, setFilter] = useState("all"); // all · problems · scheduled

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
            <div className="flex items-center gap-3 mb-1">
              <p className="label-caps-v2">Rollout</p>
              <span className="font-mono text-[10px] text-wr-text-dim">{project.code}</span>
              <span
                className="text-[10px] uppercase font-semibold"
                style={{ color: project.status === "active" ? "#22C55E" : "#9CA3AF", letterSpacing: "0.1em" }}
              >
                · {project.status}
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

          {/* Botón Exportar (stub) */}
          <ExportReportButton project={project} />
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
    </div>
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

/* ─────────────────────── Tab TIMELINE ─────────────────────── */
function TimelineTab({ wos, sites }) {
  // Gantt simple: filas = sites con WO, eje X = mes
  // Para iter 1: muestra WOs cerradas como barras + intake como puntos pendientes
  const rows = useMemo(() => {
    return wos
      .filter((w) => sites[w.site_id])
      .map((w) => ({
        wo: w,
        site: sites[w.site_id],
        flag: classifyWoForFlag(w),
        startDate: w.created_at ? new Date(w.created_at) : null,
        endDate: w.closed_at ? new Date(w.closed_at) : null,
      }))
      .sort((a, b) => {
        // sort by site.code asc
        return (a.site.code || "").localeCompare(b.site.code || "");
      });
  }, [wos, sites]);

  // Time range
  const allDates = rows.flatMap((r) => [r.startDate, r.endDate].filter(Boolean));
  const minDate = allDates.length ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : new Date();
  const maxDate = allDates.length ? new Date(Math.max(...allDates.map((d) => d.getTime()), Date.now())) : new Date();
  // Padding
  const startMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 0);
  const totalMs = endMonth.getTime() - startMonth.getTime();

  function pctOf(date) {
    if (!date) return null;
    return ((date.getTime() - startMonth.getTime()) / totalMs) * 100;
  }

  // Generate month markers
  const months = [];
  let cursor = new Date(startMonth);
  while (cursor <= endMonth) {
    months.push(new Date(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return (
    <div className="px-6 py-6 h-full overflow-auto wr-scroll">
      <div className="mb-4">
        <p className="label-caps-v2 mb-1">Timeline del rollout</p>
        <p className="text-[11px] text-wr-text-dim">Sites × tiempo · barras coloreadas por status. Iteración 1.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="inbox" title="Sin WOs con fechas" />
      ) : (
        <div className="border border-wr-border rounded-sm">
          {/* Header months */}
          <div className="grid border-b border-wr-border bg-wr-surface/40" style={{ gridTemplateColumns: `200px repeat(${months.length}, 1fr)` }}>
            <div className="px-3 py-2 label-caps-v2">Site</div>
            {months.map((m, i) => (
              <div key={i} className="px-2 py-2 text-[10px] text-wr-text-dim font-mono uppercase border-l border-wr-border" style={{ letterSpacing: "0.1em" }}>
                {m.toLocaleDateString("es-ES", { month: "short", year: "2-digit" })}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div className="max-h-[60vh] overflow-y-auto wr-scroll">
            {rows.slice(0, 100).map((r) => {
              const startPct = r.startDate ? pctOf(r.startDate) : null;
              const endPct = r.endDate ? pctOf(r.endDate) : (r.startDate ? pctOf(new Date()) : null);
              const widthPct = startPct != null && endPct != null ? Math.max(1, endPct - startPct) : null;
              const color = FLAG_COLORS[r.flag];

              return (
                <div
                  key={r.wo.id}
                  className="grid border-b border-wr-border hover:bg-wr-surface/20 transition relative"
                  style={{ gridTemplateColumns: `200px 1fr`, minHeight: 28 }}
                >
                  <div className="px-3 py-2 text-[11px] text-wr-text font-mono truncate border-r border-wr-border">
                    {r.site.code || r.site.name?.slice(0, 20)}
                  </div>
                  <div className="relative h-full">
                    {startPct != null && widthPct != null && (
                      <div
                        className="absolute top-1 bottom-1 rounded-sm"
                        style={{
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          background: color,
                          opacity: 0.7,
                          minWidth: 4,
                        }}
                        title={`${r.site.name} · ${r.wo.status}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {rows.length > 100 && (
            <p className="px-3 py-2 text-[10px] text-wr-text-dim italic">+{rows.length - 100} más (paginar en próxima iter)</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Stub Botón Exportar ─────────────────────── */
function ExportReportButton({ project }) {
  function onClick() {
    toast.info("Reporte exportable · próxima iteración (PDF + XLSX, endpoint backend pendiente firma)");
  }
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-sm border text-[11px] uppercase font-medium transition"
      style={{
        color: "#F59E0B",
        borderColor: "#F59E0B",
        background: "rgba(245, 158, 11, 0.08)",
        letterSpacing: "0.08em",
      }}
      title="Exportar reporte (próxima iteración)"
    >
      <Icon icon={ICONS.download} size={14} />
      Exportar
    </button>
  );
}
