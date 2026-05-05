/**
 * RateCardSection · v2 paleta F (Iter 2.31).
 *
 * Display + edit del rate_card del agreement (X-a). Render gated dentro
 * del AgreementDetailPage. Cubre los 3 patrones de cotización:
 *   - break-fix reactivo: base_price_per_wo
 *   - hourly engagement: hourly_rate
 *   - recurring: monthly_fee / quarterly_fee
 * + parts markup / travel / after-hours uplift.
 *
 * Edit limitado a SRS owner/director (backend enforce). Cliente solo ve.
 */
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import ActionDialog, {
  DialogCheckbox,
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../ui/ActionDialog";
import SectionCard, { SectionTitle } from "../v2-shared/SectionCard";
import { JAKARTA, MONO, MONO_CAPS } from "../v2-shared/typography";

export default function RateCardSection({ agreement, isSrs, reload }) {
  const rc = agreement.rate_card;
  const currency = agreement.currency || "USD";

  return (
    <SectionCard padding={0} style={{ marginTop: 16 }}>
      <header
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #E2E5EC",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <SectionTitle marginBottom={2}>Rate card</SectionTitle>
          <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
            Tarifas del contrato
          </div>
        </div>
        {isSrs && <EditRatesAction agreement={agreement} reload={reload} />}
      </header>

      {!rc && (
        <div
          style={{
            padding: "20px 18px",
            fontFamily: JAKARTA,
            fontSize: 13,
            color: "#3D4A66",
            fontWeight: 500,
            lineHeight: 1.55,
          }}
        >
          Sin rate card cargada.{" "}
          <span style={{ color: "#8B95A8" }}>
            {isSrs
              ? "Cárgala con el botón de arriba — necesaria para pre-invoice y P&L."
              : "Pendiente de carga por SRS."}
          </span>
        </div>
      )}

      {rc && (
        <div style={{ padding: 18 }}>
          {/* Primary pricing row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {rc.base_price_per_wo != null && (
              <PriceCard
                label="Per work order"
                value={rc.base_price_per_wo}
                currency={currency}
                suffix="/WO"
              />
            )}
            {rc.hourly_rate != null && (
              <PriceCard
                label="Hourly rate"
                value={rc.hourly_rate}
                currency={currency}
                suffix="/h"
              />
            )}
            {rc.monthly_fee != null && (
              <PriceCard
                label="Monthly fee"
                value={rc.monthly_fee}
                currency={currency}
                suffix="/mes"
              />
            )}
            {rc.quarterly_fee != null && (
              <PriceCard
                label="Quarterly fee"
                value={rc.quarterly_fee}
                currency={currency}
                suffix="/Q"
              />
            )}
          </div>

          {/* Modifiers row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 16,
            }}
          >
            <Stat
              label="Parts markup"
              value={`${rc.parts_markup_pct}%`}
              hint={
                rc.parts_pass_through
                  ? "pass-through (cliente provee)"
                  : "srs procures + markup"
              }
            />
            <Stat
              label="Travel"
              value={rc.travel_included ? "incluido" : "extra"}
              hint={
                !rc.travel_included && rc.travel_flat_fee
                  ? `${currency} ${rc.travel_flat_fee} flat`
                  : rc.mileage_rate_per_km
                  ? `${currency} ${rc.mileage_rate_per_km}/km`
                  : null
              }
            />
            <Stat
              label="After hours"
              value={
                rc.after_hours_multiplier
                  ? `×${rc.after_hours_multiplier.toFixed(2)}`
                  : "—"
              }
              hint={rc.after_hours_multiplier ? "uplift nocturno/fines" : null}
            />
            <Stat
              label="Threshold partes"
              value={`${currency} ${agreement.parts_approval_threshold_usd?.toFixed(0) || "—"}`}
              hint="auto-approved bajo este monto"
            />
          </div>

          {rc.notes && (
            <div
              style={{
                marginTop: 16,
                background: "#F4F6F8",
                border: "1px solid #E2E5EC",
                borderRadius: 4,
                padding: "12px 14px",
              }}
            >
              <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
                Notas
              </div>
              <p
                style={{
                  fontFamily: JAKARTA,
                  fontSize: 13,
                  color: "#0A1628",
                  whiteSpace: "pre-line",
                  fontWeight: 500,
                  lineHeight: 1.55,
                }}
              >
                {rc.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {rc && (
        <div
          style={{
            padding: "10px 18px",
            borderTop: "1px solid #E2E5EC",
            ...MONO_CAPS,
            fontSize: 9.5,
            color: "#8B95A8",
            letterSpacing: "0.14em",
          }}
        >
          X-a · Fase 3 Admin/Finance · invoice auto-gen en X-b
        </div>
      )}
    </SectionCard>
  );
}

function PriceCard({ label, value, currency, suffix }) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeft: "3px solid #0A1628",
        borderRadius: 6,
        padding: "12px 14px",
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          style={{
            fontFamily: JAKARTA,
            fontSize: 24,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.01em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {value.toFixed(2)}
        </span>
        <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em" }}>
          {currency}
        </span>
      </div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 6 }}>
        {suffix}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div>
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
        {value}
      </div>
      {hint && (
        <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginTop: 2, fontWeight: 600 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

/* ─── Edit action ──────────────────────────────────────────────── */

function EditRatesAction({ agreement, reload }) {
  const [open, setOpen] = useState(false);
  const rc = agreement.rate_card || {};

  const [basePrice, setBasePrice] = useState(rc.base_price_per_wo ?? "");
  const [hourlyRate, setHourlyRate] = useState(rc.hourly_rate ?? "");
  const [monthlyFee, setMonthlyFee] = useState(rc.monthly_fee ?? "");
  const [quarterlyFee, setQuarterlyFee] = useState(rc.quarterly_fee ?? "");
  const [partsMarkup, setPartsMarkup] = useState(rc.parts_markup_pct ?? 60);
  const [partsPassThrough, setPartsPassThrough] = useState(rc.parts_pass_through ?? false);
  const [travelIncluded, setTravelIncluded] = useState(rc.travel_included ?? true);
  const [travelFlat, setTravelFlat] = useState(rc.travel_flat_fee ?? "");
  const [mileage, setMileage] = useState(rc.mileage_rate_per_km ?? "");
  const [afterHoursMult, setAfterHoursMult] = useState(rc.after_hours_multiplier ?? "");
  const [notes, setNotes] = useState(rc.notes ?? "");
  const [threshold, setThreshold] = useState(agreement.parts_approval_threshold_usd ?? "");

  useEffect(() => {
    const next = agreement.rate_card || {};
    setBasePrice(next.base_price_per_wo ?? "");
    setHourlyRate(next.hourly_rate ?? "");
    setMonthlyFee(next.monthly_fee ?? "");
    setQuarterlyFee(next.quarterly_fee ?? "");
    setPartsMarkup(next.parts_markup_pct ?? 60);
    setPartsPassThrough(next.parts_pass_through ?? false);
    setTravelIncluded(next.travel_included ?? true);
    setTravelFlat(next.travel_flat_fee ?? "");
    setMileage(next.mileage_rate_per_km ?? "");
    setAfterHoursMult(next.after_hours_multiplier ?? "");
    setNotes(next.notes ?? "");
    setThreshold(agreement.parts_approval_threshold_usd ?? "");
  }, [agreement]);

  const anyPrimary =
    toNum(basePrice) != null ||
    toNum(hourlyRate) != null ||
    toNum(monthlyFee) != null ||
    toNum(quarterlyFee) != null;

  async function submit() {
    const rate_card = {
      base_price_per_wo: toNum(basePrice),
      hourly_rate: toNum(hourlyRate),
      monthly_fee: toNum(monthlyFee),
      quarterly_fee: toNum(quarterlyFee),
      parts_markup_pct: Number(partsMarkup) || 0,
      parts_pass_through: !!partsPassThrough,
      travel_included: !!travelIncluded,
      travel_flat_fee: toNum(travelFlat),
      mileage_rate_per_km: toNum(mileage),
      after_hours_multiplier: toNum(afterHoursMult),
      notes: notes.trim() || null,
    };
    const body = { rate_card };
    const thresholdNum = toNum(threshold);
    if (thresholdNum != null) body.parts_approval_threshold_usd = thresholdNum;

    await api.patch(`/service-agreements/${agreement.id}`, body);
    reload?.();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-trigger-v2">
        {agreement.rate_card ? "Editar tarifas" : "+ Cargar tarifas"}
      </button>

      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Rate card · editar tarifas"
        subtitle={`${agreement.title} · ${agreement.currency || "USD"} · shield ${agreement.shield_level}`}
        submitLabel="Guardar"
        submitDisabled={!anyPrimary}
        onSubmit={submit}
      >
        <FieldGroup label="Precios primarios" hint="Completa el que aplique. Al menos uno requerido.">
          <Grid2>
            <div>
              <DialogLabel htmlFor="rc-base" optional>
                Per WO ({agreement.currency || "USD"})
              </DialogLabel>
              <DialogInput
                id="rc-base"
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="break-fix volume"
              />
            </div>
            <div>
              <DialogLabel htmlFor="rc-hr" optional>
                Hourly ({agreement.currency || "USD"}/h)
              </DialogLabel>
              <DialogInput
                id="rc-hr"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="audit / survey / migration"
              />
            </div>
            <div>
              <DialogLabel htmlFor="rc-mo" optional>
                Monthly ({agreement.currency || "USD"}/mes)
              </DialogLabel>
              <DialogInput
                id="rc-mo"
                type="number"
                step="0.01"
                min="0"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                placeholder="recurring / subscription"
              />
            </div>
            <div>
              <DialogLabel htmlFor="rc-qt" optional>
                Quarterly
              </DialogLabel>
              <DialogInput
                id="rc-qt"
                type="number"
                step="0.01"
                min="0"
                value={quarterlyFee}
                onChange={(e) => setQuarterlyFee(e.target.value)}
                placeholder="menos común"
              />
            </div>
          </Grid2>
        </FieldGroup>

        <FieldGroup label="Partes y materiales">
          <Grid2>
            <div>
              <DialogLabel htmlFor="rc-pm">Markup % (default 60)</DialogLabel>
              <DialogInput
                id="rc-pm"
                type="number"
                step="0.1"
                min="0"
                value={partsMarkup}
                onChange={(e) => setPartsMarkup(e.target.value)}
              />
            </div>
            <div>
              <DialogLabel htmlFor="rc-thr">Threshold auto-approve</DialogLabel>
              <DialogInput
                id="rc-thr"
                type="number"
                step="1"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="200"
              />
            </div>
          </Grid2>
          <DialogCheckbox
            id="rc-pass"
            label="Parts pass-through (cliente provee, SRS no markup)"
            checked={partsPassThrough}
            onChange={setPartsPassThrough}
          />
        </FieldGroup>

        <FieldGroup label="Travel">
          <DialogCheckbox
            id="rc-tinc"
            label="Travel incluido en tarifa base"
            checked={travelIncluded}
            onChange={setTravelIncluded}
          />
          {!travelIncluded && (
            <Grid2>
              <div>
                <DialogLabel htmlFor="rc-tflat" optional>
                  Flat por visita
                </DialogLabel>
                <DialogInput
                  id="rc-tflat"
                  type="number"
                  step="0.01"
                  min="0"
                  value={travelFlat}
                  onChange={(e) => setTravelFlat(e.target.value)}
                />
              </div>
              <div>
                <DialogLabel htmlFor="rc-mile" optional>
                  Rate per km
                </DialogLabel>
                <DialogInput
                  id="rc-mile"
                  type="number"
                  step="0.01"
                  min="0"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                />
              </div>
            </Grid2>
          )}
        </FieldGroup>

        <div>
          <DialogLabel htmlFor="rc-ah" optional>
            After-hours multiplier (ej. 1.25 = +25% noches/fines)
          </DialogLabel>
          <DialogInput
            id="rc-ah"
            type="number"
            step="0.05"
            min="1"
            value={afterHoursMult}
            onChange={(e) => setAfterHoursMult(e.target.value)}
            placeholder="1.25"
          />
        </div>

        <div>
          <DialogLabel htmlFor="rc-notes" optional>
            Notas / condiciones del rate card
          </DialogLabel>
          <DialogTextarea
            id="rc-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cobertura geográfica · items incluidos/excluidos · cap facturación · caveats"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function FieldGroup({ label, hint, children }) {
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 6,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em" }}>
        {label}
      </div>
      {hint && (
        <p style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", fontWeight: 600 }}>
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function Grid2({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {children}
    </div>
  );
}

function toNum(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
