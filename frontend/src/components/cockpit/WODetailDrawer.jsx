/**
 * WODetailDrawer · slide-in panel 480px desde la derecha.
 *
 * Muestra TODA la info operativa relevante del WO: estado, alertas activas
 * (con ack/resolve inline), metadata, y acciones directas.
 *
 * Juan Z-c refinado: corporate, dense, action-first. Sin copy explicativo.
 */
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { SeverityIcon, KindIcon, KIND_LABEL } from "./alertIcons";
import { api } from "../../lib/api";

function fmtDateTime(iso, tz) {
  if (!iso) return "—";
  const d = new Date(iso);
  const utc = d.toISOString().replace("T", " ").slice(0, 16) + "Z";
  let local = null;
  if (tz) {
    try {
      local = new Intl.DateTimeFormat("es-ES", {
        timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }).format(d);
    } catch {}
  }
  return local ? `${local} · ${utc}` : utc;
}

function fmtAge(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h < 24) return rem ? `${h}h${String(rem).padStart(2, "0")}` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d${h % 24}h`;
}

function Section({ label, children, actions }) {
  return (
    <div className="border-b border-surface-border/60 px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="label-caps">{label}</div>
        {actions}
      </div>
      {children}
    </div>
  );
}

function KeyValue({ k, v, tone = "neutral", mono = false }) {
  const vCls =
    tone === "danger" ? "text-danger"
    : tone === "warn" ? "text-primary-light"
    : tone === "success" ? "text-success"
    : "text-text-primary";
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary min-w-[72px]">
        {k}
      </span>
      <span className={`${mono ? "font-mono text-xs tabular-nums" : "font-body text-sm"} ${vCls}`}>
        {v ?? "—"}
      </span>
    </div>
  );
}

export default function WODetailDrawer({
  wo,
  site,
  client,
  tech,
  alerts = [],
  open,
  onClose,
  onAlertAction,
  baseLinkPrefix = "/srs",
}) {
  // Esc cierra
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!wo) return null;

  const slaAge = fmtAge(wo?.ball_in_court?.since);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-fast ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-screen w-[480px] max-w-[92vw] bg-surface-base border-l border-surface-border z-50
          transform transition-transform duration-fast ease-out-expo
          ${open ? "translate-x-0" : "translate-x-full"}
          overflow-y-auto`}
      >
        {/* Header sticky */}
        <div className="sticky top-0 bg-surface-base border-b border-surface-border px-5 py-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs text-text-primary">{wo.reference}</span>
                {wo.severity && (
                  <span className={`font-mono text-[10px] uppercase tracking-widest-srs px-1.5 py-0.5 rounded-sm border
                    ${wo.severity === "critical" ? "text-danger border-danger/50 bg-danger/5"
                      : wo.severity === "high" ? "text-primary-light border-primary/50 bg-primary/5"
                      : "text-text-tertiary border-surface-border"}`}>
                    {wo.severity}
                  </span>
                )}
                <span className={`font-mono text-[10px] uppercase tracking-widest-srs
                  ${wo.status === "in_progress" ? "text-success"
                    : ["dispatched","en_route","on_site"].includes(wo.status) ? "text-primary-light"
                    : "text-text-tertiary"}`}>
                  {wo.status}
                </span>
              </div>
              <div className="font-display text-base text-text-primary leading-snug">
                {wo.title}
              </div>
              <div className="font-body text-xs text-text-secondary mt-0.5 truncate">
                {site ? `${site.name} · ${site.city || "—"} · ${site.country}` : "—"}
                {client ? ` · ${client.display_name || client.legal_name}` : ""}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors duration-fast p-1 -mr-1 -mt-1"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Estado */}
        <Section label="Estado">
          <div className="space-y-1.5">
            <KeyValue k="shield" v={wo.shield_level || "—"} />
            <KeyValue
              k="tech"
              v={tech?.full_name || tech?.email?.split("@")[0] || "sin asignar"}
              tone={tech ? "neutral" : "warn"}
            />
            <KeyValue
              k="ball"
              v={`${(wo?.ball_in_court?.side || "—").toUpperCase()} · ${slaAge}`}
              mono
            />
            <KeyValue
              k="created"
              v={fmtDateTime(wo.created_at, site?.timezone)}
              mono
            />
            <KeyValue
              k="updated"
              v={fmtDateTime(wo.updated_at, site?.timezone)}
              mono
            />
          </div>
        </Section>

        {/* Alertas */}
        {alerts.length > 0 && (
          <Section label={`Alertas activas (${alerts.length})`}>
            <div className="space-y-2">
              {alerts.map((a) => (
                <div key={a.id} className="border border-surface-border rounded-sm px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityIcon severity={a.severity} size={13} />
                    <KindIcon kind={a.kind} size={12} />
                    <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
                      {KIND_LABEL[a.kind] || a.kind}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary ml-auto tabular-nums">
                      {fmtAge(a.created_at)}
                    </span>
                  </div>
                  <div className="font-body text-sm text-text-primary leading-snug mb-0.5">
                    {a.title}
                  </div>
                  <div className="font-body text-xs text-text-secondary mb-1 leading-relaxed">
                    {a.message}
                  </div>
                  {a.action_hint && (
                    <div className="font-mono text-[11px] text-primary-light leading-snug mb-1.5">
                      → {a.action_hint}
                    </div>
                  )}
                  <div className="flex gap-2">
                    {a.status !== "acknowledged" && (
                      <button
                        onClick={() => onAlertAction?.(a.id, "ack")}
                        className="font-mono text-[10px] uppercase tracking-widest-srs px-2 py-0.5 border border-surface-border rounded-sm text-text-secondary hover:text-primary-light hover:border-primary transition-colors duration-fast"
                      >
                        ack
                      </button>
                    )}
                    <button
                      onClick={() => onAlertAction?.(a.id, "resolve")}
                      className="font-mono text-[10px] uppercase tracking-widest-srs px-2 py-0.5 border border-surface-border rounded-sm text-text-secondary hover:text-success hover:border-success transition-colors duration-fast"
                    >
                      resolver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Description */}
        {wo.description && (
          <Section label="Descripcion">
            <div className="font-body text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {wo.description}
            </div>
          </Section>
        )}

        {/* Site info */}
        {site && (
          <Section label="Site">
            <div className="space-y-1.5">
              <KeyValue k="code" v={site.code} mono />
              <KeyValue k="tipo" v={site.site_type} />
              <KeyValue k="ciudad" v={site.city} />
              <KeyValue k="tz" v={site.timezone} mono />
              <KeyValue
                k="coords"
                v={site.lat && site.lng ? `${site.lat.toFixed(4)}, ${site.lng.toFixed(4)}` : "—"}
                mono
              />
            </div>
          </Section>
        )}

        {/* Acciones */}
        <Section label="Acciones">
          <div className="grid grid-cols-2 gap-2">
            <Link
              to={`${baseLinkPrefix}/ops/${wo.id}`}
              className="font-mono text-[10px] uppercase tracking-widest-srs text-center px-3 py-2 border border-surface-border rounded-sm text-text-secondary hover:text-primary-light hover:border-primary transition-colors duration-fast"
            >
              abrir WO
            </Link>
            <Link
              to={`${baseLinkPrefix}/ops/${wo.id}/report`}
              className="font-mono text-[10px] uppercase tracking-widest-srs text-center px-3 py-2 border border-surface-border rounded-sm text-text-secondary hover:text-primary-light hover:border-primary transition-colors duration-fast"
            >
              report
            </Link>
            <Link
              to={`${baseLinkPrefix}/ops/${wo.id}`}
              className="font-mono text-[10px] uppercase tracking-widest-srs text-center px-3 py-2 border border-surface-border rounded-sm text-text-secondary hover:text-primary-light hover:border-primary transition-colors duration-fast"
            >
              thread
            </Link>
            <Link
              to={`${baseLinkPrefix}/ops/${wo.id}`}
              className="font-mono text-[10px] uppercase tracking-widest-srs text-center px-3 py-2 border border-surface-border rounded-sm text-text-secondary hover:text-primary-light hover:border-primary transition-colors duration-fast"
            >
              briefing
            </Link>
            <Link
              to={`${baseLinkPrefix}/ops/${wo.id}`}
              className="font-mono text-[10px] uppercase tracking-widest-srs text-center px-3 py-2 border border-surface-border rounded-sm text-text-secondary hover:text-primary-light hover:border-primary transition-colors duration-fast"
            >
              parts
            </Link>
            <Link
              to={`${baseLinkPrefix}/sites/${wo.site_id}`}
              className="font-mono text-[10px] uppercase tracking-widest-srs text-center px-3 py-2 border border-surface-border rounded-sm text-text-secondary hover:text-primary-light hover:border-primary transition-colors duration-fast"
            >
              ver site
            </Link>
          </div>
        </Section>
      </aside>
    </>
  );
}
