/**
 * CockpitPage · "Cockpit de Operaciones" compartido SRS + Client.
 *
 * Principio #1 (Blueprint v1.2):
 *  - OPERATIVO: transparente para el cliente (mapa, tech, ETA, cards, alertas)
 *  - COMERCIAL/FINANCIERO: opaco (margins, costs, threads internos → nunca aqui)
 *
 * Layout (desktop-first, responsive):
 *   ┌────────────────────────────────────────────────────────┐
 *   │  KPI STRIP (5 tiles)                                   │
 *   ├─────────────────────────────┬──────────────────────────┤
 *   │  MAPA (siguiente pasito)     │  ALERTAS OPERATIVAS      │
 *   │  INTERVENCIONES ACTIVAS      │                          │
 *   └─────────────────────────────┴──────────────────────────┘
 *
 * Z-d sumara el mapa Leaflet en el hueco marcado.
 */
import { useAuth } from "../../contexts/AuthContext";
import KpiStrip from "./KpiStrip";
import AlertsWidget from "./AlertsWidget";
import ActiveInterventions from "./ActiveInterventions";
import OperationsMap from "./OperationsMap";

export default function CockpitPage({ scope = "srs" }) {
  const { user } = useAuth();
  const isSrs = scope === "srs";
  const isClient = scope === "client";
  const baseLinkPrefix = isSrs ? "/srs" : isClient ? "/client" : "/tech";

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide space-y-5">
      {/* Header */}
      <div className="accent-bar pl-4">
        <div className="label-caps">
          {isSrs ? "SRS · Cockpit de operaciones" : "Cockpit"}
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-text-primary tracking-tight leading-tight">
          {isSrs
            ? "Control center · toda la operacion en vivo"
            : "Tus intervenciones · en tiempo real"}
        </h1>
        <p className="font-body text-text-secondary mt-1 max-w-3xl">
          {isSrs
            ? "Flujo radical transparente para el coordinador. Mapa + cards + alertas. La ropa (margenes/costos/threads internos) se lava en casa."
            : "Transparencia operativa sobre tus intervenciones: donde van los techs, estado de las WOs, alertas que impactan tu servicio. Los numeros internos SRS quedan en casa."}
        </p>
      </div>

      {/* KPI strip */}
      <KpiStrip isSrs={isSrs} />

      {/* Main grid: cards + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <OperationsMap baseLinkPrefix={baseLinkPrefix} height={420} />
          <ActiveInterventions baseLinkPrefix={baseLinkPrefix} />
        </div>
        <div className="space-y-4">
          <AlertsWidget isSrs={isSrs} isClient={isClient} />
        </div>
      </div>

      {/* Footer signature */}
      <div className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary text-center pt-6">
        InsiteIQ · cockpit v1 · {user?.full_name || user?.email}
      </div>
    </div>
  );
}
