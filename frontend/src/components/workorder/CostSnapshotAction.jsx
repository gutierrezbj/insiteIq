/**
 * CostSnapshotAction — SRS captura el costo que absorbio para entregar el WO.
 * Alimenta el P&L (nominal / cash-flow / proxy-adjusted) per invoice.
 *
 * Fields: labor, parts, travel, coordination_hours + rate, other.
 * Todos opcionales; se mergea con el snapshot existente (no destructivo).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogPanel,
  DialogTextarea,
} from "../ui/ActionDialog";

export default function CostSnapshotAction({ wo, reload }) {
  const { t } = useTranslation("common");
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
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontSize: 11,
          padding: "8px 14px",
          background: "#FFFFFF",
          color: "#3D4A66",
          border: "1.5px solid #C8CDD8",
          borderRadius: 6,
          cursor: "pointer",
          transition: "all 160ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#0A1628";
          e.currentTarget.style.borderColor = "#0A1628";
          e.currentTarget.style.background = "#F4F6F8";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#3D4A66";
          e.currentTarget.style.borderColor = "#C8CDD8";
          e.currentTarget.style.background = "#FFFFFF";
        }}
      >
        {wo.cost_snapshot ? t("wo_cost.btn_edit") : t("wo_cost.btn_register")}
      </button>
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("wo_cost.modal_title")}
        subtitle={t("wo_cost.modal_subtitle")}
        submitLabel={t("wo_cost.modal_submit")}
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
              placeholder={t("wo_cost.parts_placeholder")}
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

        <DialogPanel label={t("wo_cost.panel_proxy_optional")}>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontSize: 9.5,
              color: "#8B95A8",
            }}
          >
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
                placeholder={t("wo_cost.rate_placeholder")}
              />
            </div>
          </div>
        </DialogPanel>

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
            placeholder={t("wo_cost.notes_placeholder")}
          />
        </div>

        {/* Totals preview */}
        <div
          style={{
            background: "#F4F6F8",
            border: "1px solid #E2E5EC",
            borderLeft: "3px solid #0A1628",
            borderRadius: 4,
            padding: "10px 14px",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontSize: 9.5,
                color: "#3D4A66",
                alignSelf: "center",
              }}
            >
              Cost directo
            </div>
            <div
              style={{
                textAlign: "right",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 18,
                fontWeight: 800,
                color: "#0A1628",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {directCost.toFixed(2)} {currency}
            </div>
            {coordN > 0 && (
              <>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontSize: 9.5,
                    color: "#3D4A66",
                    alignSelf: "center",
                  }}
                >
                  + Coord absorbido
                </div>
                <div
                  style={{
                    textAlign: "right",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    color: "#7E5212",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
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
