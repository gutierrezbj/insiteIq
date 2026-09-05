/**
 * V2SidebarNav — Sidebar 200px del shell SRS dark
 *
 * Extraído 1:1 de `mocks/insiteiq_cockpit_srs_dark_v2_static.html`.
 * Design System v1.7 §4.3.
 *
 * Estructura:
 * - Header con "InsiteIQ" label amber + "SRS Coordinators" display
 * - Nav items con NavLink · item activo tiene left-border 2px amber + bg amber/10
 * - Footer con pill "SISTEMA OPERATIVO" verde pulse + build + region info
 *
 * Regla §3.5: los nav items NO llevan iconos. Solo texto.
 * Regla §3.6b: pulse-dot del indicador "sistema operativo" es elemento funcional.
 */

import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";

// Nav items por scope. SRS ve todo; client solo lo operativo.
// `key` se usa para resolver i18n: t(`nav.${key}`).
// Reanclaje 2026-09-05 · producto modular en 3 (owner): Coordinación ·
// Operaciones · Administración. Cada módulo lleva su contador de
// "pendiente de cerrar" (GET /work-orders/module-counts).
const SRS_SECTIONS = [
  {
    key: "coordinacion",
    items: [
      { to: "/srs",                key: "cockpit", end: true },
      { to: "/srs/espacio-ops",    key: "espacio_ops" },
      { to: "/srs/intervenciones", key: "interventions_bf" },
      { to: "/srs/projects",       key: "projects" },
    ],
  },
  {
    key: "operaciones",
    items: [
      { to: "/srs/sites", key: "sites" },
      { to: "/srs/techs", key: "techs" },
    ],
  },
  {
    key: "administracion",
    items: [
      { to: "/srs/finance",    key: "finance" },
      { to: "/srs/agreements", key: "agreements" },
      { to: "/srs/insights",   key: "insights" },
      { to: "/srs/admin",      key: "admin" },
    ],
  },
];

const NAV_BY_SCOPE = {
  srs: SRS_SECTIONS.flatMap((sec) => sec.items),
  client: [
    { to: "/client",                  key: "operations",    end: true, accent: true },
    { to: "/client/espacio-ops",      key: "espacio_ops" },
    { to: "/client/intervenciones",   key: "interventions" },
    // sites/agreements/deliverables podados 2026-06-08: las rutas no existían
    // (redirigían a home). Se re-añaden cuando las vistas client-scoped
    // se construyan de verdad (Tramo C del roadmap a operaciones).
  ],
};

const SPACE_LABELS = {
  srs:    { caps: "InsiteIQ",          titleKey: "srs_coordinators" },
  client: { caps: "InsiteIQ · Client", titleKey: "workspace" },
};

export default function V2SidebarNav({
  scope = "srs",
  buildSha = "1cc3cd6",
  region = "EU-West",
  organizationName,
}) {
  const { t } = useTranslation("common");
  const navItems = NAV_BY_SCOPE[scope] || NAV_BY_SCOPE.srs;
  const [counts, setCounts] = useState({});
  useEffect(() => {
    if (scope !== "srs") return undefined;
    let alive = true;
    const fetchCounts = async () => {
      try {
        const r = await api.get("/work-orders/module-counts");
        if (alive && r && typeof r === "object") setCounts(r);
      } catch {
        /* sin permisos o sin red · el menú sigue funcionando */
      }
    };
    fetchCounts();
    const int = setInterval(fetchCounts, 60000);
    return () => { alive = false; clearInterval(int); };
  }, [scope]);

  const renderItem = (n) => (
    <NavLink
      key={n.to}
      to={n.to}
      end={n.end}
      className={({ isActive }) => {
        const base = "flex items-center px-3 py-2 rounded-sm transition font-jakarta";
        if (isActive) {
          return `${base} text-cl-text bg-cl-amber-soft font-bold border-l-[3px] border-cl-text`;
        }
        return `${base} text-cl-text-mid font-medium hover:text-cl-text hover:bg-cl-surface-2`;
      }}
    >
      {t(`nav.${n.key}`)}
    </NavLink>
  );
  const spaceLabel = SPACE_LABELS[scope] || SPACE_LABELS.srs;
  // Para client space, mostrar el nombre de la organización en el título.
  const titleText =
    scope === "client" && organizationName ? organizationName : t(`nav.${spaceLabel.titleKey}`);
  return (
    // Sidebar bg surface-3 (#F4F6F8) + border-right strong, replica mock F.
    <aside className="w-[200px] bg-cl-surface-3 border-r border-cl-border-strong flex-shrink-0 flex flex-col">
      {/* Header · caps en navy strong (no amber) */}
      <div className="px-5 py-5 border-b border-cl-border-strong">
        <p
          className="label-caps-v2 mb-0.5"
          style={{ color: "#0A1628", fontWeight: 800 }}
        >
          {spaceLabel.caps}
        </p>
        <h1
          className="font-jakarta text-[15px] text-cl-text"
          style={{ fontWeight: 700, letterSpacing: "-0.005em" }}
        >
          {titleText}
        </h1>
      </div>

      {/* Nav items · activo = bg navy soft + text navy + border-left navy 3px (mock F §pattern) */}
      <nav className="flex-1 py-3 px-2 text-[13px] overflow-y-auto wr-scroll">
        {scope === "srs"
          ? SRS_SECTIONS.map((sec) => {
              const pending = counts[sec.key] || 0;
              return (
                <div key={sec.key} className="mb-3">
                  <div
                    className="flex items-center justify-between px-3 pt-2 pb-1"
                    title={t("nav.pending_close_tooltip")}
                  >
                    <span
                      className="font-jakarta uppercase text-[10px]"
                      style={{ color: "#3D4A66", fontWeight: 800, letterSpacing: "0.14em" }}
                    >
                      {t(`nav.module_${sec.key}`)}
                    </span>
                    {pending > 0 && (
                      <span
                        className="font-mono text-[10px] px-1.5 rounded-sm"
                        style={{ color: "#0A1628", background: "#E2E5EC", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                      >
                        {pending}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">{sec.items.map(renderItem)}</div>
                </div>
              );
            })
          : navItems.map(renderItem)}
      </nav>

      {/* Footer · pill verde con presencia + meta data tabular */}
      <div className="px-4 py-3 border-t border-cl-border-strong text-[10px] space-y-1">
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
            style={{ background: "#16A34A" }}
          />
          <span
            className="font-jakarta uppercase"
            style={{ color: "#0A6131", fontWeight: 700, letterSpacing: "0.1em" }}
          >
            {t("nav.system_operational")}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-cl-text-dim font-jakarta" style={{ fontWeight: 500 }}>{t("nav.build")}</span>
          <span className="font-mono text-cl-text-mid">{buildSha}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-cl-text-dim font-jakarta" style={{ fontWeight: 500 }}>{t("nav.region")}</span>
          <span className="font-mono text-cl-text-mid">{region}</span>
        </div>
      </div>
    </aside>
  );
}
