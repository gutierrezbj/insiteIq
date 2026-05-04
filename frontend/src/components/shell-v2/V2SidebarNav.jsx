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

// Nav items por scope. SRS ve todo; client solo lo operativo.
const NAV_BY_SCOPE = {
  srs: [
    { to: "/srs",                 label: "Operaciones",   end: true, accent: true },
    { to: "/srs/espacio-ops",     label: "Espacio OPS" },
    { to: "/srs/intervenciones",  label: "Intervenciones" },
    { to: "/srs/rollouts",        label: "Rollouts" },
    { to: "/srs/projects",        label: "Proyectos" },
    { to: "/srs/sites",           label: "Sitios" },
    { to: "/srs/techs",           label: "Técnicos" },
    { to: "/srs/agreements",      label: "Contratos" },
    { to: "/srs/insights",        label: "Inteligencia" },
    { to: "/srs/finance",         label: "Finanzas" },
    { to: "/srs/admin",           label: "Admin" },
  ],
  client: [
    { to: "/client",                  label: "Operaciones",   end: true, accent: true },
    { to: "/client/espacio-ops",      label: "Espacio OPS" },
    { to: "/client/intervenciones",   label: "Intervenciones" },
    { to: "/client/sites",            label: "Sitios" },
    { to: "/client/agreements",       label: "Contratos" },
    { to: "/client/deliverables",     label: "Entregables" },
  ],
};

const SPACE_LABEL = {
  srs:    { caps: "InsiteIQ",      title: "SRS Coordinators" },
  client: { caps: "InsiteIQ · Client", title: "Workspace" },
};

export default function V2SidebarNav({
  scope = "srs",
  buildSha = "1cc3cd6",
  region = "EU-West",
  organizationName,
}) {
  const navItems = NAV_BY_SCOPE[scope] || NAV_BY_SCOPE.srs;
  const labels = SPACE_LABEL[scope] || SPACE_LABEL.srs;
  // Para client space, mostrar el nombre de la organización en el título.
  const titleText = scope === "client" && organizationName ? organizationName : labels.title;
  return (
    // Sidebar bg surface-3 (#F4F6F8) + border-right strong, replica mock F.
    <aside className="w-[200px] bg-cl-surface-3 border-r border-cl-border-strong flex-shrink-0 flex flex-col">
      {/* Header · caps en navy strong (no amber) */}
      <div className="px-5 py-5 border-b border-cl-border-strong">
        <p
          className="label-caps-v2 mb-0.5"
          style={{ color: "#0A1628", fontWeight: 800 }}
        >
          {labels.caps}
        </p>
        <h1
          className="font-jakarta text-[15px] text-cl-text"
          style={{ fontWeight: 700, letterSpacing: "-0.005em" }}
        >
          {titleText}
        </h1>
      </div>

      {/* Nav items · activo = bg navy soft + text navy + border-left navy 3px (mock F §pattern) */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 text-[13px] overflow-y-auto wr-scroll">
        {navItems.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) => {
              const base =
                "flex items-center px-3 py-2 rounded-sm transition font-jakarta";
              if (isActive) {
                // bg navy-soft + navy text + border-left navy 3px + bold 700 (mock F)
                return `${base} text-cl-text bg-cl-amber-soft font-bold border-l-[3px] border-cl-text`;
              }
              return `${base} text-cl-text-mid font-medium hover:text-cl-text hover:bg-cl-surface-2`;
            }}
          >
            {n.label}
          </NavLink>
        ))}
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
            SISTEMA OPERATIVO
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-cl-text-dim font-jakarta" style={{ fontWeight: 500 }}>Build</span>
          <span className="font-mono text-cl-text-mid">{buildSha}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-cl-text-dim font-jakarta" style={{ fontWeight: 500 }}>Region</span>
          <span className="font-mono text-cl-text-mid">{region}</span>
        </div>
      </div>
    </aside>
  );
}
