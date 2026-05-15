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
import { useTranslation } from "react-i18next";
import { Icon, ICONS } from "../../lib/icons";
import { fetchWeatherFor, formatTemp } from "../../lib/weather";
import { scheduledNextDays, lastScheduledDate } from "../../lib/wo-metrics";

/* ─────────────────────────────────────────────────────────────── */
/* AlertsWidget                                                    */
/* ─────────────────────────────────────────────────────────────── */

export function AlertsWidget({ alerts = [] }) {
  const { t } = useTranslation("common");
  // Solo mostramos las 3 más críticas/recientes
  const shown = alerts.slice(0, 3);

  return (
    <section className="border-b border-cl-border-strong">
      <header className="px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#D63944" }} />
          <p className="label-caps-v2" style={{ color: "#D63944", fontWeight: 800 }}>
            {t("widget.alerts_title")}
          </p>
        </div>
        <button
          className="text-cl-text-dim transition"
          aria-label={t("widget.alerts_refresh")}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0A1628")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#8B95A8")}
        >
          <Icon icon={ICONS.refresh} size={13} />
        </button>
      </header>
      <div className="px-5 pb-4 space-y-2">
        {shown.length === 0 ? (
          <p className="text-[11px] text-cl-text-dim italic py-2">{t("widget.alerts_empty")}</p>
        ) : (
          shown.map((a, idx) => {
            const sev = a.severity || "warning";
            const color = sev === "critical" ? "#D63944" : sev === "warning" ? "#E8A33D" : "#0066B8";
            return (
              <div
                key={a.id || idx}
                className="p-3 rounded-sm"
                style={{ background: `${color}0F`, borderLeft: `3px solid ${color}` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="font-mono text-[10px]"
                    style={{ color, fontWeight: 700 }}
                  >
                    {a.wo_code || a.scope_ref?.work_order_id || "—"}
                  </span>
                  <span className="text-[10px] font-mono text-cl-text-dim">
                    {a.duration || a.age || ""}
                  </span>
                </div>
                <p
                  className="font-jakarta text-[13px]"
                  style={{ color: "#0A1628", fontWeight: 600, lineHeight: 1.35 }}
                >
                  {a.title || a.kind || t("widget.alerts_default_label")}
                </p>
                {a.detail && (
                  <p className="text-[11px] text-cl-text-mid mt-1" style={{ lineHeight: 1.4 }}>{a.detail}</p>
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
  bronze_plus: "#0A1628",
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
  const { t } = useTranslation("common");
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
      <section className="border-b border-cl-border">
        <header className="px-5 py-3 flex items-center justify-between">
          <p className="label-caps-v2">{t("widget.shields_title")}</p>
          <span className="text-[10px] font-mono text-cl-text-dim">{t("widget.shields_active_count", { count: 0 })}</span>
        </header>
        <div className="px-5 pb-4">
          <p className="text-[11px] text-cl-text-dim italic py-2">
            {t("widget.shields_empty")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="border-b border-cl-border-strong">
      <header className="px-5 py-3 flex items-center justify-between">
        <p className="label-caps-v2" style={{ color: "#0A1628", fontWeight: 800 }}>{t("widget.shields_title")}</p>
        <span className="font-jakarta uppercase" style={{ color: "#0A6131", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em" }}>
          {t("widget.shields_active_count", { count: total })}
        </span>
      </header>
      <div className="px-5 pb-4">
        {/* Si tenemos data de vencimiento próximo, lo mostramos primero */}
        {upcoming.length > 0 && (
          <div className="space-y-1.5 mb-3">
            <p className="text-[9px] text-cl-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
              {t("widget.shields_expiring")}
            </p>
            {upcoming.map((a) => {
              const dot = SHIELD_DOT_COLOR[a.shield_level] || "#3D4A66";
              const name = SHIELD_NAME[a.shield_level] || "—";
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-[11px] py-1.5 border-b border-cl-border last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                    <span className="text-cl-text-mid">
                      {a.client_name} · {name}
                    </span>
                  </div>
                  <span className="font-mono text-cl-text-dim">{a.days_to_expire}d</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Breakdown por nivel (siempre visible) */}
        <p className="text-[9px] text-cl-text-dim uppercase mb-1.5" style={{ letterSpacing: "0.14em" }}>
          {t("widget.shields_by_level")}
        </p>
        <div className="space-y-1">
          {orderedLevels.map((level) => {
            const count = byLevel[level];
            const dot = SHIELD_DOT_COLOR[level] || "#3D4A66";
            const name = SHIELD_NAME[level] || level;
            return (
              <div
                key={level}
                className="flex items-center justify-between text-[11px] py-1"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                  <span className="text-cl-text-mid">{name}</span>
                </div>
                <span className="font-mono text-cl-text">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Si no hay data de vencimiento, mensaje neutro */}
        {upcoming.length === 0 && agreements.every((a) => a.days_to_expire == null) && (
          <p className="text-[10px] text-cl-text-dim mt-3 leading-snug">
            {t("widget.shields_no_expiry_data")}
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
  const { t } = useTranslation("common");
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
    <section className="border-b border-cl-border-strong">
      <header className="px-5 py-3 flex items-center justify-between">
        <p className="label-caps-v2">{t("widget.weather_title")}</p>
        <span className="text-[10px] text-cl-text-dim">
          {selectedSite?.city || t("widget.weather_active_sites")}
        </span>
      </header>
      <div className="px-5 pb-4">
        {/* Pills de sites con coord */}
        {sitesWithCoords.length > 0 && (
          <div className="mb-3">
            <p
              className="text-[9px] text-cl-text-dim mb-1.5 uppercase"
              style={{ letterSpacing: "0.14em" }}
            >
              {t("widget.weather_with_coords")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sitesWithCoords.slice(0, 6).map((site) => {
                const isSelected = site.id === defaultSiteId;
                return (
                  <button
                    key={site.id}
                    onClick={() => onSelectSite?.(site.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-sm border text-[10px] transition font-jakarta"
                    style={{
                      borderColor: isSelected ? "#0A1628" : "#C8CDD8",
                      background: isSelected ? "#0A1628" : "transparent",
                      color: isSelected ? "#FFFFFF" : "#3D4A66",
                      fontWeight: isSelected ? 700 : 500,
                    }}
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
          <p className="text-[11px] text-cl-text-dim italic py-2">
            {t("widget.weather_loading")}
          </p>
        ) : weather && selectedSite ? (
          <div className="bg-cl-surface border border-cl-border rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon icon={ICONS.cloud} size={20} color="#3D4A66" />
                <div>
                  <p className="text-[13px] text-cl-text font-medium">
                    {weather.condition}
                  </p>
                  <p className="text-[10px] text-cl-text-dim">
                    {selectedSite.city || selectedSite.name}
                  </p>
                </div>
              </div>
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded font-jakarta uppercase"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  background: weather.flightOk ? "#D9F1E5" : "#FCE4E6",
                  color: weather.flightOk ? "#0A6131" : "#8E1F2A",
                  border: weather.flightOk ? "1px solid #16A34A" : "1px solid #D63944",
                }}
              >
                <Icon
                  icon={weather.flightOk ? ICONS.checkCircle : ICONS.dangerCircle}
                  size={10}
                />
                {weather.flightOk ? t("widget.weather_apt") : t("widget.weather_not_apt")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-cl-border">
              <div>
                <p className="text-[9px] text-cl-text-dim uppercase">{t("widget.weather_temp")}</p>
                <p className="text-[12px] font-mono text-cl-text">
                  {formatTemp(weather)}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-cl-text-dim uppercase">{t("widget.weather_wind")}</p>
                <p className="text-[12px] font-mono text-cl-text">
                  {weather.wind != null ? `${weather.wind} km/h` : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-cl-text-dim uppercase">{t("widget.weather_precip")}</p>
                <p className="text-[12px] font-mono text-cl-text">
                  {weather.precip != null ? `${weather.precip}%` : "—"}
                </p>
              </div>
            </div>
          </div>
        ) : sitesWithCoords.length === 0 ? (
          <p className="text-[11px] text-cl-text-dim italic py-2">
            {t("widget.weather_no_coords")}
          </p>
        ) : (
          <p className="text-[11px] text-cl-text-dim italic py-2">
            {t("widget.weather_failed")}
          </p>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* SummaryWidget                                                   */
/* ─────────────────────────────────────────────────────────────── */

export function SummaryWidget({ stats = {}, viewerScope = "srs" }) {
  const { t, i18n } = useTranslation("common");
  // Principio #1: Facturado MTD es "ropa en casa" — solo visible en SRS scope.
  const isClientScope = viewerScope === "client";
  const numLocale = (i18n.language || "es").startsWith("en") ? "en-US" : "es-ES";
  const rows = [
    { label: t("widget.summary_completed_today"),  value: stats.completedToday ?? 0,   color: "#22C55E", size: 18 },
    { label: t("widget.summary_total_active"),     value: stats.totalActive ?? 0,      color: "#06B6D4", size: 18 },
    { label: t("widget.summary_techs_available"),  value: stats.techsAvailable ?? 0,   suffix: stats.techsTotal != null ? `/${stats.techsTotal}` : "", color: "#06B6D4", size: 18 },
    { label: t("widget.summary_fleet"),            value: stats.fleet ?? 0,            color: "#06B6D4", size: 18 },
  ];

  return (
    <section>
      <header className="px-5 py-3 flex items-center justify-between">
        <p className="label-caps-v2">{t("widget.summary_title")}</p>
      </header>
      <div className="px-5 pb-5 space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-1">
            <span className="text-[12px] text-cl-text-mid">{row.label}</span>
            <span
              className="font-mono"
              style={{ color: row.color, fontSize: row.size, fontWeight: 600 }}
            >
              {row.value}
              {row.suffix && <span className="text-cl-text-dim">{row.suffix}</span>}
            </span>
          </div>
        ))}
        {stats.invoicedMtd != null && !isClientScope && (
          <div className="flex items-center justify-between py-1 pt-3 border-t border-cl-border">
            <span className="text-[12px] text-cl-text-mid">{t("widget.summary_invoiced_mtd")}</span>
            <span
              className="font-mono text-[14px]"
              style={{ color: "#0A1628", fontWeight: 600 }}
            >
              € {Number(stats.invoicedMtd).toLocaleString(numLocale)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────────────────────────── */
/* ScheduleHorizonWidget · Iter 2.63j · Q10 Agustín                */
/*   "Hasta qué fecha está hecha la programación actual?"          */
/*                                                                  */
/* Cuenta WOs con scheduled_at en próximos 7 y 30 días. Muestra    */
/* última fecha programada · alerta si el horizonte se está        */
/* agotando (vaya programando nuevos antes de quedarte sin agenda).*/
/* ─────────────────────────────────────────────────────────────── */

export function ScheduleHorizonWidget({ wos = [] }) {
  const { t, i18n } = useTranslation("common");
  const dateLocale = (i18n.language || "es").startsWith("en") ? "en-US" : "es-ES";

  const stats = useMemo(() => {
    const next7 = scheduledNextDays(wos, 7).length;
    const next30 = scheduledNextDays(wos, 30).length;
    const last = lastScheduledDate(wos);
    const daysToLast = last
      ? Math.ceil((last.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;
    return { next7, next30, last, daysToLast };
  }, [wos]);

  // Severity del horizonte · si la última fecha está a <7 días, alerta amber
  // (hay que programar más). <3 días = rojo (urgente).
  let severity = "ok";
  if (stats.daysToLast == null) severity = "empty";
  else if (stats.daysToLast < 3) severity = "danger";
  else if (stats.daysToLast < 7) severity = "warn";

  const sevColors = {
    ok:     { bg: "#D9F1E5", fg: "#0A6131" },
    warn:   { bg: "#FCF1DC", fg: "#7E5212" },
    danger: { bg: "#FEF2F2", fg: "#991B1B" },
    empty:  { bg: "#F4F6F8", fg: "#8B95A8" },
  };
  const c = sevColors[severity];

  return (
    <section className="border-t border-cl-border">
      <header className="px-5 py-3 flex items-center justify-between">
        <p className="label-caps-v2">{t("widget.schedule_horizon_title")}</p>
      </header>
      <div className="px-5 pb-5 space-y-2.5">
        <div className="flex items-center justify-between py-1">
          <span className="text-[12px] text-cl-text-mid">{t("widget.schedule_horizon_next_7d")}</span>
          <span className="font-mono text-[18px] font-semibold" style={{ color: "#0A1628" }}>
            {stats.next7}
          </span>
        </div>
        <div className="flex items-center justify-between py-1">
          <span className="text-[12px] text-cl-text-mid">{t("widget.schedule_horizon_next_30d")}</span>
          <span className="font-mono text-[18px] font-semibold" style={{ color: "#0A1628" }}>
            {stats.next30}
          </span>
        </div>
        <div
          className="flex items-center justify-between py-1 pt-3 border-t border-cl-border"
          style={{ minHeight: 28 }}
        >
          <span className="text-[12px] text-cl-text-mid">{t("widget.schedule_horizon_last")}</span>
          {stats.last ? (
            <span
              className="font-mono text-[12px] px-2 py-0.5 rounded"
              style={{ background: c.bg, color: c.fg, fontWeight: 700 }}
              title={
                stats.daysToLast != null
                  ? t("widget.schedule_horizon_days_to_last", { days: stats.daysToLast })
                  : ""
              }
            >
              {stats.last.toLocaleDateString(dateLocale, {
                day: "2-digit",
                month: "short",
              })}
            </span>
          ) : (
            <span className="font-mono text-[11px] text-cl-text-dim uppercase tracking-wider">
              {t("widget.schedule_horizon_none")}
            </span>
          )}
        </div>
        {severity === "warn" || severity === "danger" ? (
          <p
            className="text-[11px] mt-2"
            style={{ color: c.fg, fontWeight: 600, lineHeight: 1.4 }}
          >
            {severity === "danger"
              ? t("widget.schedule_horizon_alert_urgent")
              : t("widget.schedule_horizon_alert_warn")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
