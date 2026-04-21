/**
 * RateCardSection — display + edit del rate_card del agreement (X-a).
 * Render gated dentro del AgreementDetailPage.
 *
 * Cubre los 3 patrones de cotizacion:
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

export default function RateCardSection({ agreement, isSrs, reload }) {
  const rc = agreement.rate_card;
  const currency = agreement.currency || "USD";

  return (
    <section className="bg-surface-raised accent-bar rounded-sm mt-4">
      <header className="px-4 py-3 border-b border-surface-border flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="label-caps">Rate card</div>
          <h2 className="font-display text-base text-text-primary leading-tight">
            Tarifas del contrato
          </h2>
        </div>
        {isSrs && <EditRatesAction agreement={agreement} reload={reload} />}
      </header>

      {!rc && (
        <div className="px-4 py-6 font-body text-sm text-text-secondary">
          Sin rate card cargada. {isSrs ? (
            <span className="text-text-tertiary">
              Cargala con el boton de arriba — necesaria para pre-invoice y P&L.
            </span>
          ) : (
            <span className="text-text-tertiary">Pendiente de carga por SRS.</span>
          )}
        </div>
      )}

      {rc && (
        <div className="px-4 py-4">
          {/* Primary pricing row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div className="mt-4 bg-surface-base rounded-sm p-3">
              <div className="label-caps mb-1">Notas</div>
              <p className="font-body text-sm text-text-primary whitespace-pre-line">
                {rc.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {rc && (
        <div className="px-4 py-2 border-t border-surface-border font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          X-a · Fase 3 Admin/Finance · invoice auto-gen en X-b
        </div>
      )}
    </section>
  );
}

function PriceCard({ label, value, currency, suffix }) {
  return (
    <div className="bg-surface-base rounded-sm p-3">
      <div className="label-caps mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-display text-2xl text-text-primary leading-none">
          {value.toFixed(2)}
        </span>
        <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {currency}
        </span>
      </div>
      <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1">
        {suffix}
      </div>
    </div>
  );
}

function Stat({ label, value, hint }) {
  return (
    <div>
      <div className="label-caps mb-0.5">{label}</div>
      <div className="font-body text-sm text-text-primary">{value}</div>
      {hint && (
        <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-0.5">
          {hint}
        </div>
      )}
    </div>
  );
}

// -------------------- Edit action --------------------

function EditRatesAction({ agreement, reload }) {
  const [open, setOpen] = useState(false);
  const rc = agreement.rate_card || {};

  const [basePrice, setBasePrice] = useState(rc.base_price_per_wo ?? "");
  const [hourlyRate, setHourlyRate] = useState(rc.hourly_rate ?? "");
  const [monthlyFee, setMonthlyFee] = useState(rc.monthly_fee ?? "");
  const [quarterlyFee, setQuarterlyFee] = useState(rc.quarterly_fee ?? "");
  const [partsMarkup, setPartsMarkup] = useState(rc.parts_markup_pct ?? 60);
  const [partsPassThrough, setPartsPassThrough] = useState(
    rc.parts_pass_through ?? false
  );
  const [travelIncluded, setTravelIncluded] = useState(
    rc.travel_included ?? true
  );
  const [travelFlat, setTravelFlat] = useState(rc.travel_flat_fee ?? "");
  const [mileage, setMileage] = useState(rc.mileage_rate_per_km ?? "");
  const [afterHoursMult, setAfterHoursMult] = useState(
    rc.after_hours_multiplier ?? ""
  );
  const [notes, setNotes] = useState(rc.notes ?? "");
  const [threshold, setThreshold] = useState(
    agreement.parts_approval_threshold_usd ?? ""
  );

  // Re-sync if agreement changes underneath
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
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
        <div className="bg-surface-base rounded-sm p-3 space-y-2">
          <div className="label-caps">Precios primarios</div>
          <p className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            Completa el que aplique. Al menos uno requerido.
          </p>
          <div className="grid grid-cols-2 gap-2">
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
                placeholder="menos comun"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-base rounded-sm p-3 space-y-2">
          <div className="label-caps">Partes y materiales</div>
          <div className="grid grid-cols-2 gap-2">
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
          </div>
          <DialogCheckbox
            id="rc-pass"
            label="Parts pass-through (cliente provee, SRS no markup)"
            checked={partsPassThrough}
            onChange={setPartsPassThrough}
          />
        </div>

        <div className="bg-surface-base rounded-sm p-3 space-y-2">
          <div className="label-caps">Travel</div>
          <DialogCheckbox
            id="rc-tinc"
            label="Travel incluido en tarifa base"
            checked={travelIncluded}
            onChange={setTravelIncluded}
          />
          {!travelIncluded && (
            <div className="grid grid-cols-2 gap-2">
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
            </div>
          )}
        </div>

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
            placeholder="Cobertura geografica · items incluidos/excluidos · cap facturacion · caveats"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function toNum(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}
