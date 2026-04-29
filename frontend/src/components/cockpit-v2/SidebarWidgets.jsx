/**
 * SidebarWidgets — los 4 widgets del sidebar derecho del Cockpit v2
 *
 * Extraído 1:1 de mocks/insiteiq_cockpit_srs_dark_v2_static.html (líneas 410-582).
 *
 * Exporta:
 *   - <AlertsWidget alerts={...} />
 *   - <ShieldsWidget agreements={...} />
 *   - <WeatherWidget activeWoCodes={...} cities={...} current={...} />
 *   - <SummaryWidget stats={...} />
 *
 * Cada widget tiene la misma estructura visual:
 *   - Header (px-5 py-3) con label-caps + counter/action a la derecha
 *   - Border-bottom srs-border separa widgets
 */

import { useEffect, useMemo, useState } from "react";
import { Icon, ICONS } from "../../lib/icons";
import { fetchWeatherFor, formatTemp } from "../../lib/weather";

/* ─────────────────────────────────────────────────────────────── */
/* AlertsWidget                                                    */
/* ─────────────────────────────────────────────────────────────── */

export function AlertsWidget({ alerts = [] }) {
  // Solo mostramos las 3 más críticas/recientes
  const shown = alerts.slice(0, 3);

  return (
    <section className="border-b border-wr-border">
      <header className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-wr-red" />
          <p className="label-caps-v2" style={{ color: "#DC2626" }}>
            Alertas operativas
          </p>
        </div>
        <button
          className="text-wr-text-dim hover:text-wr-amber transition"
          aria-label="Refrescar alertas"
        >
          <Icon icon={ICONS.refresh} size={13} />
        </button>
      </header>
      <div className="px-5 pb-4 space-y-2">
        {shown.length === 0 ? (
          <p className="text-[11px] text-wr-text-dim italic py-2">Sin alertas activas</p>
        ) : (
          shown.map((a, idx) => {
            const sev = a.severity || "warning";
            const color = sev === "critical" ? "#DC2626" : sev === "warning" ? "#F59E0B" : "#06B6D4";
            return (
              <div
                key={a.id || idx}
                className="p-3"
                style={{ background: `${color}0D`, borderLeft: `2px solid ${color}` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-mono text-[10px]"
                    style={{ color, fontWeight: 600 }}
                  >
                    {a.wo_code || a.scope_ref?.work_order_id || "—"}
                  </span>
                  <span className="text-[9px] font-mono text-wr-text-dim">
                    {a.duration || a.age || ""}
                  </span>
                </div>
                <p className="text-[12px] text-wr-text">
                  {a.title || a.kind || "Alerta"}
                </p>
                {a.detail && (
                  <p className="text-[10px] text-wr-text-dim mt-0.5">{a.detail}</p>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* ShieldsWidget                                                   */
/* ─────────────────────────────────────────────────────────────── */

const SHIELD_DOT_COLOR = {
  bronze:      "#B45309",
  bronze_plus: "#D97706",
  silver:      "#64748B",
  gold:        "#CA8A04",
};

const SHIELD_NAME = {
  bronze:      "Bronze",
  bronze_plus: "Bronze+",
  silver:      "Silver",
  gold:        "Gold",
};

export function ShieldsWidget({ agreements = [] }) {
  const total = agreements.length;

  // Próximos a vencer (si data lo permite)
  const upcoming = agreements
    .filter((a) => a.days_to_expire != null && a.days_to_expire <= 90)
    .sort((x, y) => x.days_to_expire - y.days_to_expire)
    .slice(0, 3);

  // Breakdown por nivel (siempre disponible mientras haya agreements)
  const byLevel = agreements.reduce((acc, a) => {
    const level = a.shield_level || "unknown";
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {});

  const orderedLevels = ["gold", "silver", "bronze_plus", "bronze"].filter(
    (l) => byLevel[l] > 0
  );

  // Si no hay agreements en absoluto
  if (total === 0) {
    return (
      <section className="border-b border-wr-border">
        <header className="px-5 py-3 flex items-center justify-between">
          <p className="label-caps-v2">Shields</p>
          <span className="text-[10px] font-mono text-wr-text-dim">0 activos</span>
        </header>
        <div className="px-5 pb-4">
          <p className="text-[11px] text-wr-text-dim italic py-2">
            Sin contratos Shield activos.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-wr-border">
      <header className="px-5 py-3 flex items-center justify-between">
        <p className="label-caps-v2">Shields</p>
        <span className="text-[10px] font-mono" style={{ color: "#22C55E" }}>
          {total} activos
        </span>
      </header>
      <div className="px-5 pb-4">
        {/* Si tenemos data de vencimiento próximo, lo mostramos primero */}
        {upcoming.length > 0 && (
          <div className="space-y-1.5 mb-3">
            <p className="text-[9px] text-wr-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
              Próximos a vencer
            </p>
            {upcoming.map((a) => {
              const dot = SHIELD_DOT_COLOR[a.shield_level] || "#9CA3AF";
              const name = SHIELD_NAME[a.shield_level] || "—";
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-[11px] py-1.5 border-b border-wr-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                    <span className="text-wr-text-mid">
                      {a.client_name} · {name}
                    </span>
                  </div>
                  <span className="font-mono text-wr-text-dim">{a.days_to_expire}d</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Breakdown por nivel (siempre visible) */}
        <p className="text-[9px] text-wr-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
          Por nivel
        </p>
        <div className="space-y-1">
          {orderedLevels.map((level) => {
            const count = byLevel[level];
            const dot = SHIELD_DOT_COLOR[level] || "#9CA3AF";
            const name = SHIELD_NAME[level] || level;
            return (
              <div
                key={level}
                className="flex items-center justify-between text-[11px] py-1"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                  <span className="text-wr-text-mid">{name}</span>
                </div>
                <span className="font-mono text-wr-text">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Si no hay data de vencimiento, mensaje neutro */}
        {upcoming.length === 0 && agreements.every((a) => a.days_to_expire == null) && (
          <p className="text-[10px] text-wr-text-dim mt-3 leading-snug">
            Sin datos de vencimiento en estos contratos.
          </p>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* WeatherWidget                                                   */
/* ─────────────────────────────────────────────────────────────── */

/**
 * WeatherWidget · Open-Meteo (sin token).
 *
 * Acepta lista de sites con coords. El user pickea uno (chip) y el widget
 * fetchea Open-Meteo para esas coords. Cache 30min en weather.js.
 *
 * Props:
 *  - sites: array [{ id, name, city, lat, lng }]
 *  - selectedSiteId
 *  - onSelectSite(id)
 */
export function WeatherWidget({ sites = [], selectedSiteId, onSelectSite }) {
  // Auto-select primer site con coords si no hay seleccionado
  const defaultSiteId = useMemo(() => {
    if (selectedSiteId) return selectedSiteId;
    const firstWithCoords = sites.find(
      (s) => (s.lat ?? s.latitude) != null && (s.lng ?? s.longitude) != null
    );
    return firstWithCoords?.id || null;
  }, [selectedSiteId, sites]);

  const selectedSite = useMemo(
    () => sites.find((s) => s.id === defaultSiteId) || null,
    [sites, defaultSiteId]
  );

  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedSite) {
      setWeather(null);
      return;
    }
    const lat = selectedSite.lat ?? selectedSite.latitude ?? selectedSite.location?.lat;
    const lng = selectedSite.lng ?? selectedSite.longitude ?? selectedSite.location?.lng;
    if (lat == null || lng == null) {
      setWeather(null);
      return;
    }
    setLoading(true);
    fetchWeatherFor(lat, lng).then((data) => {
      setWeather(data);
      setLoading(false);
    });
  }, [selectedSite]);

  // Sites con coords (válidos para mostrar como chips)
  const sitesWithCoords = useMemo(
    () =>
      sites.filter(
        (s) => (s.lat ?? s.latitude) != null && (s.lng ?? s.longitude) != null
      ),
    [sites]
  );

  return (
    <section className="border-b border-wr-border">
      <header className="px-5 py-3 flex items-center justify-between">
        <p className="label-caps-v2">Meteorología</p>
        <span className="text-[10px] text-wr-text-dim">
          {selectedSite?.city || "Sites activos"}
        </span>
      </header>
      <div className="px-5 pb-4">
        {/* Pills de sites con coord */}
        {sitesWithCoords.length > 0 && (
          <div className="mb-3">
            <p
              className="text-[9px] text-wr-text-dim mb-1.5 uppercase"
              style={{ letterSpacing: "0.14em" }}
            >
              Sites con coordenadas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sitesWithCoords.slice(0, 6).map((site) => {
                const isSelected = site.id === defaultSiteId;
                return (
                  <button
                    key={site.id}
                    onClick={() => onSelectSite?.(site.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-[10px] transition ${
                      isSelected
                        ? "border-wr-amber/40 bg-wr-amber/10 text-wr-amber"
                        : "border-wr-border text-wr-text-mid hover:border-wr-border-strong"
                    }`}
                  >
                    <Icon icon={ICONS.mapPoint} size={9} />
                    {site.city || site.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Weather card */}
        {loading ? (
          <p className="text-[11px] text-wr-text-dim italic py-2">
            Cargando datos meteorológicos…
          </p>
        ) : weather && selectedSite ? (
          <div className="bg-wr-surface border border-wr-border rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon icon={ICONS.cloud} size={20} color="#9CA3AF" />
                <div>
                  <p className="text-[13px] text-wr-text font-medium">
                    {weather.condition}
                  </p>
                  <p className="text-[10px] text-wr-text-dim">
                    {selectedSite.city || selectedSite.name}
                  </p>
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold"
                style={{
                  background: weather.flightOk ? "#22C55E22" : "#DC262622",
                  color: weather.flightOk ? "#22C55E" : "#DC2626",
                }}
              >
                <Icon
                  icon={weather.flightOk ? ICONS.checkCircle : ICONS.dangerCircle}
                  size={10}
                />
                {weather.flightOk ? "Apto" : "No apto"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-wr-border">
              <div>
                <p className="text-[9px] text-wr-text-dim uppercase">Temp</p>
                <p className="text-[12px] font-mono text-wr-text">
                  {formatTemp(weather)}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-wr-text-dim uppercase">Viento</p>
                <p className="text-[12px] font-mono text-wr-text">
                  {weather.wind != null ? `${weather.wind} km/h` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-wr-text-dim uppercase">Precip</p>
                <p className="text-[12px] font-mono text-wr-text">
                  {weather.precip != null ? `${weather.precip}%` : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : sitesWithCoords.length === 0 ? (
          <p className="text-[11px] text-wr-text-dim italic py-2">
            Sin sites con coordenadas registradas.
          </p>
        ) : (
          <p className="text-[11px] text-wr-text-dim italic py-2">
            No se pudo cargar la meteorología.
          </p>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* SummaryWidget                                                   */
/* ─────────────────────────────────────────────────────────────── */

export function SummaryWidget({ stats = {} }) {
  const rows = [
    { label: "Completadas hoy",       value: stats.completedToday ?? 0,   color: "#22C55E", size: 18 },
    { label: "Total intervenciones",  value: stats.totalActive ?? 0,      color: "#06B6D4", size: 18 },
    { label: "Técnicos asignables",   value: stats.techsAvailable ?? 0,   suffix: stats.techsTotal != null ? `/${stats.techsTotal}` : "", color: "#06B6D4", size: 18 },
    { label: "Flota de vehículos",    value: stats.fleet ?? 0,            color: "#06B6D4", size: 18 },
  ];

  return (
    <section>
      <header className="px-5 py-3 flex items-center justify-between">
        <p className="label-caps-v2">Resumen</p>
      </header>
      <div className="px-5 pb-5 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1">
            <span className="text-[12px] text-wr-text-mid">{row.label}</span>
            <span
              className="font-mono"
              style={{ color: row.color, fontSize: row.size, fontWeight: 600 }}
            >
              {row.value}
              {row.suffix && <span className="text-wr-text-dim">{row.suffix}</span>}
            </span>
          </div>
        ))}
        {stats.invoicedMtd != null && (
          <div className="flex items-center justify-between py-1 pt-3 border-t border-wr-border">
            <span className="text-[12px] text-wr-text-mid">Facturado MTD</span>
            <span
              className="font-mono text-[14px]"
              style={{ color: "#F59E0B", fontWeight: 600 }}
            >
              € {Number(stats.invoicedMtd).toLocaleString("es-ES")}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
