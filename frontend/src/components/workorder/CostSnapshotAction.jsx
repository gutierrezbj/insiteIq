/**
 * CostSnapshotAction — SRS captura el costo que absorbio para entregar el WO.
 * Alimenta el P&L (nominal / cash-flow / proxy-adjusted) per invoice.
 *
 * Fields: labor, parts, travel, coordination_hours + rate, other.
 * Todos opcionales; se mergea con el snapshot existente (no destructivo).
 */
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../ui/ActionDialog";

export default function CostSnapshotAction({ wo, reload }) {
  const [open, setOpen] = useState(false);
  const existing = wo.cost_snapshot || {};

  const [labor, setLabor] = useState(existing.labor ?? "");
  const [parts, setParts] = useState(existing.parts ?? "");
  const [travel, setTravel] = useState(existing.travel ?? "");
  const [other, setOther] = useState(existing.other ?? "");
  const [coordHours, setCoordHours] = useState(existing.coordination_hours ?? "");
  const [coordRate, setCoordRate] = useState(
    existing.coordination_hourly_rate ?? ""
  );
  const [notes, setNotes] = useState(existing.notes ?? "");
  const [currency, setCurrency] = useState(existing.currency || "USD");

  // Resync cuando cambia el WO (por reload)
  useEffect(() => {
    const s = wo.cost_snapshot || {};
    setLabor(s.labor ?? "");
    setParts(s.parts ?? "");
    setTravel(s.travel ?? "");
    setOther(s.other ?? "");
    setCoordHours(s.coordination_hours ?? "");
    setCoordRate(s.coordination_hourly_rate ?? "");
    setNotes(s.notes ?? "");
    setCurrency(s.currency || "USD");
  }, [wo]);

  function toNum(v) {
    if (v === "" || v == null) return null;
    const n = Number(v);
    return isNaN(n) ? null : n;
  }

  const laborN = toNum(labor) || 0;
  const partsN = toNum(parts) || 0;
  const travelN = toNum(travel) || 0;
  const otherN = toNum(other) || 0;
  const coordN = (toNum(coordHours) || 0) * (toNum(coordRate) || 0);
  const directCost = laborN + partsN + travelN + otherN;

  async function submit() {
    const body = {
      labor: toNum(labor),
      parts: toNum(parts),
      travel: toNum(travel),
      other: toNum(other),
      coordination_hours: toNum(coordHours),
      coordination_hourly_rate: toNum(coordRate),
      notes: notes.trim() || null,
      currency: currency.toUpperCase() || "USD",
    };
    await api.post(`/work-orders/${wo.id}/cost-snapshot`, body);
    reload?.();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-surface-overlay text-text-secondary border border-surface-border hover:text-text-primary hover:border-primary transition-colors duration-fast"
      >
        {wo.cost_snapshot ? "Editar costo" : "Registrar costo"}
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cost snapshot · lo que SRS gasto"
        subtitle="Alimenta el P&L de la factura donde entra este WO"
        submitLabel="Guardar"
        onSubmit={submit}
      >
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="cs-labor" optional>
              Labor (tech pay)
            </DialogLabel>
            <DialogInput
              id="cs-labor"
              type="number"
              step="0.01"
              min="0"
              value={labor}
              onChange={(e) => setLabor(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-parts" optional>
              Parts (costo a SRS)
            </DialogLabel>
            <DialogInput
              id="cs-parts"
              type="number"
              step="0.01"
              min="0"
              value={parts}
              onChange={(e) => setParts(e.target.value)}
              placeholder="costo vendor, no lo que cobras"
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-travel" optional>
              Travel
            </DialogLabel>
            <DialogInput
              id="cs-travel"
              type="number"
              step="0.01"
              min="0"
              value={travel}
              onChange={(e) => setTravel(e.target.value)}
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-other" optional>
              Other
            </DialogLabel>
            <DialogInput
              id="cs-other"
              type="number"
              step="0.01"
              min="0"
              value={other}
              onChange={(e) => setOther(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-surface-base rounded-sm p-3">
          <div className="label-caps mb-2">Proxy coordination (opcional)</div>
          <p className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mb-2">
            Horas de SRS coord absorbidas (no facturadas) — Principio #3
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <DialogLabel htmlFor="cs-ch" optional>
                Coord hours
              </DialogLabel>
              <DialogInput
                id="cs-ch"
                type="number"
                step="0.5"
                min="0"
                value={coordHours}
                onChange={(e) => setCoordHours(e.target.value)}
              />
            </div>
            <div>
              <DialogLabel htmlFor="cs-cr" optional>
                Hourly rate
              </DialogLabel>
              <DialogInput
                id="cs-cr"
                type="number"
                step="0.01"
                min="0"
                value={coordRate}
                onChange={(e) => setCoordRate(e.target.value)}
                placeholder="40 / 60 / 85"
              />
            </div>
          </div>
        </div>

        <div>
          <DialogLabel htmlFor="cs-cur" optional>
            Currency
          </DialogLabel>
          <DialogInput
            id="cs-cur"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
          />
        </div>

        <div>
          <DialogLabel htmlFor="cs-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="cs-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Breakdown · caveats · referencia a vendor invoice futura"
          />
        </div>

        {/* Totals preview */}
        <div className="bg-surface-base rounded-sm p-3 border-l-2 border-primary">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              Cost directo
            </div>
            <div className="text-right font-display text-lg text-text-primary">
              {directCost.toFixed(2)} {currency}
            </div>
            {coordN > 0 && (
              <>
                <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
                  + Coord absorbido
                </div>
                <div className="text-right font-mono text-sm text-warning">
                  {coordN.toFixed(2)} {currency}
                </div>
              </>
            )}
          </div>
        </div>
      </ActionDialog>
    </>
  );
}
