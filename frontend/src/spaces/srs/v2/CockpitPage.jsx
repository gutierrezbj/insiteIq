/**
 * V2CockpitPage — Cockpit de Operaciones SRS dark (Design System v1.7)
 *
 * Refactor 1:1 del mock mocks/insiteiq_cockpit_srs_dark_v2_static.html.
 *
 * Layout:
 *   [KpiStripV2 5 cols accionables (KPI-as-filter)]
 *   [Grid: main 8/12 (Intervenciones en curso 3 + Historial reciente grid 4)
 *          | sidebar 4/12 (Alertas / Shields / Meteo / Resumen)]
 *
 * Reutiliza la lógica de data-fetching del CockpitPage v1:
 *   - 5 endpoints en paralelo (/work-orders, /sites, /alerts, /organizations, /users)
 *   - Refresh 45s
 *   - useMemo para indices y filtros
 *
 * El shell envolvente (TopHeader + Sidebar + BottomStrip) lo provee V2Shell
 * desde spaces/srs/Layout.jsx cuando está activo el flag ?v2=1 o
 * VITE_V2_SHELL=1.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";
import { useRefresh } from "../../../contexts/RefreshContext";
import KpiStripV2 from "../../../components/cockpit-v2/KpiStripV2";
import InterventionCardFull from "../../../components/cockpit-v2/InterventionCardFull";
import InterventionCardMini from "../../../components/cockpit-v2/InterventionCardMini";
import {
  AlertsWidget,
  ShieldsWidget,
  WeatherWidget,
  SummaryWidget,
} from "../../../components/cockpit-v2/SidebarWidgets";
import {
  SkeletonKpiCard,
  SkeletonInterventionCardFull,
  SkeletonInterventionCardMini,
  SkeletonWidget,
} from "../../../components/v2-shared/Skeleton";
import EmptyState from "../../../components/v2-shared/EmptyState";
import { formatWoCode } from "../../../lib/woCode";

const ACTIVE_STATUSES = [
  "intake",
  "triage",
  "pre_flight",
  "assigned",
  "dispatched",
  "in_progress",
  "in_closeout",
  "en_route",
  "on_site",
];

const TERMINAL_STATUSES = ["completed", "closed", "cancelled", "resolved"];

function severityRank(s) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s] ?? 9;
}

function ballAgeHours(wo) {
  const since = wo?.ball_in_court?.since;
  if (!since) return 0;
  return (Date.now() - new Date(since).getTime()) / 36e5;
}

export default function V2CockpitPage({ scope = "srs" }) {
  const navigate = useNavigate();
  const { markRefreshing, markFresh } = useRefresh();

  const [wos, setWos] = useState([]);
  const [sites, setSites] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);
  const [agreements, setAgreements] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const load = useCallback(async () => {
    markRefreshing();
    try {
      const [woList, siteList, alertRes, orgList, userList, agrList] = await Promise.all([
        api.get("/work-orders?limit=500"),
        api.get("/sites?limit=500"),
        api.get("/alerts?status_eq=active&limit=200").catch(() => ({ items: [] })),
        api.get("/organizations?limit=500").catch(() => []),
        api.get("/users?limit=500").catch(() => []),
        api.get("/service-agreements?limit=200").catch(() => []),
      ]);
      setWos(Array.isArray(woList) ? woList : woList?.items || []);
      setSites(Array.isArray(siteList) ? siteList : siteList?.items || []);
      setAlerts(Array.isArray(alertRes) ? alertRes : alertRes?.items || []);
      setOrgs(Array.isArray(orgList) ? orgList : orgList?.items || []);
      setUsers(Array.isArray(userList) ? userList : userList?.items || []);
      setAgreements(Array.isArray(agrList) ? agrList : agrList?.items || []);
    } catch (e) {
      // mantener data previa
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

  // ────────────── Stats de KPI ──────────────
  const stats = useMemo(() => {
    const active = wos.filter((w) => !TERMINAL_STATUSES.includes(w.status));
    const critical = active.filter((w) => w.severity === "critical");
    const slaRisk = active.filter((w) => {
      const sla = w.sla_status || w.sla?.status;
      return sla === "breach" || sla === "at_risk";
    });
    const ballSrs = active.filter((w) => {
      if (w.ball_in_court?.party !== "srs") return false;
      return ballAgeHours(w) >= 6;
    });
    const unassigned = active.filter((w) => {
      const techId = w.assigned_tech_user_id || w.assignment?.tech_user_id;
      return !techId;
    });
    const enRouteOrOnSite = active.filter((w) =>
      ["en_route", "on_site", "in_progress"].includes(w.status)
    );

    return {
      critical: critical.length,
      slaRisk: slaRisk.length,
      ballSrs: ballSrs.length,
      unassigned: unassigned.length,
      activeToday: enRouteOrOnSite.length,
      _total: active.length,
    };
  }, [wos]);

  // ────────────── Predicates de filtro ──────────────
  const filterPredicate = useCallback(
    (w) => {
      if (!activeFilter) return true;
      switch (activeFilter) {
        case "critical":
          return w.severity === "critical";
        case "slaRisk": {
          const sla = w.sla_status || w.sla?.status;
          return sla === "breach" || sla === "at_risk";
        }
        case "ballSrs":
          return w.ball_in_court?.party === "srs" && ballAgeHours(w) >= 6;
        case "unassigned":
          return !(w.assigned_tech_user_id || w.assignment?.tech_user_id);
        case "activeToday":
          return ["en_route", "on_site", "in_progress"].includes(w.status);
        default:
          return true;
      }
    },
    [activeFilter]
  );

  // ────────────── Intervenciones en curso (top 3 horizontal) ──────────────
  const inCurseInterventions = useMemo(() => {
    const active = wos.filter(
      (w) => ACTIVE_STATUSES.includes(w.status) && filterPredicate(w)
    );
    return active
      .sort((a, b) => {
        const dr = severityRank(a.severity) - severityRank(b.severity);
        if (dr !== 0) return dr;
        return ballAgeHours(b) - ballAgeHours(a);
      })
      .slice(0, 3);
  }, [wos, filterPredicate]);

  // ────────────── Historial reciente (grid 4 cols, hasta 8) ──────────────
  const recentHistory = useMemo(() => {
    const filtered = wos.filter(filterPredicate);
    return filtered
      .sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at || 0).getTime();
        const tb = new Date(b.updated_at || b.created_at || 0).getTime();
        return tb - ta;
      })
      .slice(0, 8);
  }, [wos, filterPredicate]);

  // ────────────── Datos para sidebar widgets ──────────────
  const alertsForSidebar = useMemo(() => {
    return alerts
      .map((a) => {
        const woId = a.scope_ref?.work_order_id;
        const wo = woId ? wos.find((w) => w.id === woId) : null;
        // Si hay WO asociado, formatear código legible. Si no, dejar vacío
        // (el widget muestra "—" o el campo se oculta).
        const code = wo ? formatWoCode(wo) : woId ? formatWoCode({ id: woId }) : "";
        return {
          ...a,
          wo_code: code,
          duration: a.age || a.duration || "",
          title: a.kind ? `${a.kind.toUpperCase().replace("_", " ")} · ${wo?.site_name || ""}` : a.title,
          detail: a.detail || a.description,
        };
      })
      .sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  }, [alerts, wos]);

  const agreementsForSidebar = useMemo(() => {
    return agreements
      .map((a) => {
        const client = orgMap[a.client_organization_id];
        const expiresAt = a.expires_at || a.end_date;
        const days = expiresAt
          ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000)
          : null;
        return {
          ...a,
          client_name: client?.name || "—",
          days_to_expire: days,
        };
      })
      .filter((a) => a.days_to_expire != null);
  }, [agreements, orgMap]);

  const summaryStats = useMemo(() => {
    const completedToday = wos.filter((w) => {
      if (!TERMINAL_STATUSES.includes(w.status)) return false;
      const closed = w.closed_at || w.completed_at || w.updated_at;
      if (!closed) return false;
      const t = new Date(closed).getTime();
      return Date.now() - t < 86400000;
    }).length;
    const techs = users.filter((u) => u.memberships?.some((m) => m.space === "tech_field"));
    const techsAvailable = techs.filter((u) => u.is_active !== false).length;
    return {
      completedToday,
      totalActive: stats._total,
      techsAvailable,
      techsTotal: techs.length,
      fleet: 4, // hardcoded por ahora · pendiente /api/fleet
    };
  }, [wos, users, stats._total]);

  const handleDetail = (wo) => navigate(`/srs/ops/${wo.id}`);
  const handleCompliance = (wo) => navigate(`/srs/ops/${wo.id}/report`);

  /* ─────────────────────── Skeleton state ─────────────────────── */
  if (!hasLoadedOnce) {
    return (
      <div className="px-6 py-5 space-y-5">
        {/* KPI strip skeleton · 5 cards */}
        <section className="grid grid-cols-5 gap-px bg-wr-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonKpiCard key={i} />
          ))}
        </section>
        <div className="grid grid-cols-12 gap-5 items-start">
          <div className="col-span-12 lg:col-span-8 space-y-6">
            <section>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonInterventionCardFull key={i} />
                ))}
              </div>
            </section>
            <section>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonInterventionCardMini key={i} />
                ))}
              </div>
            </section>
          </div>
          <aside className="col-span-12 lg:col-span-4 bg-wr-bg border border-wr-border rounded-sm overflow-hidden">
            <SkeletonWidget rows={3} />
            <SkeletonWidget rows={3} />
            <SkeletonWidget rows={2} />
            <SkeletonWidget rows={4} />
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-5 space-y-5">
      {/* KPI strip accionable */}
      <KpiStripV2
        stats={stats}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Grid principal: 8/12 main + 4/12 sidebar (lg: 1440px en config SRS) */}
      <div className="grid grid-cols-12 gap-5 items-start">
        {/* MAIN COLUMN */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Sección: Intervenciones en curso */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <p className="label-caps-v2">Intervenciones en curso</p>
                <span className="font-mono text-[11px] text-wr-text">
                  {inCurseInterventions.length}
                </span>
              </div>
              <button
                onClick={() => navigate("/srs/ops")}
                className="text-[11px] text-wr-amber hover:text-wr-amber-soft transition flex items-center gap-1"
              >
                Ver todas →
              </button>
            </div>
            {inCurseInterventions.length === 0 ? (
              <EmptyState
                icon={activeFilter ? "magniferBug" : "inbox"}
                title={activeFilter ? "Sin intervenciones para el filtro actual" : "Sin intervenciones en curso"}
                action={activeFilter ? { label: "Quitar filtro", onClick: () => setActiveFilter(null) } : null}
              />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {inCurseInterventions.map((wo) => {
                  const site = siteMap[wo.site_id];
                  const techId = wo.assigned_tech_user_id || wo.assignment?.tech_user_id;
                  const tech = techId ? userMap[techId] : null;
                  return (
                    <InterventionCardFull
                      key={wo.id}
                      wo={wo}
                      site={site}
                      tech={tech}
                      onDetail={() => handleDetail(wo)}
                      onCompliance={() => handleCompliance(wo)}
                    />
                  );
                })}
              </div>
            )}
          </section>

          {/* Sección: Historial reciente */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <p className="label-caps-v2">Historial reciente</p>
                <span className="font-mono text-[11px] text-wr-text">
                  {recentHistory.length}
                </span>
              </div>
              <button
                onClick={() => navigate("/srs/ops")}
                className="text-[11px] text-wr-amber hover:text-wr-amber-soft transition flex items-center gap-1"
              >
                Ver todas →
              </button>
            </div>
            {recentHistory.length === 0 ? (
              <EmptyState
                icon={activeFilter ? "magniferBug" : "inbox"}
                title={activeFilter ? "Sin coincidencias para el filtro" : "Sin intervenciones recientes"}
              />
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {recentHistory.map((wo) => {
                  const site = siteMap[wo.site_id];
                  return (
                    <InterventionCardMini
                      key={wo.id}
                      wo={wo}
                      site={site}
                      onClick={() => handleDetail(wo)}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* SIDEBAR DERECHO */}
        <aside className="col-span-12 lg:col-span-4 bg-wr-bg border border-wr-border rounded-sm overflow-hidden">
          <AlertsWidget alerts={alertsForSidebar} />
          <ShieldsWidget agreements={agreementsForSidebar} />
          <WeatherWidget
            sites={sites.filter((s) => {
              const lat = s.lat ?? s.latitude ?? s.location?.lat;
              const lng = s.lng ?? s.longitude ?? s.location?.lng;
              return lat != null && lng != null;
            })}
          />
          <SummaryWidget stats={summaryStats} />
        </aside>
      </div>
    </div>
  );
}
