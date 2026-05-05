/**
 * V2BottomStrip — Equipo de operaciones con timezone live
 *
 * Recupera el comportamiento original (lista del equipo SRS con su hora
 * local y dot de estado laboral). Cambios respecto a la versión inicial:
 *   - Label: "Equipo de operaciones" (antes "Técnicos en pista")
 *   - Dot status: ESQUINA SUPERIOR DERECHA del avatar, contenido dentro
 *     del wrapper · sin desbordar sobre el texto adyacente.
 *
 * Fuente de los miembros: keys de TECH_REGISTRY (lib/tz.js). Cuando el
 * registry crece (Andros, Adriana, JuanCho, etc.), aparecen automáticamente.
 *
 * Refresco: tick cada 30s para mantener vivas las horas locales.
 */

import { useEffect, useState } from "react";
import { Icon, ICONS } from "../../lib/icons";
import { getTechTimeInfo, TECH_REGISTRY } from "../../lib/tz";

// Lista de miembros del equipo de operaciones.
// Por defecto, todos los keys del TECH_REGISTRY (lib/tz.js).
// Cuando se añada Andros, Adriana, JuanCho, etc. al registry, aparecen aquí.
const OPS_TEAM = Object.keys(TECH_REGISTRY);

function TeamCard({ name }) {
  const info = getTechTimeInfo(name);
  if (!info) return null;

  const dotColor = info.color;
  const pulse = info.status === "onduty";

  return (
    <div
      className="flex items-center gap-2.5 px-3 py-2 bg-cl-surface border border-cl-border rounded-md flex-shrink-0 hover:border-cl-border-strong transition"
      title={`${name} · ${info.label} · ${info.tzLabel} ${info.techTime} · ${info.offsetText}`}
    >
      {/* Avatar 24x24 con dot status en ESQUINA SUPERIOR DERECHA · contenido · estilo inline */}
      <div
        style={{
          position: "relative",
          width: 24,
          height: 24,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon icon={ICONS.user} size={18} color="#3D4A66" />
        <span
          className={pulse ? "animate-pulse" : ""}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: dotColor,
            boxShadow: "0 0 0 1.5px #FFFFFF",
          }}
          aria-label={info.label}
        />
      </div>
      <div className="leading-tight min-w-0">
        <p className="text-[12px] font-jakarta font-semibold text-cl-text truncate max-w-[160px]">
          {name}
        </p>
        <p className="text-[10px] font-mono text-cl-text-dim truncate max-w-[160px]">
          {info.tzLabel} · {info.techTime}
        </p>
      </div>
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
    <footer className="h-[84px] border-t border-cl-border bg-cl-bg flex items-center px-6 gap-4 flex-shrink-0">
      <span className="label-caps-v2 mr-2">Equipo de operaciones</span>

      <div className="flex items-center gap-2 overflow-x-auto wr-scroll flex-1 pb-1">
        {OPS_TEAM.map((name) => <TeamCard key={name} name={name} />)}
      </div>
    </footer>
  );
}
