/**
 * V2BottomStrip — Strip inferior con flota + técnicos timezone-aware
 *
 * Extraído 1:1 de `mocks/insiteiq_cockpit_srs_dark_v2_static.html`.
 * Design System v1.7 §3.6a (timezone-aware personas) + §4.2.
 *
 * Estructura:
 * - Label "Equipo activo" izq
 * - Mini-cards de vehículos (bus icon + nombre + operador + dot status)
 * - Separator
 * - Lista horizontal scrollable de técnicos con hora local live + dot status
 *
 * Los técnicos vienen del TECH_REGISTRY en lib/tz.js — tu fuente de verdad
 * para zonas horarias por tech. Los vehículos son hardcoded por ahora,
 * pendiente endpoint `/api/fleet` (fase Zeta).
 */

import { useEffect, useState } from "react";
import { Icon, ICONS } from "../../lib/icons";
import { getTechTimeInfo } from "../../lib/tz";

// Hardcoded fleet mock · mover a /api/fleet cuando exista
const FLEET = [
  { id: "SRS-01", label: "Furgoneta SRS-01", operator: "Agustín C.", location: "Madrid", status: "active" },
  { id: "SRS-02", label: "Furgoneta SRS-02", operator: "Hugo Q.",    location: "Barcelona", status: "en_route" },
];

// Techs a mostrar en el strip · ampliar/filtrar cuando conectemos /api/users
const TECHS_IN_STRIP = ["Agustín C.", "Hugo Q.", "Arlindo O.", "Luis S.", "Yunus H."];

function VehicleCard({ vehicle }) {
  const dotColor = vehicle.status === "active" ? "#22C55E"
    : vehicle.status === "en_route" ? "#F59E0B"
    : "#6B7280";

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-wr-surface border border-wr-border rounded-sm flex-shrink-0">
      <Icon icon={ICONS.bus} size={16} color="#F59E0B" />
      <div className="leading-tight">
        <p className="text-[10px] text-wr-text-mid uppercase tracking-wider">{vehicle.label}</p>
        <p className="text-[11px] font-mono text-wr-text">
          {vehicle.location} · {vehicle.operator}
        </p>
      </div>
      <span
        className="w-1.5 h-1.5 rounded-full ml-1"
        style={{ background: dotColor }}
      />
    </div>
  );
}

function TechCard({ techName }) {
  const info = getTechTimeInfo(techName);
  if (!info) return null;

  const dotColor = info.color;
  const isPulse = info.status === "onduty";

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-wr-surface border border-wr-border rounded-sm flex-shrink-0">
      <Icon icon={ICONS.user} size={14} color="#9CA3AF" />
      <div className="leading-tight">
        <p className="text-[11px] text-wr-text">{techName}</p>
        <p className="text-[10px] font-mono text-wr-text-dim">
          {info.tzLabel} · {info.techTime}
        </p>
      </div>
      <span
        className={`w-1.5 h-1.5 rounded-full ml-1${isPulse ? " animate-pulse-dot" : ""}`}
        style={{ background: dotColor }}
        title={info.label}
      />
    </div>
  );
}

export default function V2BottomStrip() {
  // Trigger re-render cada 30s para refrescar horas locales
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="h-[84px] border-t border-wr-border bg-wr-bg flex items-center px-6 gap-4 flex-shrink-0">
      <span className="label-caps-v2 mr-2">Equipo activo</span>

      {/* Vehículos */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {FLEET.map((v) => <VehicleCard key={v.id} vehicle={v} />)}
      </div>

      <div className="w-px h-12 bg-wr-border" />

      {/* Técnicos */}
      <div className="flex items-center gap-2 overflow-x-auto wr-scroll flex-1 pb-1">
        {TECHS_IN_STRIP.map((t) => <TechCard key={t} techName={t} />)}
      </div>
    </footer>
  );
}
