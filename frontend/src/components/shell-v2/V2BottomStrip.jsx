/**
 * V2BottomStrip — Strip inferior con técnicos REALMENTE en pista
 *
 * Antes leía de un array hardcoded TECHS_IN_STRIP que mostraba siempre
 * los mismos 5 nombres con la hora actual de su timezone, dando la falsa
 * sensación de que estaban "en pista" cuando solo estaban dentro de su
 * franja horaria laboral.
 *
 * Ahora cruza /api/work-orders + /api/users + /api/sites en useTechsOnDuty
 * y pinta SOLO los técnicos con WO activa en status dispatched / en_route /
 * on_site. Si no hay ninguno → empty state honesto.
 *
 * Hook: lib/useTechsOnDuty.js
 */

import { Icon, ICONS } from "../../lib/icons";
import { useTechsOnDuty } from "../../lib/useTechsOnDuty";

// Colores del dot por status — alineados con DS v2
const STATUS_DOT = {
  dispatched: { color: "#3B82F6", label: "Despachado",  pulse: false }, // azul
  en_route:   { color: "#F59E0B", label: "En camino",   pulse: true  }, // amber pulse
  on_site:    { color: "#10B981", label: "En sitio",    pulse: true  }, // verde pulse
};

function TechCard({ item }) {
  const dot = STATUS_DOT[item.woStatus] || { color: "#94A3B8", label: item.woStatus, pulse: false };

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 bg-cl-surface border border-cl-border rounded-md flex-shrink-0 hover:border-cl-border-strong transition"
      title={`${item.techName} · ${dot.label} · ${item.siteName} · ${item.woCode}${item.woReference ? ` · ${item.woReference}` : ""}`}
    >
      <Icon icon={ICONS.user} size={18} color="#3D4A66" className="flex-shrink-0" />
      <div className="leading-tight min-w-0">
        <p className="text-[12px] font-jakarta font-semibold text-cl-text truncate max-w-[160px]">
          {item.techName}
        </p>
        <p className="text-[10px] font-mono text-cl-text-dim truncate max-w-[160px]">
          {item.siteName} · {item.woCode}
        </p>
      </div>
      {/* Dot status simple, plano, a la derecha del card · igual al patrón de admin */}
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ml-1${dot.pulse ? " animate-pulse" : ""}`}
        style={{ background: dot.color }}
        aria-label={dot.label}
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center gap-2 text-[12px] font-jakarta text-cl-text-dim italic px-2">
      <span
        className="w-1.5 h-1.5 rounded-full bg-cl-border-strong"
        aria-hidden
      />
      Sin intervenciones activas en este momento
    </div>
  );
}

function LoadingSkel() {
  return (
    <div className="flex items-center gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[44px] w-[180px] rounded-md bg-cl-surface border border-cl-border animate-pulse flex-shrink-0"
        />
      ))}
    </div>
  );
}

export default function V2BottomStrip() {
  const { loading, error, items } = useTechsOnDuty({ pollMs: 60000 });

  return (
    <footer className="h-[84px] border-t border-cl-border bg-cl-bg flex items-center px-6 gap-4 flex-shrink-0">
      <span className="label-caps-v2 mr-2">Técnicos en pista</span>

      <div className="flex items-center gap-2 overflow-x-auto wr-scroll flex-1 pb-1">
        {loading && items.length === 0 && <LoadingSkel />}
        {!loading && error && (
          <div className="text-[12px] font-jakarta text-cl-text-dim italic px-2">
            No se pudo cargar el estado de pista
          </div>
        )}
        {!loading && !error && items.length === 0 && <EmptyState />}
        {items.length > 0 && items.map((it) => <TechCard key={it.techId} item={it} />)}
      </div>

      {/* Counter discreto a la derecha */}
      {items.length > 0 && (
        <span className="text-[10px] font-mono text-cl-text-dim tabular-nums whitespace-nowrap pl-2 border-l border-cl-border">
          {items.length} {items.length === 1 ? "tech" : "techs"}
        </span>
      )}
    </footer>
  );
}
