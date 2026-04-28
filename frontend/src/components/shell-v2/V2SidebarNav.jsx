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

import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/srs",             label: "Operaciones",       end: true, accent: true },
  { to: "/srs/espacio-ops",     label: "Espacio OPS" },
  { to: "/srs/intervenciones",  label: "Intervenciones" },
  { to: "/srs/projects",    label: "Proyectos" },
  { to: "/srs/sites",       label: "Sitios" },
  { to: "/srs/techs",       label: "Técnicos" },
  { to: "/srs/agreements",  label: "Contratos" },
  { to: "/srs/insights",    label: "Inteligencia" },
  { to: "/srs/finance",     label: "Finanzas" },
  { to: "/srs/admin",       label: "Admin" },
];

export default function V2SidebarNav({ buildSha = "1cc3cd6", region = "EU-West" }) {
  return (
    <aside className="w-[200px] bg-wr-bg border-r border-wr-border flex-shrink-0 flex flex-col">
      {/* Header */}
      <div className="px-5 py-5 border-b border-wr-border">
        <p className="label-caps-v2 mb-0.5" style={{ color: "#F59E0B" }}>InsiteIQ</p>
        <h1 className="font-display text-[15px] text-wr-text font-semibold">SRS Coordinators</h1>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 text-[13px] overflow-y-auto wr-scroll">
        {NAV_ITEMS.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => {
              const base = "flex items-center px-3 py-2 rounded-sm transition font-body";
              if (isActive) {
                return `${base} text-wr-amber bg-wr-amber/10 border-l-2 border-wr-amber`;
              }
              return `${base} text-wr-text-mid hover:text-wr-text hover:bg-wr-surface-2`;
            }}
          >
            {n.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-wr-border text-[10px] text-wr-text-dim space-y-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-wr-green animate-pulse-dot" />
          <span style={{ color: "#22C55E" }}>SISTEMA OPERATIVO</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span>Build</span>
          <span className="font-mono">{buildSha}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Region</span>
          <span className="font-mono">{region}</span>
        </div>
      </div>
    </aside>
  );
}
