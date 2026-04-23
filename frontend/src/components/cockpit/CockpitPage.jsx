/**
 * CockpitPage · vista operativa compartida SRS + Client.
 *
 * Layout:
 *   [KPIs 5]
 *   [ Mapa Mapbox  2/3 | InterventionCards scrolleable 1/3 ]
 *   [ Drawer 480px slide-in on "mas detalles" ]
 *
 * Data pre-cargada aquí y distribuida a children para evitar N+1 fetches.
 * Refresh 45s. Polling suave; un WebSocket vendra en una siguiente iteracion.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import KpiStrip from "./KpiStrip";
import OperationsMap from "./OperationsMap";
import InterventionCard from "./InterventionCard";
import WODetailDrawer from "./WODetailDrawer";

const ACTIVE_STATUSES = ["assigned", "dispatched", "in_progress", "in_closeout", "en_route", "on_site"];

function severityRank(s) {
  return { critical: 0, high: 1, medium: 2, low: 3 }[s] ?? 9;
}

function ballAgeHours(wo) {
  const since = wo?.ball_in_court?.since;
  if (!since) return 0;
  return (Date.now() - new Date(since).getTime()) / 36e5;
}

export default function CockpitPage({ scope = "srs" }) {
  const isSrs = scope === "srs";
  const isClient = scope === "client";
  const baseLinkPrefix = isSrs ? "/srs" : isClient ? "/client" : "/tech";

  const [wos, setWos] = useState([]);
  const [sites, setSites] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null); // WO seleccionado (card highlight)
  const [drawerWo, setDrawerWo] = useState(null); // WO en drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [woList, siteList, alertRes, orgList, userList] = await Promise.all([
        api.get("/work-orders?limit=500"),
        api.get("/sites?limit=500"),
        api.get("/alerts?status_eq=active&limit=200").catch(() => ({ items: [] })),
        api.get("/organizations?limit=500").catch(() => []),
        api.get("/users?limit=500").catch(() => []),
      ]);
      const woItems = Array.isArray(woList) ? woList : woList?.items || [];
      const siteItems = Array.isArray(siteList) ? siteList : siteList?.items || [];
      const alertItems = Array.isArray(alertRes) ? alertRes : alertRes?.items || [];
      const orgItems = Array.isArray(orgList) ? orgList : orgList?.items || [];
      const userItems = Array.isArray(userList) ? userList : userList?.items || [];
      setWos(woItems);
      setSites(siteItems);
      setAlerts(alertItems);
      setOrgs(orgItems);
      setUsers(userItems);
    } catch (e) {
      // keep previous data
    }
  }, []);

  useEffect(() => {
    load();
    const int = setInterval(load, 45000);
    return () => clearInterval(int);
  }, [load]);

  const siteMap   = useMemo(() => Object.fromEntries(sites.map((s) => [s.id, s])), [sites]);
  const orgMap    = useMemo(() => Object.fromEntries(orgs.map((o)  => [o.id, o])), [orgs]);
  const userMap   = useMemo(() => Object.fromEntries(users.map((u) => [u.id, u])), [users]);

  // alerts indexed for card-inline display
  const alertsByWo = useMemo(() => {
    const m = {};
    for (const a of alerts) {
      const woId = a.scope_ref?.work_order_id;
      if (woId) (m[woId] ||= []).push(a);
    }
    return m;
  }, [alerts]);
  const alertsBySite = useMemo(() => {
    const m = {};
    for (const a of alerts) {
      const sid = a.scope_ref?.site_id;
      if (sid) (m[sid] ||= []).push(a);
    }
    return m;
  }, [alerts]);
  const alertsByTech = useMemo(() => {
    const m = {};
    for (const a of alerts) {
      const tid = a.scope_ref?.tech_user_id;
      if (tid) (m[tid] ||= []).push(a);
    }
    return m;
  }, [alerts]);

  // intervenciones activas ordenadas por urgencia
  const activeInterventions = useMemo(() => {
    const active = wos.filter((w) => ACTIVE_STATUSES.includes(w.status));
    return active.sort((a, b) => {
      // Primero severity, luego ball age descendente
      const dr = severityRank(a.severity) - severityRank(b.severity);
      if (dr !== 0) return dr;
      return ballAgeHours(b) - ballAgeHours(a);
    });
  }, [wos]);

  // para cada intervención, reunir alertas relevantes
  const alertsForWo = useCallback(
    (wo) => {
      const fromWo   = alertsByWo[wo.id] || [];
      const fromSite = (wo.site_id && alertsBySite[wo.site_id]) || [];
      const techId   = wo.assigned_tech_user_id || wo.assignment?.tech_user_id;
      const fromTech = (techId && alertsByTech[techId]) || [];
      // dedupe by id
      const seen = new Set();
      const out = [];
      for (const a of [...fromWo, ...fromSite, ...fromTech]) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          out.push(a);
        }
      }
      return out.sort(
        (a, b) => ({ critical: 0, warning: 1, info: 2 }[a.severity] ?? 9)
               - ({ critical: 0, warning: 1, info: 2 }[b.severity] ?? 9)
      );
    },
    [alertsByWo, alertsBySite, alertsByTech]
  );

  // map click handler
  const handleSiteClick = useCallback(
    (site) => {
      // encuentra el WO más crítico de ese site y lo selecciona
      const woAtSite = activeInterventions.find((w) => w.site_id === site.id);
      if (woAtSite) {
        setSelected(woAtSite.id);
        // scroll la card a la vista
        setTimeout(() => {
          const el = document.getElementById(`card-${woAtSite.id}`);
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      }
    },
    [activeInterventions]
  );

  const selectedSiteId = useMemo(() => {
    const w = activeInterventions.find((x) => x.id === selected);
    return w?.site_id || null;
  }, [selected, activeInterventions]);

  const openDrawer = (wo) => {
    setDrawerWo(wo);
    setDrawerOpen(true);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setDrawerWo(null), 200);
  };

  const handleAlertAction = async (alertId, action) => {
    try {
      if (action === "ack") await api.post(`/alerts/${alertId}/ack`);
      else if (action === "resolve") await api.post(`/alerts/${alertId}/resolve`, { resolution_note: null });
      await load();
    } catch (e) {
      // no-op (puede ser 403 si client sin permisos)
    }
  };

  return (
    <div className="px-4 md:px-6 py-4 md:py-5 max-w-wide space-y-4">
      <KpiStrip workOrders={wos} alerts={alerts} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="xl:col-span-2">
          <OperationsMap
            sites={sites}
            workOrders={wos}
            alerts={alerts}
            selectedSiteId={selectedSiteId}
            onSiteClick={handleSiteClick}
            height={560}
          />
        </div>

        <aside className="bg-surface-raised border border-surface-border rounded-md overflow-hidden">
          <header className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
            <div className="flex items-center gap-3">
              <span className="label-caps">Intervenciones en marcha</span>
              <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary tabular-nums">
                {activeInterventions.length}
              </span>
            </div>
            <button
              onClick={load}
              className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light transition-colors duration-fast"
            >
              refrescar
            </button>
          </header>
          <div className="p-2 space-y-2 max-h-[560px] overflow-y-auto">
            {activeInterventions.length === 0 && (
              <div className="py-8 text-center font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
                sin intervenciones activas
              </div>
            )}
            {activeInterventions.map((w) => {
              const site = siteMap[w.site_id];
              const client = orgMap[w.organization_id];
              const techId = w.assigned_tech_user_id || w.assignment?.tech_user_id;
              const tech = techId ? userMap[techId] : null;
              return (
                <div id={`card-${w.id}`} key={w.id}>
                  <InterventionCard
                    wo={w}
                    site={site}
                    client={client}
                    tech={tech}
                    alerts={alertsForWo(w)}
                    selected={selected === w.id}
                    onSelect={(x) => setSelected(x.id)}
                    onMoreDetails={openDrawer}
                  />
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <WODetailDrawer
        wo={drawerWo}
        site={drawerWo ? siteMap[drawerWo.site_id] : null}
        client={drawerWo ? orgMap[drawerWo.organization_id] : null}
        tech={
          drawerWo
            ? userMap[drawerWo.assigned_tech_user_id || drawerWo.assignment?.tech_user_id]
            : null
        }
        alerts={drawerWo ? alertsForWo(drawerWo) : []}
        open={drawerOpen}
        onClose={closeDrawer}
        onAlertAction={handleAlertAction}
        baseLinkPrefix={baseLinkPrefix}
      />
    </div>
  );
}
