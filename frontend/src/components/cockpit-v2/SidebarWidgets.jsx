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

import { Icon, ICONS } from "../../lib/icons";

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

export function ShieldsWidget({ agreements = [] }) {
  // Filtramos los próximos a vencer (30-90 días)
  const upcoming = agreements
    .filter((a) => a.days_to_expire != null && a.days_to_expire <= 90)
    .sort((x, y) => x.days_to_expire - y.days_to_expire)
    .slice(0, 3);
  const total = agreements.length;
  const allOk = upcoming.length === 0;

  return (
    <section className="border-b border-wr-border">
      <header className="px-5 py-3 flex items-center justify-between">
        <p className="label-caps-v2">Shields</p>
        <span className="text-[10px] font-mono" style={{ color: "#22C55E" }}>
          {total} activos
        </span>
      </header>
      <div className="px-5 pb-4">
        {allOk ? (
          <div className="flex items-center gap-3 p-3 mb-2" style={{ background: "rgba(34, 197, 94, 0.05)", borderLeft: "2px solid #22C55E" }}>
            <Icon icon={ICONS.checkCircle} size={16} color="#22C55E" />
            <div>
              <p className="text-[12px]" style={{ color: "#22C55E", fontWeight: 500 }}>
                Todo en regla
              </p>
              <p className="text-[10px] text-wr-text-dim">
                Sin vencimientos próximos 90 días
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {upcoming.map((a) => {
              const dot = SHIELD_DOT_COLOR[a.shield_level] || "#9CA3AF";
              const shieldName = a.shield_level
                ? a.shield_level.replace("_plus", "+").replace(/^./, (c) => c.toUpperCase())
                : "—";
              return (
                <div key={a.id} className="flex items-center justify-between text-[11px] py-1.5 border-b border-wr-border last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                    <span className="text-wr-text-mid">
                      {a.client_name} · {shieldName}
                    </span>
                  </div>
                  <span className="font-mono text-wr-text-dim">{a.days_to_expire}d</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* WeatherWidget                                                   */
/* ─────────────────────────────────────────────────────────────── */

export function WeatherWidget({
  activeWoCodes = [],
  cities = [],
  current,
  selectedWo,
  onSelectWo,
}) {
  return (
    <section className="border-b border-wr-border">
      <header className="px-5 py-3 flex items-center justify-between">
        <p className="label-caps-v2">Meteorología</p>
        <span className="text-[10px] text-wr-text-dim">Sites activos</span>
      </header>
      <div className="px-5 pb-4">
        {/* Filtro pills por WO */}
        {activeWoCodes.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] text-wr-text-dim mb-1.5 uppercase" style={{ letterSpacing: "0.14em" }}>
              Intervenciones activas
            </p>
            <div className="flex flex-wrap gap-1.5">
              {activeWoCodes.slice(0, 4).map((code) => {
                const isSelected = code === selectedWo;
                return (
                  <button
                    key={code}
                    onClick={() => onSelectWo?.(code)}
                    className={`px-2 py-1 rounded-sm border text-[10px] font-mono ${
                      isSelected
                        ? "border-wr-amber/40 bg-wr-amber/10 text-wr-amber"
                        : "border-wr-border text-wr-text-mid"
                    }`}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filtro pills por ciudad */}
        {cities.length > 0 && (
          <div className="mb-3">
            <p className="text-[9px] text-wr-text-dim mb-1.5 uppercase" style={{ letterSpacing: "0.14em" }}>
              Ciudades
            </p>
            <div className="flex flex-wrap gap-1.5">
              {cities.slice(0, 6).map((city) => (
                <button
                  key={city}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border border-wr-border text-[10px] text-wr-text-mid"
                >
                  <Icon icon={ICONS.mapPoint} size={9} />
                  {city}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Weather card actual */}
        {current ? (
          <div className="bg-wr-surface border border-wr-border rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon icon={ICONS.cloud} size={20} color="#9CA3AF" />
                <div>
                  <p className="text-[13px] text-wr-text font-medium">{current.condition}</p>
                  <p className="text-[10px] text-wr-text-dim">
                    {current.city} {current.wo_code && `· ${current.wo_code} activo`}
                  </p>
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold"
                style={{
                  background: current.flightOk === false ? "#DC262622" : "#22C55E22",
                  color: current.flightOk === false ? "#DC2626" : "#22C55E",
                }}
              >
                <Icon icon={current.flightOk === false ? ICONS.dangerCircle : ICONS.checkCircle} size={10} />
                {current.flightOk === false ? "No apto" : "Apto"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-wr-border">
              <div>
                <p className="text-[9px] text-wr-text-dim uppercase">Temp</p>
                <p className="text-[12px] font-mono text-wr-text">{current.temp || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] text-wr-text-dim uppercase">Viento</p>
                <p className="text-[12px] font-mono text-wr-text">{current.wind || "—"}</p>
              </div>
              <div>
                <p className="text-[9px] text-wr-text-dim uppercase">Precip</p>
                <p className="text-[12px] font-mono text-wr-text">{current.precip || "—"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-wr-text-dim italic py-2">Sin datos meteorológicos</p>
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
