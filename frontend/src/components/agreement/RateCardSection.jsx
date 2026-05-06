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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("common");
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
          <SectionTitle marginBottom={2}>{t("comp_rate_card.section_title")}</SectionTitle>
          <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
            {t("comp_rate_card.header_subtitle")}
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
          {t("comp_rate_card.empty_main")}{" "}
          <span style={{ color: "#8B95A8" }}>
            {isSrs
              ? t("comp_rate_card.empty_hint_srs")
              : t("comp_rate_card.empty_hint_client")}
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
                label={t("comp_rate_card.price_per_wo")}
                value={rc.base_price_per_wo}
                currency={currency}
                suffix={t("comp_rate_card.price_per_wo_suffix")}
              />
            )}
            {rc.hourly_rate != null && (
              <PriceCard
                label={t("comp_rate_card.price_hourly")}
                value={rc.hourly_rate}
                currency={currency}
                suffix={t("comp_rate_card.price_hourly_suffix")}
              />
            )}
            {rc.monthly_fee != null && (
              <PriceCard
                label={t("comp_rate_card.price_monthly")}
                value={rc.monthly_fee}
                currency={currency}
                suffix={t("comp_rate_card.price_monthly_suffix")}
              />
            )}
            {rc.quarterly_fee != null && (
              <PriceCard
                label={t("comp_rate_card.price_quarterly")}
                value={rc.quarterly_fee}
                currency={currency}
                suffix={t("comp_rate_card.price_quarterly_suffix")}
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
              label={t("comp_rate_card.stat_parts_markup")}
              value={`${rc.parts_markup_pct}%`}
              hint={
                rc.parts_pass_through
                  ? t("comp_rate_card.stat_parts_pass_through")
                  : t("comp_rate_card.stat_parts_srs_procures")
              }
            />
            <Stat
              label={t("comp_rate_card.stat_travel")}
              value={rc.travel_included ? t("comp_rate_card.stat_travel_included") : t("comp_rate_card.stat_travel_extra")}
              hint={
                !rc.travel_included && rc.travel_flat_fee
                  ? t("comp_rate_card.stat_travel_flat_suffix", { currency, value: rc.travel_flat_fee })
                  : rc.mileage_rate_per_km
                  ? t("comp_rate_card.stat_travel_per_km_suffix", { currency, value: rc.mileage_rate_per_km })
                  : null
              }
            />
            <Stat
              label={t("comp_rate_card.stat_after_hours")}
              value={
                rc.after_hours_multiplier
                  ? `×${rc.after_hours_multiplier.toFixed(2)}`
                  : "—"
              }
              hint={rc.after_hours_multiplier ? t("comp_rate_card.stat_after_hours_hint") : null}
            />
            <Stat
              label={t("comp_rate_card.stat_threshold")}
              value={`${currency} ${agreement.parts_approval_threshold_usd?.toFixed(0) || "—"}`}
              hint={t("comp_rate_card.stat_threshold_hint")}
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
                {t("comp_rate_card.notes_label")}
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
          {t("comp_rate_card.footer")}
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
  const { t } = useTranslation("common");
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
        {agreement.rate_card ? t("comp_rate_card.btn_edit") : t("comp_rate_card.btn_load")}
      </button>

      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("comp_rate_card.modal_title")}
        subtitle={t("comp_rate_card.modal_subtitle", {
          title: agreement.title,
          currency: agreement.currency || "USD",
          shield: agreement.shield_level,
        })}
        submitLabel={t("common.save")}
        submitDisabled={!anyPrimary}
        onSubmit={submit}
      >
        <FieldGroup label={t("comp_rate_card.group_primary")} hint={t("comp_rate_card.group_primary_hint")}>
          <Grid2>
            <div>
              <DialogLabel htmlFor="rc-base" optional>
                {t("comp_rate_card.label_per_wo", { currency: agreement.currency || "USD" })}
              </DialogLabel>
              <DialogInput
                id="rc-base"
                type="number"
                step="0.01"
                min="0"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder={t("comp_rate_card.placeholder_per_wo")}
              />
            </div>
            <div>
              <DialogLabel htmlFor="rc-hr" optional>
                {t("comp_rate_card.label_hourly", { currency: agreement.currency || "USD" })}
              </DialogLabel>
              <DialogInput
                id="rc-hr"
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder={t("comp_rate_card.placeholder_hourly")}
              />
            </div>
            <div>
              <DialogLabel htmlFor="rc-mo" optional>
                {t("comp_rate_card.label_monthly", { currency: agreement.currency || "USD" })}
              </DialogLabel>
              <DialogInput
                id="rc-mo"
                type="number"
                step="0.01"
                min="0"
                value={monthlyFee}
                onChange={(e) => setMonthlyFee(e.target.value)}
                placeholder={t("comp_rate_card.placeholder_monthly")}
              />
            </div>
            <div>
              <DialogLabel htmlFor="rc-qt" optional>
                {t("comp_rate_card.label_quarterly")}
              </DialogLabel>
              <DialogInput
                id="rc-qt"
                type="number"
                step="0.01"
                min="0"
                value={quarterlyFee}
                onChange={(e) => setQuarterlyFee(e.target.value)}
                placeholder={t("comp_rate_card.placeholder_quarterly")}
              />
            </div>
          </Grid2>
        </FieldGroup>

        <FieldGroup label={t("comp_rate_card.group_parts")}>
          <Grid2>
            <div>
              <DialogLabel htmlFor="rc-pm">{t("comp_rate_card.label_markup")}</DialogLabel>
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
              <DialogLabel htmlFor="rc-thr">{t("comp_rate_card.label_threshold")}</DialogLabel>
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
            label={t("comp_rate_card.checkbox_pass_through")}
            checked={partsPassThrough}
            onChange={setPartsPassThrough}
          />
        </FieldGroup>

        <FieldGroup label={t("comp_rate_card.group_travel")}>
          <DialogCheckbox
            id="rc-tinc"
            label={t("comp_rate_card.checkbox_travel_included")}
            checked={travelIncluded}
            onChange={setTravelIncluded}
          />
          {!travelIncluded && (
            <Grid2>
              <div>
                <DialogLabel htmlFor="rc-tflat" optional>
                  {t("comp_rate_card.label_travel_flat")}
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
                  {t("comp_rate_card.label_mileage")}
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
            {t("comp_rate_card.label_after_hours")}
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
            {t("comp_rate_card.label_notes")}
          </DialogLabel>
          <DialogTextarea
            id="rc-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("comp_rate_card.placeholder_notes")}
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
