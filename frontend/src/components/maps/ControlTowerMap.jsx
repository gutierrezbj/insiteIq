import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ── Dark tile layer ──────────────────────────────────────────────── */
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://osm.org">OSM</a>';

/* ── Status config ────────────────────────────────────────────────── */
const STATUS = {
  assigned:    { label: "Assigned",    color: "#6B7280", bg: "#374151" },
  accepted:    { label: "Accepted",    color: "#06B6D4", bg: "#164E63" },
  en_route:    { label: "En Route",    color: "#EAB308", bg: "#713F12" },
  on_site:     { label: "On Site",     color: "#A855F7", bg: "#581C87" },
  in_progress: { label: "In Progress", color: "#D97706", bg: "#78350F" },
  completed:   { label: "Completed",   color: "#22C55E", bg: "#14532D" },
};

/* ── Labeled marker (SkyPro style) ────────────────────────────────── */
function labeledIcon(text, color, pulse = false) {
  const pulseRing = pulse
    ? `<span style="position:absolute;top:-3px;left:-3px;right:-3px;bottom:-3px;border:2px solid ${color};border-radius:12px;animation:iiq-pulse 2s infinite;opacity:0.6"></span>`
    : "";
  const html = `
    <div style="position:relative;display:flex;align-items:center;gap:0;white-space:nowrap;cursor:pointer">
      ${pulseRing}
      <span style="display:inline-flex;align-items:center;gap:4px;background:${color};color:#fff;font-size:11px;font-weight:600;font-family:'JetBrains Mono',monospace;padding:3px 8px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.15);letter-spacing:0.02em">
        <span style="width:6px;height:6px;border-radius:50%;background:#fff;opacity:0.9;flex-shrink:0"></span>
        ${text}
      </span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "",
    iconSize: [0, 0],
    iconAnchor: [0, 10],
  });
}

/* ── Site dot (smaller, subtle) ───────────────────────────────────── */
function siteDotIcon(hasActive) {
  const color = hasActive ? "#D97706" : "#78716C";
  const size = hasActive ? 10 : 7;
  const html = `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:1.5px solid #1C1917;box-shadow:0 0 ${hasActive ? "8" : "4"}px ${color}40"></div>`;
  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/* ── Tech dot icon ────────────────────────────────────────────────── */
function techDotIcon(isBusy) {
  const color = isBusy ? "#3B82F6" : "#22C55E";
  const html = `
    <div style="position:relative">
      <div style="width:10px;height:10px;border-radius:50%;background:${color};border:1.5px solid #1C1917;box-shadow:0 0 6px ${color}60"></div>
      ${!isBusy ? `<div style="position:absolute;top:-2px;left:-2px;width:14px;height:14px;border-radius:50%;border:1.5px solid ${color};opacity:0.4;animation:iiq-pulse 3s infinite"></div>` : ""}
    </div>
  `;
  return L.divIcon({ html, className: "", iconSize: [10, 10], iconAnchor: [5, 5] });
}

/* ── Inject keyframes once ────────────────────────────────────────── */
if (typeof document !== "undefined" && !document.getElementById("iiq-map-css")) {
  const style = document.createElement("style");
  style.id = "iiq-map-css";
  style.textContent = `
    @keyframes iiq-pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:0;transform:scale(1.6)} }
    .iiq-map-tooltip { background:#1C1917!important; border:1px solid #44403C!important; border-radius:8px!important; padding:0!important; box-shadow:0 8px 30px rgba(0,0,0,0.6)!important; }
    .iiq-map-tooltip .leaflet-popup-tip { background:#1C1917!important; border-color:#44403C!important; }
    .iiq-map-tooltip .leaflet-popup-close-button { color:#A8A29E!important; }
    .leaflet-popup-content { margin:0!important; }
  `;
  document.head.appendChild(style);
}

export default function ControlTowerMap({ sites = [], technicians = [], interventions = [], onSelectIntervention }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layersRef = useRef({ sites: null, techs: null, lines: null, interventions: null });

  /* ── Lookups ────────────────────────────────────────────────────── */
  const activeInterventions = useMemo(() =>
    interventions.filter((i) =>
      ["assigned", "accepted", "en_route", "on_site", "in_progress"].includes(i.status)
    ), [interventions]);

  const siteMap = useMemo(() => {
    const m = {};
    sites.forEach((s) => { const id = s._id || s.id; if (id) m[id] = s; });
    return m;
  }, [sites]);

  const techMap = useMemo(() => {
    const m = {};
    technicians.forEach((t) => { const id = t._id || t.id; if (id) m[id] = t; });
    return m;
  }, [technicians]);

  /* Map: intervention → site coords */
  const intvSiteCoords = useMemo(() => {
    const m = {};
    activeInterventions.forEach((intv) => {
      const site = siteMap[intv.site_id];
      if (site?.location?.coordinates) {
        m[intv.id || intv._id] = [site.location.coordinates[1], site.location.coordinates[0]];
      }
    });
    return m;
  }, [activeInterventions, siteMap]);

  /* ── Initialize map ─────────────────────────────────────────────── */
  useEffect(() => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [30, 0],
      zoom: 3,
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: true,
    });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map);
    mapInstance.current = map;
    return () => { map.remove(); mapInstance.current = null; };
  }, []);

  /* ── Update markers ─────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear
    Object.values(layersRef.current).forEach((lg) => lg && map.removeLayer(lg));

    const siteLg = L.layerGroup();
    const techLg = L.layerGroup();
    const lineLg = L.layerGroup();
    const intvLg = L.layerGroup();
    const bounds = [];

    // ── Site dots ──
    sites.forEach((site) => {
      const coords = site.location?.coordinates;
      if (!coords || coords.length < 2) return;
      const ll = [coords[1], coords[0]];
      bounds.push(ll);
      const siteId = site._id || site.id;
      const hasActive = activeInterventions.some((i) => i.site_id === siteId);

      const popup = `
        <div style="padding:12px;min-width:200px;font-family:system-ui;color:#E7E5E4">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#A8A29E;font-family:'JetBrains Mono',monospace;margin-bottom:6px">SITE</div>
          <div style="font-weight:700;font-size:14px;margin-bottom:2px">${site.name}</div>
          <div style="color:#A8A29E;font-size:12px">${site.client || ""}</div>
          <div style="color:#78716C;font-size:12px;margin-top:2px">${site.city}, ${site.country}</div>
          ${site.contact?.phone ? `<div style="color:#78716C;font-size:11px;margin-top:6px">${site.contact.phone}</div>` : ""}
          ${hasActive ? `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #44403C;color:#D97706;font-size:12px;font-weight:500">${activeInterventions.filter(i=>i.site_id===siteId).length} active intervention(s)</div>` : ""}
        </div>
      `;
      L.marker(ll, { icon: siteDotIcon(hasActive) })
        .bindPopup(popup, { className: "iiq-map-tooltip", maxWidth: 280 })
        .addTo(siteLg);
    });

    // ── Intervention labeled markers (SkyPro style) ──
    activeInterventions.forEach((intv) => {
      const ll = intvSiteCoords[intv.id || intv._id];
      if (!ll) return;

      const st = STATUS[intv.status] || STATUS.assigned;
      const isUrgent = intv.priority === "emergency" || intv.priority === "high";
      const icon = labeledIcon(intv.reference, st.color, isUrgent);

      // Rich popup
      const techName = intv.technician_name || "Unassigned";
      const siteName = intv.site_name || "—";
      const elapsed = intv.sla?.started_at
        ? (() => {
            const ms = Date.now() - new Date(intv.sla.started_at).getTime();
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            return `${h}h ${m}m`;
          })()
        : "—";
      const budget = intv.sla?.resolution_minutes
        ? `${Math.floor(intv.sla.resolution_minutes / 60)}h ${intv.sla.resolution_minutes % 60}m`
        : "—";

      const popup = `
        <div style="padding:14px;min-width:260px;font-family:system-ui;color:#E7E5E4">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:700;color:${st.color}">${intv.reference}</span>
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;padding:2px 8px;border-radius:6px;background:${st.bg};color:${st.color}">${st.label}</span>
          </div>
          ${intv.title ? `<div style="font-size:13px;font-weight:600;margin-bottom:8px;line-height:1.3">${intv.title}</div>` : ""}
          <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px;font-size:12px;color:#A8A29E">
            <span style="color:#78716C">Site</span><span style="color:#E7E5E4">${siteName}</span>
            <span style="color:#78716C">Tech</span><span style="color:#E7E5E4">${techName}</span>
            <span style="color:#78716C">Priority</span><span style="color:${intv.priority === "emergency" ? "#EF4444" : intv.priority === "high" ? "#F59E0B" : "#A8A29E"};text-transform:uppercase;font-weight:600;font-size:11px">${intv.priority}</span>
            <span style="color:#78716C">Elapsed</span><span style="font-family:'JetBrains Mono',monospace;color:#E7E5E4">${elapsed}</span>
            <span style="color:#78716C">Budget</span><span style="font-family:'JetBrains Mono',monospace;color:#E7E5E4">${budget}</span>
          </div>
          ${intv.timeline?.length ? (() => {
            const last = intv.timeline[intv.timeline.length - 1];
            return `<div style="margin-top:10px;padding-top:8px;border-top:1px solid #44403C;font-size:11px;color:#78716C">
              Last: <span style="color:#A8A29E">${last.note || last.event}</span>
            </div>`;
          })() : ""}
        </div>
      `;

      const marker = L.marker(ll, { icon, zIndexOffset: 1000 })
        .bindPopup(popup, { className: "iiq-map-tooltip", maxWidth: 320 })
        .addTo(intvLg);

      marker.on("click", () => {
        if (onSelectIntervention) onSelectIntervention(intv);
      });
    });

    // ── Tech markers + connection lines ──
    technicians.forEach((tech) => {
      const coords = tech.location?.coordinates;
      if (!coords || coords.length < 2) return;
      const tll = [coords[1], coords[0]];
      bounds.push(tll);

      const techId = tech._id || tech.id;
      const assignment = activeInterventions.find((i) => i.technician_id === techId);
      const isBusy = !!assignment;

      // Tech popup
      const popup = `
        <div style="padding:12px;min-width:200px;font-family:system-ui;color:#E7E5E4">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#A8A29E;font-family:'JetBrains Mono',monospace;margin-bottom:6px">TECHNICIAN</div>
          <div style="font-weight:700;font-size:14px;margin-bottom:2px">${tech.name}</div>
          <div style="color:#78716C;font-size:12px">${tech.city}, ${tech.country}</div>
          <div style="color:#78716C;font-size:11px;margin-top:4px">${(tech.skills || []).slice(0, 4).join(" / ")}</div>
          ${tech.rating?.average ? `<div style="color:#D97706;font-size:12px;margin-top:4px">${tech.rating.average} / 5 (${tech.rating.count} reviews)</div>` : ""}
          ${assignment ? `
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #44403C">
              <div style="color:${STATUS[assignment.status]?.color || "#6B7280"};font-size:12px;font-weight:600">${assignment.reference} — ${STATUS[assignment.status]?.label || assignment.status}</div>
              <div style="color:#A8A29E;font-size:11px;margin-top:2px">${assignment.site_name || ""}</div>
            </div>
          ` : '<div style="margin-top:6px;color:#22C55E;font-size:11px;font-weight:500">Available</div>'}
        </div>
      `;

      L.marker(tll, { icon: techDotIcon(isBusy) })
        .bindPopup(popup, { className: "iiq-map-tooltip", maxWidth: 280 })
        .addTo(techLg);

      // Line to site
      if (assignment) {
        const sll = intvSiteCoords[assignment.id || assignment._id];
        if (sll) {
          const stColor = STATUS[assignment.status]?.color || "#6B7280";
          L.polyline([tll, sll], {
            color: stColor,
            weight: 2,
            dashArray: assignment.status === "en_route" ? "8 6" : null,
            opacity: 0.5,
          }).addTo(lineLg);
        }
      }
    });

    lineLg.addTo(map);
    siteLg.addTo(map);
    intvLg.addTo(map);
    techLg.addTo(map);

    layersRef.current = { sites: siteLg, techs: techLg, lines: lineLg, interventions: intvLg };

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 5);
    }
  }, [sites, technicians, interventions, activeInterventions, siteMap, intvSiteCoords, onSelectIntervention]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height: "100%" }}
    />
  );
}
