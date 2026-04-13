import { useEffect, useRef, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ── Custom marker SVGs (inline, no external assets) ──────────────── */
function svgIcon(color, glyph, size = 28) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" fill="${color}" stroke="#0C0A09" stroke-width="1.5" opacity="0.9"/>
    <text x="${size / 2}" y="${size / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="white" font-size="12" font-family="sans-serif">${glyph}</text>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const SITE_ICON = svgIcon("#D97706", "S");       // amber
const TECH_ICON = svgIcon("#16A34A", "T");        // green
const TECH_BUSY_ICON = svgIcon("#2563EB", "T");   // blue (en route / on_site)

/* ── Dark tile layer (matches Nucleus aesthetic) ──────────────────── */
const TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://osm.org">OSM</a>';

/* ── Status labels ────────────────────────────────────────────────── */
const STATUS_LABEL = {
  assigned: "Assigned",
  accepted: "Accepted",
  en_route: "En Route",
  on_site: "On Site",
  in_progress: "In Progress",
};

export default function ControlTowerMap({ sites = [], technicians = [], interventions = [] }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const layersRef = useRef({ sites: null, techs: null, lines: null });

  /* ── Build lookup maps ──────────────────────────────────────────── */
  const { activeInterventions, techToSite } = useMemo(() => {
    const active = interventions.filter((i) =>
      ["assigned", "accepted", "en_route", "on_site", "in_progress"].includes(i.status)
    );
    const t2s = {};
    active.forEach((i) => {
      if (i.technician_id && i.site_id) {
        t2s[i.technician_id] = {
          siteId: i.site_id,
          reference: i.reference,
          status: i.status,
          title: i.title || i.description?.slice(0, 60),
          siteName: i.site_name,
        };
      }
    });
    return { activeInterventions: active, techToSite: t2s };
  }, [interventions]);

  const siteMap = useMemo(() => {
    const m = {};
    sites.forEach((s) => {
      const id = s._id || s.id;
      if (id) m[id] = s;
    });
    return m;
  }, [sites]);

  /* ── Initialize map ─────────────────────────────────────────────── */
  useEffect(() => {
    if (mapInstance.current) return;
    const map = L.map(mapRef.current, {
      center: [25, -10],
      zoom: 2,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  /* ── Update markers when data changes ───────────────────────────── */
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    // Clear previous layers
    Object.values(layersRef.current).forEach((lg) => lg && map.removeLayer(lg));

    const siteMarkers = L.layerGroup();
    const techMarkers = L.layerGroup();
    const lineGroup = L.layerGroup();
    const bounds = [];

    // ── Site markers ──
    sites.forEach((site) => {
      const coords = site.location?.coordinates;
      if (!coords || coords.length < 2) return;
      const latlng = [coords[1], coords[0]]; // GeoJSON is [lng, lat]
      bounds.push(latlng);
      const activeCount = interventions.filter(
        (i) =>
          (i.site_id === (site._id || site.id)) &&
          ["assigned", "accepted", "en_route", "on_site", "in_progress"].includes(i.status)
      ).length;
      const popup = `
        <div style="font-family:system-ui;font-size:12px;min-width:160px">
          <div style="font-weight:600;margin-bottom:4px">${site.name}</div>
          <div style="color:#888">${site.client || ""}</div>
          <div style="color:#888">${site.city}, ${site.country}</div>
          ${activeCount ? `<div style="color:#D97706;margin-top:4px;font-weight:500">${activeCount} active WO${activeCount > 1 ? "s" : ""}</div>` : ""}
        </div>
      `;
      L.marker(latlng, { icon: SITE_ICON }).bindPopup(popup).addTo(siteMarkers);
    });

    // ── Technician markers + lines to assigned sites ──
    technicians.forEach((tech) => {
      const coords = tech.location?.coordinates;
      if (!coords || coords.length < 2) return;
      const techLatLng = [coords[1], coords[0]];
      bounds.push(techLatLng);

      const techId = tech._id || tech.id;
      const assignment = techToSite[techId];
      const icon = assignment ? TECH_BUSY_ICON : TECH_ICON;

      let popup = `
        <div style="font-family:system-ui;font-size:12px;min-width:160px">
          <div style="font-weight:600;margin-bottom:4px">${tech.name}</div>
          <div style="color:#888">${tech.city}, ${tech.country}</div>
          <div style="color:#888">${(tech.skills || []).slice(0, 3).join(", ")}</div>
      `;

      if (assignment) {
        popup += `
          <div style="border-top:1px solid #333;margin-top:6px;padding-top:6px">
            <div style="color:#60A5FA;font-weight:500">${assignment.reference} — ${STATUS_LABEL[assignment.status] || assignment.status}</div>
            <div style="color:#aaa;font-size:11px">${assignment.siteName || ""}</div>
            ${assignment.title ? `<div style="color:#aaa;font-size:11px;margin-top:2px">${assignment.title}</div>` : ""}
          </div>
        `;

        // Draw line from tech to site
        const site = siteMap[assignment.siteId];
        if (site?.location?.coordinates) {
          const siteLatLng = [site.location.coordinates[1], site.location.coordinates[0]];
          const statusColors = {
            assigned: "#6B7280",
            accepted: "#06B6D4",
            en_route: "#EAB308",
            on_site: "#8B5CF6",
            in_progress: "#D97706",
          };
          L.polyline([techLatLng, siteLatLng], {
            color: statusColors[assignment.status] || "#6B7280",
            weight: 2,
            dashArray: assignment.status === "en_route" ? "8 6" : null,
            opacity: 0.7,
          }).addTo(lineGroup);
        }
      }

      popup += "</div>";
      L.marker(techLatLng, { icon }).bindPopup(popup).addTo(techMarkers);
    });

    lineGroup.addTo(map);
    siteMarkers.addTo(map);
    techMarkers.addTo(map);

    layersRef.current = { sites: siteMarkers, techs: techMarkers, lines: lineGroup };

    // Fit bounds
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 5);
    }
  }, [sites, technicians, interventions, techToSite, siteMap]);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg border border-surface-border overflow-hidden"
      style={{ height: 420 }}
    />
  );
}
