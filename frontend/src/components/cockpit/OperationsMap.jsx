/**
 * OperationsMap · Leaflet-powered map for the cockpit (Z-d).
 *
 * Markers colored by site activity:
 *   - critical: has active WO with severity critical or alerta critical → danger red
 *   - active:   has in_progress/dispatched/assigned WO → amber
 *   - normal:   has only closed WOs or no WOs → stone
 *
 * Clicking a marker opens a popup with site summary + link to detail page.
 * Using default tiles from OpenStreetMap — free, no API key needed.
 * Dark-style tiles via Stadia Alidade Smooth Dark to match war-room.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { api } from "../../lib/api";

const STATUS_PALETTE = {
  critical: { color: "#dc2626", fill: "#dc2626", weight: 2 }, // danger-red
  active:   { color: "#D97706", fill: "#D97706", weight: 2 }, // amber-600
  normal:   { color: "#78716c", fill: "#44403c", weight: 1.5 }, // stone-500 / 700
};

function siteStatus(site, sitesWO, alertsBySite) {
  // Check alerts first
  const siteAlerts = alertsBySite[site.id] || [];
  if (siteAlerts.some((a) => a.severity === "critical")) return "critical";

  // Then WOs
  const wos = sitesWO[site.id] || [];
  const hasCritical = wos.some(
    (w) =>
      ["in_progress", "dispatched", "assigned"].includes(w.status) &&
      w.severity === "critical"
  );
  if (hasCritical) return "critical";
  const hasActive = wos.some((w) =>
    ["in_progress", "dispatched", "assigned", "in_closeout"].includes(w.status)
  );
  if (hasActive) return "active";
  return "normal";
}

function SitePopup({ site, wos, baseLinkPrefix }) {
  const active = wos.filter((w) =>
    ["in_progress", "dispatched", "assigned", "in_closeout"].includes(w.status)
  );
  return (
    <div className="font-body">
      <div className="label-caps mb-1">{site.site_type || "site"}</div>
      <div className="font-display text-base text-text-primary leading-tight mb-1">
        {site.name}
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary mb-2">
        {site.code} · {site.country}
        {site.city ? ` · ${site.city}` : ""}
      </div>
      {active.length > 0 ? (
        <div className="space-y-1 mb-2">
          {active.slice(0, 3).map((w) => (
            <Link
              key={w.id}
              to={`${baseLinkPrefix}/ops/${w.id}`}
              className="block text-xs text-text-secondary hover:text-primary-light"
            >
              <span className="font-mono text-[10px] uppercase tracking-widest-srs">
                {w.reference} · {w.status}
              </span>
              <br />
              <span className="font-body">{w.title}</span>
            </Link>
          ))}
          {active.length > 3 && (
            <div className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
              +{active.length - 3} mas
            </div>
          )}
        </div>
      ) : (
        <div className="text-text-tertiary text-xs font-mono uppercase tracking-widest-srs mb-2">
          sin WOs activas
        </div>
      )}
      <Link
        to={`${baseLinkPrefix}/sites/${site.id}`}
        className="font-mono text-[10px] uppercase tracking-widest-srs text-primary-light hover:text-primary inline-block"
      >
        Ver sitio →
      </Link>
    </div>
  );
}

export default function OperationsMap({ baseLinkPrefix = "/srs", height = 420 }) {
  const [sites, setSites] = useState([]);
  const [wos, setWos] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [siteList, woList, alertList] = await Promise.all([
        api.get("/sites?limit=500"),
        api.get("/work-orders?limit=500"),
        api.get("/alerts?status_eq=active&limit=100"),
      ]);
      setSites(
        (Array.isArray(siteList) ? siteList : siteList?.items || []).filter(
          (s) => s.lat != null && s.lng != null
        )
      );
      setWos(Array.isArray(woList) ? woList : woList?.items || []);
      setAlerts(alertList?.items || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const int = setInterval(load, 60000);
    return () => clearInterval(int);
  }, []);

  const sitesWO = useMemo(() => {
    const m = {};
    for (const w of wos) {
      if (!w.site_id) continue;
      (m[w.site_id] ||= []).push(w);
    }
    return m;
  }, [wos]);

  const alertsBySite = useMemo(() => {
    const m = {};
    for (const a of alerts) {
      const sid = a.scope_ref?.site_id;
      if (sid) (m[sid] ||= []).push(a);
    }
    return m;
  }, [alerts]);

  // Auto-center: mean of all site coords or fallback to Atlantic
  const center = useMemo(() => {
    if (sites.length === 0) return [20, -20];
    const lat = sites.reduce((s, x) => s + x.lat, 0) / sites.length;
    const lng = sites.reduce((s, x) => s + x.lng, 0) / sites.length;
    return [lat, lng];
  }, [sites]);

  return (
    <section className="bg-surface-raised border border-surface-border rounded-md overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-overlay/40">
        <div className="flex items-center gap-3">
          <span className="label-caps">Mapa operativo</span>
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
            {loading ? "…" : `${sites.length} sitios`}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest-srs">
          <span className="flex items-center gap-1 text-danger">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: STATUS_PALETTE.critical.fill }}
            />
            critico
          </span>
          <span className="flex items-center gap-1 text-primary-light">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: STATUS_PALETTE.active.fill }}
            />
            activo
          </span>
          <span className="flex items-center gap-1 text-text-tertiary">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: STATUS_PALETTE.normal.fill }}
            />
            normal
          </span>
        </div>
      </header>
      <div style={{ height }} className="relative bg-surface-base">
        {sites.length > 0 && (
          <MapContainer
            center={center}
            zoom={2}
            scrollWheelZoom
            style={{ height: "100%", width: "100%" }}
            className="bg-surface-base"
          >
            <TileLayer
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            />
            {sites.map((s) => {
              const stat = siteStatus(s, sitesWO, alertsBySite);
              const palette = STATUS_PALETTE[stat];
              const woList = sitesWO[s.id] || [];
              return (
                <CircleMarker
                  key={s.id}
                  center={[s.lat, s.lng]}
                  radius={stat === "critical" ? 9 : stat === "active" ? 7 : 5}
                  pathOptions={{
                    color: palette.color,
                    fillColor: palette.fill,
                    fillOpacity: stat === "normal" ? 0.55 : 0.8,
                    weight: palette.weight,
                  }}
                >
                  <Popup>
                    <SitePopup
                      site={s}
                      wos={woList}
                      baseLinkPrefix={baseLinkPrefix}
                    />
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        )}
        {loading && sites.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            cargando mapa…
          </div>
        )}
        {!loading && sites.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            sin sitios con coords
          </div>
        )}
      </div>
    </section>
  );
}
