/**
 * OperationsMap · Mapbox GL JS directo + markers SVG custom.
 *
 * Markers:
 *   - forma por site_type (retail=square, dc=hex, warehouse=triangle,
 *     branch=diamond, office=circle)
 *   - ring color por severity (danger/primary/stone)
 *   - size escala con activity count
 *
 * Click en marker → llama onSiteClick(site) para resaltar card a la derecha.
 * Hover muestra tooltip nativo mínimo.
 */
import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const MAPBOX_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE || "mapbox://styles/mapbox/dark-v11";

mapboxgl.accessToken = MAPBOX_TOKEN;

// SVG shapes by site_type (22x22 viewport)
const SHAPE_PATHS = {
  retail:    "M3 3 h16 v16 h-16 z",                                // square
  dc:        "M11 2 L19 7 L19 15 L11 20 L3 15 L3 7 z",             // hex
  warehouse: "M11 3 L19 19 L3 19 z",                               // triangle
  branch:    "M11 2 L19 11 L11 20 L3 11 z",                        // diamond
  office:    "M11 11 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0",      // circle
  other:     "M11 11 m-7,0 a7,7 0 1,0 14,0 a7,7 0 1,0 -14,0",
};

function severityColor(sev) {
  if (sev === "critical") return { stroke: "#ef4444", fill: "#ef4444" };
  if (sev === "active")   return { stroke: "#D97706", fill: "#D97706" };
  return { stroke: "#78716c", fill: "#44403c" };
}

function siteSeverity(site, sitesWO, alertsBySite) {
  const siteAlerts = alertsBySite[site.id] || [];
  if (siteAlerts.some((a) => a.severity === "critical")) return "critical";
  const wos = sitesWO[site.id] || [];
  if (
    wos.some(
      (w) =>
        ["in_progress", "dispatched", "assigned"].includes(w.status) &&
        w.severity === "critical"
    )
  )
    return "critical";
  if (
    wos.some((w) =>
      ["in_progress", "dispatched", "assigned", "in_closeout"].includes(w.status)
    )
  )
    return "active";
  return "normal";
}

function markerSVG(siteType, sev, count) {
  const { stroke, fill } = severityColor(sev);
  const path = SHAPE_PATHS[siteType] || SHAPE_PATHS.other;
  const pulse = sev === "critical";
  const size = 22;
  const countBadge =
    count && count > 0
      ? `<text x="11" y="13" text-anchor="middle" font-family="JetBrains Mono,ui-monospace,monospace" font-size="8" fill="#fafaf9" font-weight="600">${
          count > 9 ? "9+" : count
        }</text>`
      : "";
  return `
    <svg width="${size}" height="${size}" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" style="overflow:visible;cursor:pointer;">
      ${
        pulse
          ? `<circle cx="11" cy="11" r="14" fill="${fill}" opacity="0.15">
               <animate attributeName="r" from="11" to="17" dur="1.6s" repeatCount="indefinite"/>
               <animate attributeName="opacity" from="0.35" to="0" dur="1.6s" repeatCount="indefinite"/>
             </circle>`
          : ""
      }
      <path d="${path}" fill="${fill}" fill-opacity="0.35" stroke="${stroke}" stroke-width="1.5"/>
      ${countBadge}
    </svg>
  `;
}

export default function OperationsMap({
  sites = [],
  workOrders = [],
  alerts = [],
  selectedSiteId = null,
  onSiteClick = () => {},
  height = 420,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef({});

  const sitesWithCoords = useMemo(
    () => sites.filter((s) => s.lat != null && s.lng != null),
    [sites]
  );

  const sitesWO = useMemo(() => {
    const m = {};
    for (const w of workOrders) {
      if (!w.site_id) continue;
      (m[w.site_id] ||= []).push(w);
    }
    return m;
  }, [workOrders]);

  const alertsBySite = useMemo(() => {
    const m = {};
    for (const a of alerts) {
      const sid = a.scope_ref?.site_id;
      if (sid) (m[sid] ||= []).push(a);
    }
    return m;
  }, [alerts]);

  // init map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current || !MAPBOX_TOKEN) return;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [0, 20],
      zoom: 1.5,
      attributionControl: false,
    });
    mapRef.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false, visualizePitch: false }),
      "top-right"
    );
    mapRef.current.addControl(
      new mapboxgl.AttributionControl({ compact: true }),
      "bottom-right"
    );
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // (re)render markers when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !sitesWithCoords.length) return;

    const onStyleReady = () => {
      // remove stale markers
      for (const key of Object.keys(markersRef.current)) {
        markersRef.current[key].marker.remove();
      }
      markersRef.current = {};

      for (const site of sitesWithCoords) {
        const sev = siteSeverity(site, sitesWO, alertsBySite);
        const activeCount = (sitesWO[site.id] || []).filter((w) =>
          ["in_progress", "dispatched", "assigned", "in_closeout"].includes(w.status)
        ).length;

        const el = document.createElement("div");
        el.innerHTML = markerSVG(site.site_type || "other", sev, activeCount);
        el.style.width = "22px";
        el.style.height = "22px";
        el.style.display = "block";
        el.title = `${site.name} · ${site.country}`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSiteClick(site);
          map.easeTo({ center: [site.lng, site.lat], zoom: Math.max(map.getZoom(), 5), duration: 700 });
        });

        const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
          .setLngLat([site.lng, site.lat])
          .addTo(map);

        markersRef.current[site.id] = { marker, el, sev };
      }

      // fit bounds if more than 1
      if (sitesWithCoords.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        sitesWithCoords.forEach((s) => bounds.extend([s.lng, s.lat]));
        map.fitBounds(bounds, { padding: 50, maxZoom: 6, duration: 0 });
      } else if (sitesWithCoords.length === 1) {
        map.setCenter([sitesWithCoords[0].lng, sitesWithCoords[0].lat]);
        map.setZoom(5);
      }
    };

    if (map.isStyleLoaded()) onStyleReady();
    else map.once("load", onStyleReady);
  }, [sitesWithCoords, sitesWO, alertsBySite, onSiteClick]);

  // highlight selected marker
  useEffect(() => {
    for (const [siteId, { el }] of Object.entries(markersRef.current)) {
      if (siteId === selectedSiteId) {
        el.style.filter = "drop-shadow(0 0 8px #D97706)";
        el.style.transform = "scale(1.3)";
        el.style.transition = "transform 200ms ease-out, filter 200ms ease-out";
      } else {
        el.style.filter = "";
        el.style.transform = "";
      }
    }
  }, [selectedSiteId]);

  if (!MAPBOX_TOKEN) {
    return (
      <section
        style={{ height }}
        className="bg-surface-raised border border-danger/40 rounded-md flex items-center justify-center px-6"
      >
        <div className="text-danger font-mono text-xs uppercase tracking-widest-srs text-center">
          Mapbox token ausente · VITE_MAPBOX_TOKEN no definido en build
        </div>
      </section>
    );
  }

  return (
    <section className="bg-surface-raised border border-surface-border rounded-md overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-surface-border">
        <div className="flex items-center gap-3">
          <span className="label-caps">Mapa operativo</span>
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
            {sitesWithCoords.length} sitios
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest-srs">
          <span className="flex items-center gap-1.5 text-danger">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#ef4444]" />
            critico
          </span>
          <span className="flex items-center gap-1.5 text-primary-light">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#D97706]" />
            activo
          </span>
          <span className="flex items-center gap-1.5 text-text-tertiary">
            <span className="inline-block w-2 h-2 rounded-sm bg-[#44403c] border border-[#78716c]" />
            normal
          </span>
        </div>
      </header>
      <div ref={containerRef} style={{ height }} className="bg-surface-base" />
    </section>
  );
}
