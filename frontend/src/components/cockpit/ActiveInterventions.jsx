/**
 * ActiveInterventions · cards de WOs activas (assigned/dispatched/in_progress/in_closeout).
 * Incluye local-time del site + origin-time (user TZ) per Juan Z-b requirement.
 *
 * "5 meteorologia si no cuenta la metemos, pero si hace falta la Hora
 *  de donde es la intervencion y la hora en la localidad de origen"
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

const STATUS_TINT = {
  assigned:    "border-text-tertiary/60 bg-surface-overlay/40",
  dispatched:  "border-primary/50 bg-primary/5",
  in_progress: "border-success/50 bg-success/5",
  in_closeout: "border-text-secondary/60 bg-surface-overlay/70",
};

function fmtTz(date, tz) {
  if (!tz) return null;
  try {
    return new Intl.DateTimeFormat("es-ES", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return null;
  }
}

function InterventionCard({ wo, sitesMap, baseLinkPrefix, originTz }) {
  const site = sitesMap[wo.site_id];
  const statusCls = STATUS_TINT[wo.status] || "border-surface-border bg-surface-overlay/40";
  const now = useMemo(() => new Date(), []);
  const siteTime = site?.timezone ? fmtTz(now, site.timezone) : null;
  const originTime = originTz ? fmtTz(now, originTz) : null;

  return (
    <Link
      to={`${baseLinkPrefix}/ops/${wo.id}`}
      className={`block rounded-md border px-4 py-3 transition-all duration-fast ease-out-expo hover:-translate-y-px hover:shadow-glow-primary hover:border-primary ${statusCls}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
          {wo.reference}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-secondary">
          · {wo.status}
        </span>
        {wo.severity && (
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-primary-light">
            · {wo.severity}
          </span>
        )}
        {wo.shield_level && (
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
            · {wo.shield_level}
          </span>
        )}
      </div>
      <div className="font-display text-sm text-text-primary leading-snug mb-0.5">
        {wo.title}
      </div>
      {site && (
        <div className="font-body text-xs text-text-secondary truncate">
          {site.name}
          {site.city ? ` · ${site.city}` : ""}
          {site.country ? ` · ${site.country}` : ""}
        </div>
      )}
      {(siteTime || originTime) && (
        <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
          {siteTime && (
            <span>
              Site: <span className="text-text-secondary">{siteTime}</span>
            </span>
          )}
          {originTime && (
            <span>
              Origen: <span className="text-text-secondary">{originTime}</span>
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export default function ActiveInterventions({ baseLinkPrefix = "/srs" }) {
  const [wos, setWos] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);

  const originTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [woList, siteList] = await Promise.all([
        api.get("/work-orders?limit=500"),
        api.get("/sites?limit=500"),
      ]);
      const woItems = Array.isArray(woList) ? woList : woList?.items || [];
      const siteItems = Array.isArray(siteList) ? siteList : siteList?.items || [];
      setWos(
        woItems.filter((w) =>
          ["assigned", "dispatched", "in_progress", "in_closeout"].includes(w.status)
        )
      );
      setSites(siteItems);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const int = setInterval(load, 60000);
    return () => clearInterval(int);
  }, []);

  const sitesMap = useMemo(() => {
    const m = {};
    for (const s of sites) m[s.id] = s;
    return m;
  }, [sites]);

  return (
    <section className="bg-surface-raised border border-surface-border rounded-md overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-overlay/40">
        <div className="flex items-center gap-3">
          <span className="label-caps">Intervenciones activas</span>
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
            {loading ? "…" : `${wos.length} en ejecucion`}
          </span>
        </div>
        {originTz && (
          <span className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary">
            tz origen: {originTz}
          </span>
        )}
      </header>
      <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto">
        {wos.length === 0 && !loading && (
          <div className="col-span-2 py-6 text-center font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            sin intervenciones activas
          </div>
        )}
        {wos.map((w) => (
          <InterventionCard
            key={w.id}
            wo={w}
            sitesMap={sitesMap}
            baseLinkPrefix={baseLinkPrefix}
            originTz={originTz}
          />
        ))}
      </div>
    </section>
  );
}
