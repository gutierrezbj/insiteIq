/**
 * EspacioOpsPage — War Room SRS dark (Fase Delta · DS v1.7)
 *
 * Refactor 1:1 del mock mocks/insiteiq_map_srs_dark_v2_static.html.
 *
 * Layout:
 *   [KpiStripV2 5 buttons accionables · KPI-as-filter]
 *   [Mapa Leaflet light Positron (62% height) con pines pill]
 *   [Panel inferior · grid auto-fit minicards (38% height)]
 *   [SideDetailPanel slide-in derecho cuando hay WO seleccionada]
 *
 * Comportamientos:
 *   - Click en pin → abre popup con bloque timezone del tech
 *   - Click "Ver detalle →" en popup → cierra popup, abre SideDetailPanel
 *   - Click en KPI strip → filtra minicards Y oculta pines no relevantes
 *   - Click en minicard → flyTo al pin + abre popup
 *
 * Leaflet cargado vía CDN (window.L) — ver index.html.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../lib/api";
import { useRefresh } from "../../../contexts/RefreshContext";
import { useAuth } from "../../../contexts/AuthContext";
import {
  getClientOrgId,
  woMatchesClientScope,
  siteMatchesClientScope,
  alertMatchesClientScope,
} from "../../../lib/scope";
import { Icon, ICONS } from "../../../lib/icons";
import { getTechTimeInfo, VIEWER_TZ_LABEL } from "../../../lib/tz";
import { formatWoCode } from "../../../lib/woCode";
import {
  getBallSide, getBallLabel, getBallColor, ballAgeHours,
  getTechId, getTag, computeSlaInfo,
  ACTIVE_STATUSES, TERMINAL_STATUSES,
} from "../../../lib/woFields";
import KpiStripV2 from "../../../components/cockpit-v2/KpiStripV2";
import InterventionCardMini from "../../../components/cockpit-v2/InterventionCardMini";
import SideDetailPanel from "../../../components/warroom-v2/SideDetailPanel";
import { SkeletonInterventionCardMini } from "../../../components/v2-shared/Skeleton";
import EmptyState from "../../../components/v2-shared/EmptyState";
import { getStatusInfo } from "../../../components/cockpit-v2/InterventionCardFull";
import { getSeverityInfo } from "../../../components/cockpit-v2/InterventionCardMini";

function severityRank(s) {
  return { critical: 0, high: 1, medium: 2, normal: 3, low: 4 }[s] ?? 9;
}

const SLA_BADGE = {
  BREACH:  { label: "BREACH",  bg: "#DC262622", color: "#DC2626", border: "#DC2626" },
  AT_RISK: { label: "AT RISK", bg: "#F59E0B22", color: "#F59E0B", border: "#F59E0B" },
  OK:      { label: "OK",      bg: "#22C55E22", color: "#22C55E", border: "#22C55E" },
};

function getSlaBadge(slaStatus) {
  const key = (slaStatus || "OK").toUpperCase();
  return SLA_BADGE[key] || SLA_BADGE.OK;
}

/**
 * buildQuickPopupHtml — genera el HTML string del popup que va dentro del
 * Leaflet popup. Replica 1:1 el mock mocks/insiteiq_map_srs_dark_v2_static.html
 * función buildQuickPopup (líneas 691-790).
 */
function buildQuickPopupHtml({ wo, site, tech, client, warning }) {
  const status = getStatusInfo(wo?.status);
  const severity = getSeverityInfo(wo?.severity);
  const slaInfo = computeSlaInfo(wo);
  const sla = getSlaBadge(slaInfo.status);
  const slaTime = slaInfo.timeText;
  const techName = tech?.full_name || tech?.name;
  const tzInfo = techName ? getTechTimeInfo(techName) : null;
  const ballParty = getBallLabel(wo);
  const ballColor = getBallColor(wo);
  const tag = getTag(wo);

  return `
    <div style="background:#0A0A0A;color:#E5E5E5;font-family:'JetBrains Mono',monospace;">
      <!-- Header WO + SLA -->
      <div style="padding:11px 14px 10px;border-bottom:1px solid #1F1F1F;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-size:11px;color:${severity.color};font-weight:600;letter-spacing:0.05em;">${formatWoCode(wo)}</span>
        <span style="font-size:9px;padding:2px 6px;border-radius:2px;background:${sla.bg};color:${sla.color};border:1px solid ${sla.border};font-weight:600;letter-spacing:0.1em;">${sla.label} · ${slaTime}</span>
      </div>

      <!-- Status row -->
      <div style="padding:8px 14px;border-bottom:1px solid #1F1F1F;display:flex;align-items:center;gap:10px;">
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:${status.color};font-weight:600;letter-spacing:0.1em;">
          <span style="width:6px;height:6px;border-radius:50%;background:${status.color};"></span>${status.label}
        </span>
        <span style="font-size:10px;color:${severity.color};font-weight:600;letter-spacing:0.1em;">· ${severity.label}</span>
      </div>

      <!-- Title -->
      <div style="padding:12px 14px 10px;">
        <p style="margin:0 0 3px;font-family:'Instrument Sans',sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;line-height:1.25;">${site?.name || wo?.site_name || "Sin sitio"}</p>
        <p style="margin:0;font-size:11px;color:#6B7280;">
          <span style="color:#9CA3AF;">${site?.code || site?.id || "—"}</span>
          ${site?.city ? ` · ${site.city}` : ""}${site?.country ? `, ${site.country}` : ""}
        </p>
      </div>

      <!-- Metadata 2x2 (todos los fields con fallback "—" para no salir vacíos) -->
      <div style="padding:4px 14px 12px;display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;">
        <div>
          <p style="margin:0 0 2px;font-size:9px;color:#6B7280;letter-spacing:0.14em;text-transform:uppercase;">CLI</p>
          <p style="margin:0;font-size:12px;color:${client?.name ? "#E5E5E5" : "#6B7280"};">${client?.name || "—"}</p>
        </div>
        <div>
          <p style="margin:0 0 2px;font-size:9px;color:#6B7280;letter-spacing:0.14em;text-transform:uppercase;">BALL</p>
          <p style="margin:0;font-size:12px;color:${ballParty === "—" ? "#6B7280" : ballColor};font-weight:500;">${ballParty}</p>
        </div>
        <div>
          <p style="margin:0 0 2px;font-size:9px;color:#6B7280;letter-spacing:0.14em;text-transform:uppercase;">TECH</p>
          <p style="margin:0;font-size:12px;color:${techName ? "#E5E5E5" : "#6B7280"};">${techName || "Sin asignar"}</p>
        </div>
        <div>
          <p style="margin:0 0 2px;font-size:9px;color:#6B7280;letter-spacing:0.14em;text-transform:uppercase;">TAG</p>
          <p style="margin:0;font-size:12px;color:${tag ? "#E5E5E5" : "#6B7280"};">${tag || "—"}</p>
        </div>
      </div>

      ${tzInfo ? `
        <!-- Timezone block -->
        <div style="margin:0 14px 10px;padding:9px 11px;background:${tzInfo.color}12;border-left:2px solid ${tzInfo.color};">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:3px;">
            <div style="display:flex;align-items:baseline;gap:6px;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:600;color:#FFFFFF;">${tzInfo.techTime}</span>
              <span style="font-size:10px;color:#9CA3AF;letter-spacing:0.1em;text-transform:uppercase;">${tzInfo.tzLabel}</span>
            </div>
            <span style="font-size:9px;padding:2px 6px;border-radius:2px;background:${tzInfo.color}22;color:${tzInfo.color};font-weight:600;letter-spacing:0.1em;">${tzInfo.label}</span>
          </div>
          <p style="margin:0;font-size:10px;color:#6B7280;font-family:'JetBrains Mono',monospace;">
            Tu hora ${tzInfo.viewerTime} ${VIEWER_TZ_LABEL} · ${tzInfo.offsetText}${tzInfo.untilEndOfDay ? ` · fin jornada en ${tzInfo.untilEndOfDay}` : ""}
          </p>
        </div>
      ` : ""}

      ${warning ? `
        <!-- Warning row -->
        <div style="margin:0 14px 10px;padding:8px 10px;background:rgba(245, 158, 11, 0.06);border-left:2px solid #F59E0B;font-size:11px;color:#F59E0B;">
          <span style="font-weight:600;letter-spacing:0.08em;">${warning.type?.replace("_", " ") || "WARNING"}</span>
          <p style="margin:2px 0 0;color:#9CA3AF;font-weight:400;font-size:11px;line-height:1.35;">${warning.detail || ""}</p>
        </div>
      ` : ""}

      <!-- Actions -->
      <div style="padding:0 14px 12px;display:flex;gap:6px;">
        <button data-action="view-detail" data-wo-id="${wo?.id || ""}" style="flex:1;height:28px;background:#1F1F1F;color:#F59E0B;border:1px solid #2A2A2A;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;">Ver detalle →</button>
        ${techName ? `<button data-action="contact-tech" data-tech="${techName}" style="flex:1;height:28px;background:transparent;color:#9CA3AF;border:1px solid #2A2A2A;border-radius:3px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em;cursor:pointer;">Contactar tech</button>` : ""}
      </div>
    </div>
  `;
}

export default function EspacioOpsPage({ scope = "srs" }) {
  const { markRefreshing, markFresh } = useRefresh();
  const { user } = useAuth();
  const clientOrgId = scope === "client" ? getClientOrgId(user) : null;
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  const [allWos, setWos] = useState([]);
  const [allSites, setSites] = useState([]);
  const [allAlerts, setAlerts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);

  // Scope-filtered data (Principio #1 cliente)
  const wos = useMemo(
    () => allWos.filter((w) => woMatchesClientScope(w, clientOrgId)),
    [allWos, clientOrgId]
  );
  const sites = useMemo(
    () => allSites.filter((s) => siteMatchesClientScope(s, clientOrgId)),
    [allSites, clientOrgId]
  );
  const alerts = useMemo(
    () => allAlerts.filter((a) => alertMatchesClientScope(a, clientOrgId, allSites)),
    [allAlerts, clientOrgId, allSites]
  );
  const [activeFilter, setActiveFilter] = useState(null);
  const [detailWoId, setDetailWoId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  /* ─────────────────────── Data fetch ─────────────────────── */
  const load = useCallback(async () => {
    markRefreshing();
    try {
      const [woList, siteList, alertRes, orgList, userList] = await Promise.all([
        api.get("/work-orders?limit=500"),
        api.get("/sites?limit=500"),
        api.get("/alerts?status_eq=active&limit=200").catch(() => ({ items: [] })),
        api.get("/organizations?limit=500").catch(() => []),
        api.get("/users?limit=500").catch(() => []),
      ]);
      setWos(Array.isArray(woList) ? woList : woList?.items || []);
      setSites(Array.isArray(siteList) ? siteList : siteList?.items || []);
      setAlerts(Array.isArray(alertRes) ? alertRes : alertRes?.items || []);
      setOrgs(Array.isArray(orgList) ? orgList : orgList?.items || []);
      setUsers(Array.isArray(userList) ? userList : userList?.items || []);
    } catch (e) {
      // silent — keep previous data
    } finally {
      setHasLoadedOnce(true);
      markFresh();
    }
  }, [markRefreshing, markFresh]);

  useEffect(() => {
    load();
    const int = setInterval(load, 45000);
    return () => clearInterval(int);
  }, [load]);

  const siteMap = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s])), [sites]);
  const orgMap = useMemo(() => Object.fromEntries(orgs.map((o) => [o.id, o])), [orgs]);
  const userMap = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  /* ─────────────────────── Stats KPI ─────────────────────── */
  const stats = useMemo(() => {
    const active = wos.filter((w) => !TERMINAL_STATUSES.includes(w.status));
    const critical = active.filter((w) => w.severity === "critical" || w.severity === "high").length;
    const slaRisk = active.filter((w) => {
      const s = computeSlaInfo(w).status;
      return s === "BREACH" || s === "AT_RISK";
    }).length;
    const ballSrs = active.filter((w) => getBallSide(w) === "srs" && ballAgeHours(w) >= 6).length;
    const unassigned = active.filter((w) => !getTechId(w)).length;
    const activeToday = active.filter((w) => ["en_route", "on_site", "in_progress"].includes(w.status)).length;
    return { critical, slaRisk, ballSrs, unassigned, activeToday };
  }, [wos]);

  /* ─────────────────────── Filter predicate ─────────────────────── */
  const filterPredicate = useCallback((w) => {
    if (!activeFilter) return !TERMINAL_STATUSES.includes(w.status);
    switch (activeFilter) {
      case "critical":   return w.severity === "critical" || w.severity === "high";
      case "slaRisk": {
        const s = computeSlaInfo(w).status;
        return s === "BREACH" || s === "AT_RISK";
      }
      case "ballSrs":    return getBallSide(w) === "srs" && ballAgeHours(w) >= 6;
      case "unassigned": return !getTechId(w);
      case "activeToday":return ["en_route", "on_site", "in_progress"].includes(w.status);
      default:           return !TERMINAL_STATUSES.includes(w.status);
    }
  }, [activeFilter]);

  const filteredWos = useMemo(() => {
    return wos.filter(filterPredicate).sort((a, b) => {
      const dr = severityRank(a.severity) - severityRank(b.severity);
      if (dr !== 0) return dr;
      return ballAgeHours(b) - ballAgeHours(a);
    });
  }, [wos, filterPredicate]);

  /* ─────────────────────── Map init ─────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined" || !window.L) return;
    if (mapInstanceRef.current) return;
    if (!mapRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: true,
      preferCanvas: true,
      worldCopyJump: true,
    }).setView([20, -20], 2);

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

  /* ─────────────────────── Markers (sites con WO activa) ─────────────────────── */
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;
    const L = window.L;
    const map = mapInstanceRef.current;

    // Limpiar markers anteriores
    Object.values(markersRef.current).forEach((m) => m.remove());
    markersRef.current = {};

    // Crear marker por cada WO activa con site coords
    wos.forEach((wo) => {
      if (TERMINAL_STATUSES.includes(wo.status)) return;
      const site = siteMap[wo.site_id];
      if (!site) return;
      const lat = site.lat ?? site.latitude ?? site.location?.lat;
      const lng = site.lng ?? site.longitude ?? site.location?.lng;
      if (lat == null || lng == null) return;

      const status = getStatusInfo(wo.status);
      const isUrgent = wo.severity === "critical" || wo.severity === "high";
      const shortCode = formatWoCode(wo);
      const markerHtml = `
        <div class="wo-pill${isUrgent ? " is-urgent" : ""}" data-wo-id="${wo.id}">
          <span class="wo-dot" style="background:${status.color};"></span>
          <span>${shortCode}</span>
        </div>
      `;
      const icon = L.divIcon({
        className: "srs-marker",
        html: markerHtml,
        iconSize: null,
        iconAnchor: [50, 12],
      });
      const marker = L.marker([lat, lng], { icon, riseOnHover: true }).addTo(map);

      const tech = userMap[getTechId(wo)];
      const client = orgMap[wo.organization_id];
      const warning = wo.warning || (wo.alerts && wo.alerts[0]) || null;

      marker.bindPopup(buildQuickPopupHtml({ wo, site, tech, client, warning }), {
        // closeButton:false → el X de Leaflet se montaba encima del badge SLA
        // del header (mismo top-right corner). Cierra igual con click-fuera,
        // Esc, o autoClose al abrir otro popup.
        closeButton: false,
        autoClose: true,
        closeOnEscapeKey: true,
        maxWidth: 340,
        minWidth: 320,
        offset: [0, -6],
        // KPI strip vive encima del map container (sibling flex). Leaflet por
        // default solo respeta el bound del map div; con autoPanPaddingTopLeft
        // forzamos pan extra para que la cabeza del popup nunca quede tapada.
        autoPan: true,
        autoPanPaddingTopLeft: [20, 160],
        autoPanPaddingBottomRight: [20, 40],
        keepInView: true,
      });

      // Regenerar contenido al abrir → horas timezone live
      marker.on("popupopen", () => {
        const techNow = userMap[getTechId(wo)];
        const html = buildQuickPopupHtml({ wo, site, tech: techNow, client, warning });
        marker.getPopup().setContent(html);
        // wire los botones del popup ahora que están en el DOM
        setTimeout(() => {
          const popupNode = marker.getPopup().getElement();
          if (!popupNode) return;
          popupNode.querySelectorAll('[data-action="view-detail"]').forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const woId = btn.getAttribute("data-wo-id");
              marker.closePopup();
              setDetailWoId(woId);
              setDetailOpen(true);
            });
          });
          popupNode.querySelectorAll('[data-action="contact-tech"]').forEach((btn) => {
            btn.addEventListener("click", (e) => {
              e.stopPropagation();
              const t = btn.getAttribute("data-tech");
              // Por ahora solo log · cuando el backend tenga endpoint /api/contact, llamamos
              console.log("Contactar tech:", t);
            });
          });
        }, 0);
      });

      markersRef.current[wo.id] = marker;
    });
  }, [wos, siteMap, userMap, orgMap]);

  /* ─────────────────────── Visibilidad de markers según filtro ─────────────────────── */
  useEffect(() => {
    const visible = new Set(filteredWos.map((w) => w.id));
    Object.entries(markersRef.current).forEach(([id, m]) => {
      const el = m.getElement();
      if (!el) return;
      el.style.display = visible.has(id) ? "" : "none";
    });
  }, [filteredWos]);

  /* ─────────────────────── Click minicard → flyTo + popup ─────────────────────── */
  const handleMinicardClick = useCallback((wo) => {
    const site = siteMap[wo.site_id];
    if (!site || !mapInstanceRef.current) return;
    const lat = site.lat ?? site.latitude ?? site.location?.lat;
    const lng = site.lng ?? site.longitude ?? site.location?.lng;
    if (lat == null || lng == null) return;
    mapInstanceRef.current.flyTo([lat, lng], 6, { duration: 0.8 });
    setTimeout(() => {
      const m = markersRef.current[wo.id];
      if (m) m.openPopup();
    }, 600);
  }, [siteMap]);

  /* ─────────────────────── Detail panel data ─────────────────────── */
  const detailWo = useMemo(() => wos.find((w) => w.id === detailWoId) || null, [wos, detailWoId]);
  const detailSite = detailWo ? siteMap[detailWo.site_id] : null;
  const detailTech = detailWo ? userMap[getTechId(detailWo)] : null;
  const detailClient = detailWo ? orgMap[detailWo.organization_id] : null;

  // Lazy fetch al abrir el panel: briefing, capture, report, threads, audit.
  // El backend NO embebe esto en /work-orders/{id} — son endpoints separados.
  // Cada uno puede 404 (sin ack/sin submit/sin emit todavía) y eso es válido.
  const [detailExtras, setDetailExtras] = useState({
    briefing: null, capture: null, report: null,
    threadsShared: [], threadsInternal: [],
    auditRecent: [], auditCount: 0,
    loading: false,
  });
  useEffect(() => {
    if (!detailWoId || !detailOpen) return;
    let cancelled = false;
    setDetailExtras((prev) => ({ ...prev, loading: true }));
    const swallow = (p) => p.catch(() => null);
    Promise.all([
      swallow(api.get(`/work-orders/${detailWoId}/briefing`)),
      swallow(api.get(`/work-orders/${detailWoId}/capture`)),
      swallow(api.get(`/work-orders/${detailWoId}/report`)),
      swallow(api.get(`/work-orders/${detailWoId}/threads/shared/messages`)),
      swallow(api.get(`/work-orders/${detailWoId}/threads/internal/messages`)),
      swallow(api.get(`/audit-log?entity_id=${detailWoId}&limit=4`)),
    ]).then(([briefing, capture, report, sharedMsgs, internalMsgs, auditList]) => {
      if (cancelled) return;
      const sharedArr = Array.isArray(sharedMsgs) ? sharedMsgs : sharedMsgs?.items || [];
      const internalArr = Array.isArray(internalMsgs) ? internalMsgs : internalMsgs?.items || [];
      const auditArr = Array.isArray(auditList) ? auditList : auditList?.items || [];
      setDetailExtras({
        briefing, capture, report,
        threadsShared: sharedArr.map((m) => ({
          who: m.from_name || m.from || m.actor || "—",
          when: m.created_at ? new Date(m.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "",
          msg: m.text || m.body || m.message || "",
          pending: !!m.pending_reply,
        })),
        threadsInternal: internalArr.map((m) => ({
          who: m.from_name || m.from || m.actor || "—",
          when: m.created_at ? new Date(m.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "",
          msg: m.text || m.body || m.message || "",
          pending: !!m.pending_reply,
        })),
        auditRecent: auditArr.map((a) => ({
          action: a.action || a.event_type || "—",
          actor: a.actor_email || a.actor_user_id?.slice(0, 8) || "system",
          when: a.created_at ? new Date(a.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" }) : "",
        })),
        auditCount: auditArr.length,
        loading: false,
      });
    });
    return () => { cancelled = true; };
  }, [detailWoId, detailOpen]);

  // Timeline construido desde campos disponibles del WO (no del backend embebido).
  const detailTimeline = useMemo(
    () => detailWo ? buildTimeline(detailWo, detailTech?.full_name || detailTech?.name) : [],
    [detailWo, detailTech]
  );

  /* ─────────────────────── Render ─────────────────────── */
  const counters = useMemo(() => ({
    enRuta: wos.filter((w) => w.status === "en_route").length,
    enSitio: wos.filter((w) => ["on_site", "in_progress"].includes(w.status)).length,
    sinAsignar: stats.unassigned,
  }), [wos, stats.unassigned]);

  return (
    <div className="h-full flex flex-col">
      {/* Top KPI strip · accionable · 5 buttons */}
      <KpiStripV2
        stats={stats}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Mapa */}
      <div className="flex-1 relative" style={{ minHeight: 400 }}>
        <div className="absolute top-3 left-5 z-[400] flex items-center gap-3 pointer-events-none">
          <p className="label-caps-v2">Mapa operativo</p>
          <span className="font-mono text-[11px] text-wr-text">
            {filteredWos.length} {filteredWos.length === 1 ? "intervención" : "intervenciones"} visibles
          </span>
        </div>
        <div className="absolute top-3 right-5 z-[400] flex items-center gap-4 text-[11px] pointer-events-none">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#DC2626" }} />
            <span className="text-wr-text-mid">CRÍTICO</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#F59E0B" }} />
            <span className="text-wr-text-mid">ACTIVO</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "#6B7280" }} />
            <span className="text-wr-text-mid">NORMAL</span>
          </span>
        </div>
        <div ref={mapRef} className="absolute inset-0" />

        {/* Legend inferior izq · estados de intervención */}
        <div className="absolute bottom-3 left-5 z-[400] bg-wr-surface/95 border border-wr-border rounded-sm px-3 py-2 flex items-center gap-3 text-[10px] backdrop-blur-sm pointer-events-none">
          <p className="label-caps-v2">Estado</p>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#3B82F6" }}/><span className="text-wr-text-mid">Entrada</span></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#8B5CF6" }}/><span className="text-wr-text-mid">Preparando</span></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#F59E0B" }}/><span className="text-wr-text-mid">En ruta</span></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#EA580C" }}/><span className="text-wr-text-mid">En sitio</span></span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: "#22C55E" }}/><span className="text-wr-text-mid">Resuelta</span></span>
        </div>

        {!window.L && (
          <div className="absolute inset-0 flex items-center justify-center text-wr-text-dim text-[12px] font-mono">
            Cargando mapa…
          </div>
        )}
      </div>

      {/* Bottom panel · minicards grid */}
      <section className="border-t border-wr-border bg-wr-bg flex flex-col" style={{ maxHeight: "38%" }}>
        <header className="px-6 py-3 flex items-center justify-between border-b border-wr-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <p className="label-caps-v2">Intervenciones en marcha</p>
            <span className="font-mono text-[11px] text-wr-text">{filteredWos.length}</span>
            {activeFilter && (
              <span className="ml-3 inline-flex items-center gap-2 pl-3 border-l border-wr-border">
                <span className="label-caps-v2" style={{ color: "#F59E0B" }}>Filtro activo</span>
                <button
                  onClick={() => setActiveFilter(null)}
                  className="text-wr-text-dim hover:text-wr-amber transition"
                  title="Quitar filtro"
                >
                  <Icon icon={ICONS.close} size={14} />
                </button>
              </span>
            )}
          </div>
          <button
            onClick={load}
            className="text-[11px] text-wr-text-mid hover:text-wr-amber uppercase transition flex items-center gap-1"
            style={{ letterSpacing: "0.08em" }}
          >
            <Icon icon={ICONS.refresh} size={12} />
            Refrescar
          </button>
        </header>
        <div
          className="flex-1 overflow-y-auto wr-scroll px-6 py-3"
          style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 8, alignContent: "start" }}
        >
          {!hasLoadedOnce ? (
            // Skeleton state durante primer load
            Array.from({ length: 8 }).map((_, i) => (
              <SkeletonInterventionCardMini key={i} />
            ))
          ) : filteredWos.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={activeFilter ? "magniferBug" : "inbox"}
                title={activeFilter ? "Sin intervenciones para el filtro actual" : "Sin intervenciones activas"}
                sublabel={activeFilter ? "Ajusta los criterios o quita el filtro." : null}
                action={activeFilter ? { label: "Quitar filtro", onClick: () => setActiveFilter(null) } : null}
              />
            </div>
          ) : (
            filteredWos.slice(0, 18).map((wo) => {
              const site = siteMap[wo.site_id];
              return (
                <InterventionCardMini
                  key={wo.id}
                  wo={wo}
                  site={site}
                  onClick={() => handleMinicardClick(wo)}
                />
              );
            })
          )}
        </div>
      </section>

      {/* Side detail panel (slide-in derecho) */}
      <SideDetailPanel
        wo={detailWo}
        site={detailSite}
        tech={detailTech}
        client={detailClient}
        shieldLevel={detailWo?.shield_level || null}
        warning={detailWo?.warning}
        description={detailWo?.description}
        scope={detailWo?.scope}
        timeline={detailTimeline}
        threadsShared={detailExtras.threadsShared}
        threadsInternal={detailExtras.threadsInternal}
        parts={detailWo?.parts || []}
        briefing={detailExtras.briefing}
        capture={detailExtras.capture}
        report={detailExtras.report}
        auditCount={detailExtras.auditCount}
        auditRecent={detailExtras.auditRecent}
        loading={detailExtras.loading}
        viewerScope={scope}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEscalate={() => {
          // TODO: api.post(`/work-orders/${detailWoId}/escalate`)
          setDetailOpen(false);
        }}
      />
    </div>
  );
}
