/**
 * CockpitPage · layout compartido SRS + Client.
 * Sin copy explicativo — el usuario ya sabe lo que hace.
 */
import KpiStrip from "./KpiStrip";
import AlertsWidget from "./AlertsWidget";
import ActiveInterventions from "./ActiveInterventions";
import OperationsMap from "./OperationsMap";

export default function CockpitPage({ scope = "srs" }) {
  const isSrs = scope === "srs";
  const isClient = scope === "client";
  const baseLinkPrefix = isSrs ? "/srs" : isClient ? "/client" : "/tech";

  return (
    <div className="px-4 md:px-8 py-5 md:py-7 max-w-wide space-y-5">
      <KpiStrip isSrs={isSrs} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <OperationsMap baseLinkPrefix={baseLinkPrefix} height={420} />
          <ActiveInterventions baseLinkPrefix={baseLinkPrefix} />
        </div>
        <div className="space-y-4">
          <AlertsWidget isSrs={isSrs} isClient={isClient} />
        </div>
      </div>
    </div>
  );
}
