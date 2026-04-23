/**
 * AlertsWidget · ORO per Juan (cockpit).
 *
 * "Alertas Operativas" panel · 8 kinds cubriendo trafico / no-show /
 * accidente / site cerrado / weather / access denied / fleet / other.
 *
 * Principio #1 refinado:
 *  - OPERATIVO = transparente para el cliente (aqui si lo ve)
 *  - COMERCIAL/FINANCIERO = opaco (no ve margins, costs, threads internos)
 *
 * SRS puede ack/dismiss. Client puede ack + resolve si ball_in_court='client'.
 */
import { useEffect, useState } from "react";
import { api } from "../../lib/api";

const KIND_META = {
  traffic:       { icon: "🛻", label: "Trafico" },
  no_show:       { icon: "🕳️", label: "No show" },
  accident:      { icon: "⚠️", label: "Accidente" },
  site_closed:   { icon: "🚫", label: "Cerrado" },
  weather:       { icon: "⛈️", label: "Clima" },
  access_denied: { icon: "🔒", label: "Acceso" },
  fleet:         { icon: "🔋", label: "Flota" },
  other:         { icon: "●",  label: "Otro" },
};

const SEV_STYLES = {
  critical: "border-danger/60 bg-danger/5 text-danger",
  warning:  "border-primary/50 bg-primary/5 text-primary-light",
  info:     "border-surface-border bg-surface-overlay/40 text-text-secondary",
};

const BALL_LABEL = {
  srs:      "SRS",
  client:   "Cliente",
  tech:     "Tech",
  external: "Externo",
};

function AlertCard({ alert, canAck, canResolve, onAction }) {
  const kind = KIND_META[alert.kind] || KIND_META.other;
  const sevCls = SEV_STYLES[alert.severity] || SEV_STYLES.info;
  const isAck = alert.status === "acknowledged";
  return (
    <div
      className={`px-3 py-2.5 border rounded-sm transition-all duration-fast ease-out-expo ${sevCls} ${
        isAck ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none mt-0.5" aria-hidden>
          {kind.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest-srs opacity-75">
              {kind.label}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest-srs opacity-75">
              · ball {BALL_LABEL[alert.ball_in_court] || alert.ball_in_court}
            </span>
            {isAck && (
              <span className="font-mono text-[10px] uppercase tracking-widest-srs opacity-75">
                · ack
              </span>
            )}
            {alert.eta_drift_minutes ? (
              <span className="font-mono text-[10px] uppercase tracking-widest-srs opacity-75">
                · +{alert.eta_drift_minutes}min
              </span>
            ) : null}
          </div>
          <div className="font-display text-sm text-text-primary leading-snug">
            {alert.title}
          </div>
          <div className="font-body text-xs text-text-secondary mt-0.5 leading-relaxed">
            {alert.message}
          </div>
          {alert.action_hint && (
            <div className="mt-1.5 font-mono text-[11px] text-primary-light leading-snug">
              → {alert.action_hint}
            </div>
          )}
          {(canAck || canResolve) && (
            <div className="flex gap-2 mt-2">
              {canAck && !isAck && (
                <button
                  onClick={() => onAction(alert.id, "ack")}
                  className="font-mono text-[10px] uppercase tracking-widest-srs px-2 py-0.5 border border-surface-border rounded-sm text-text-secondary hover:text-primary-light hover:border-primary transition-colors duration-fast"
                >
                  Ack
                </button>
              )}
              {canResolve && (
                <button
                  onClick={() => onAction(alert.id, "resolve")}
                  className="font-mono text-[10px] uppercase tracking-widest-srs px-2 py-0.5 border border-surface-border rounded-sm text-text-secondary hover:text-success hover:border-success transition-colors duration-fast"
                >
                  Resolver
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AlertsWidget({ isSrs = false, isClient = false }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get("/alerts/active/summary");
      setSummary(data);
    } catch (e) {
      setError(e.message || "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const int = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(int);
  }, []);

  async function handleAction(id, action) {
    try {
      if (action === "ack") {
        await api.post(`/alerts/${id}/ack`);
      } else if (action === "resolve") {
        await api.post(`/alerts/${id}/resolve`, { resolution_note: null });
      }
      load();
    } catch (e) {
      alert(e.message || "error");
    }
  }

  return (
    <section className="bg-surface-raised border border-surface-border rounded-md overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-overlay/40">
        <div className="flex items-center gap-3">
          <span className="label-caps">Alertas operativas</span>
          {summary && (
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest-srs">
              {summary.counts.critical > 0 && (
                <span className="text-danger">{summary.counts.critical} crit</span>
              )}
              {summary.counts.warning > 0 && (
                <span className="text-primary-light">{summary.counts.warning} warn</span>
              )}
              {summary.counts.info > 0 && (
                <span className="text-text-secondary">{summary.counts.info} info</span>
              )}
              {summary.counts.total === 0 && (
                <span className="text-text-tertiary">— sin alertas activas</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={load}
          className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary hover:text-primary-light transition-colors duration-fast"
        >
          ↻ Refrescar
        </button>
      </header>

      <div className="p-3 space-y-2 max-h-[420px] overflow-y-auto">
        {loading && !summary && (
          <div className="py-8 text-center font-mono text-2xs text-text-tertiary uppercase tracking-widest-srs">
            cargando…
          </div>
        )}
        {error && (
          <div className="py-4 text-center text-danger text-sm font-body">
            {error}
          </div>
        )}
        {summary && summary.recent.length === 0 && !error && (
          <div className="py-6 text-center font-mono text-2xs text-text-tertiary uppercase tracking-widest-srs">
            sin alertas · operacion fluyendo
          </div>
        )}
        {summary &&
          summary.recent.map((a) => {
            const canAck = isSrs || (isClient && a.ball_in_court === "client");
            const canResolve = isSrs || (isClient && a.ball_in_court === "client");
            return (
              <AlertCard
                key={a.id}
                alert={a}
                canAck={canAck}
                canResolve={canResolve}
                onAction={handleAction}
              />
            );
          })}
      </div>
    </section>
  );
}
