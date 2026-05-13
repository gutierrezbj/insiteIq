/**
 * EditOrgAction — SRS owner/director edita una organización existente.
 *
 * PATCH /api/organizations/{id} acepta legal_name, display_name, country,
 * jurisdiction, tax_ids, status, partner_relationships, notes.
 *
 * Soporta múltiples partner_relationships (una org puede ser cliente +
 * channel + JV simultáneamente · ej. Fervimax).
 */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import ActionDialog, {
  DialogCheckbox,
  DialogInput,
  DialogLabel,
  DialogPanel,
  DialogSelect,
  DialogTextarea,
} from "../ui/ActionDialog";

const PARTNER_TYPES = [
  "client",
  "channel_partner",
  "vendor_labor",
  "vendor_material",
  "vendor_service",
  "end_client_metadata",
  "prime_contractor",
  "joint_venture_partner",
];

const STATUS_OPTIONS_KEYS = [
  { v: "active",   k: "modal_edit_org.status_active" },
  { v: "inactive", k: "modal_edit_org.status_inactive" },
  { v: "archived", k: "modal_edit_org.status_archived" },
];

export default function EditOrgAction({ org, onSaved }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [taxIdPrimary, setTaxIdPrimary] = useState("");
  const [partners, setPartners] = useState([]); // array of {type, status, notes?}
  const [statusValue, setStatusValue] = useState("active");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !org) return;
    setLegalName(org.legal_name || "");
    setDisplayName(org.display_name || "");
    setCountry(org.country || "");
    setJurisdiction(org.jurisdiction || "");
    setTaxIdPrimary(org.tax_ids?.primary || "");
    setPartners(
      (org.partner_relationships || []).map((p) => ({
        type: p.type,
        status: p.status || "active",
        notes: p.notes || "",
      }))
    );
    setStatusValue(org.status || "active");
    setNotes(org.notes || "");
    setError(null);
  }, [open, org]);

  function close() {
    setOpen(false);
    setTimeout(() => setError(null), 300);
    onSaved?.();
  }

  function addPartner() {
    // Sugerir un tipo que no exista ya en la lista
    const existing = new Set(partners.map((p) => p.type));
    const nextType = PARTNER_TYPES.find((pt) => !existing.has(pt)) || "client";
    setPartners([...partners, { type: nextType, status: "active", notes: "" }]);
  }

  function updatePartner(i, key, value) {
    setPartners(partners.map((p, idx) => (idx === i ? { ...p, [key]: value } : p)));
  }

  function removePartner(i) {
    setPartners(partners.filter((_, idx) => idx !== i));
  }

  const canSubmit = legalName.trim().length > 0;

  async function submit() {
    setError(null);
    const taxIds = taxIdPrimary.trim() ? { primary: taxIdPrimary.trim() } : {};
    const body = {
      legal_name: legalName.trim(),
      display_name: displayName.trim() || null,
      country: country.trim().toUpperCase() || null,
      jurisdiction: jurisdiction.trim() || null,
      tax_ids: taxIds,
      status: statusValue,
      partner_relationships: partners.map((p) => ({
        type: p.type,
        status: p.status,
        notes: p.notes || null,
      })),
      notes: notes.trim() || null,
    };
    try {
      await api.patch(`/organizations/${org.id}`, body);
      close();
    } catch (err) {
      setError(t("modal_edit_org.toast_save_error", { message: err.message || err }));
    }
  }

  const statusOptions = STATUS_OPTIONS_KEYS.map((o) => ({ v: o.v, l: t(o.k) }));

  if (!org) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#3D4A66",
          background: "transparent",
          border: "1px solid #C8CDD8",
          borderRadius: 4,
          padding: "4px 8px",
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
          e.currentTarget.style.background = "transparent";
        }}
        title={t("modal_edit_org.btn_trigger_tooltip")}
      >
        {t("modal_edit_org.btn_trigger")}
      </button>

      <ActionDialog
        open={open}
        onClose={close}
        title={t("modal_edit_org.title")}
        subtitle={t("modal_edit_org.subtitle", { name: org.legal_name })}
        submitLabel={t("modal_edit_org.btn_save")}
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="eo-legal">{t("modal_edit_org.label_legal")}</DialogLabel>
          <DialogInput
            id="eo-legal"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="eo-display" optional>
            {t("modal_edit_org.label_display")}
          </DialogLabel>
          <DialogInput
            id="eo-display"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="eo-country" optional>
              {t("modal_edit_org.label_country")}
            </DialogLabel>
            <DialogInput
              id="eo-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={2}
            />
          </div>
          <div>
            <DialogLabel htmlFor="eo-jur" optional>
              {t("modal_edit_org.label_jurisdiction")}
            </DialogLabel>
            <DialogInput
              id="eo-jur"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
            />
          </div>
        </div>
        <div>
          <DialogLabel htmlFor="eo-tax" optional>
            {t("modal_edit_org.label_tax")}
          </DialogLabel>
          <DialogInput
            id="eo-tax"
            value={taxIdPrimary}
            onChange={(e) => setTaxIdPrimary(e.target.value)}
          />
        </div>
        <div>
          <DialogLabel htmlFor="eo-status">{t("modal_edit_org.label_status")}</DialogLabel>
          <DialogSelect
            id="eo-status"
            value={statusValue}
            onChange={setStatusValue}
            options={statusOptions}
          />
        </div>

        <DialogPanel label={t("modal_edit_org.panel_partners")}>
          <p
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12.5,
              color: "#3D4A66",
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          >
            {t("modal_edit_org.partners_explainer")}
          </p>
          {partners.length === 0 && (
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: "#8B95A8",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              {t("modal_edit_org.no_partners")}
            </div>
          )}
          {partners.map((p, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 2fr auto",
                gap: 8,
                alignItems: "end",
                padding: "8px 10px",
                background: "#F4F6F8",
                border: "1px solid #E2E5EC",
                borderRadius: 6,
              }}
            >
              <div>
                <DialogLabel htmlFor={`eo-p-type-${i}`}>{t("modal_edit_org.partner_type")}</DialogLabel>
                <DialogSelect
                  id={`eo-p-type-${i}`}
                  value={p.type}
                  onChange={(v) => updatePartner(i, "type", v)}
                  options={PARTNER_TYPES.map((pt) => ({ v: pt, l: pt }))}
                />
              </div>
              <div>
                <DialogLabel htmlFor={`eo-p-status-${i}`}>{t("modal_edit_org.partner_status")}</DialogLabel>
                <DialogSelect
                  id={`eo-p-status-${i}`}
                  value={p.status}
                  onChange={(v) => updatePartner(i, "status", v)}
                  options={[
                    { v: "active", l: t("modal_edit_org.partner_status_active") },
                    { v: "paused", l: t("modal_edit_org.partner_status_paused") },
                    { v: "ended", l: t("modal_edit_org.partner_status_ended") },
                  ]}
                />
              </div>
              <div>
                <DialogLabel htmlFor={`eo-p-notes-${i}`} optional>
                  {t("modal_edit_org.partner_notes")}
                </DialogLabel>
                <DialogInput
                  id={`eo-p-notes-${i}`}
                  value={p.notes}
                  onChange={(e) => updatePartner(i, "notes", e.target.value)}
                  placeholder={t("modal_edit_org.partner_notes_placeholder")}
                />
              </div>
              <button
                type="button"
                onClick={() => removePartner(i)}
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#991B1B",
                  background: "transparent",
                  border: "1px solid #FCA5A5",
                  borderRadius: 4,
                  padding: "4px 8px",
                  cursor: "pointer",
                  height: 38,
                  alignSelf: "end",
                }}
              >
                {t("modal_edit_org.partner_remove")}
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addPartner}
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#3D4A66",
              background: "#FFFFFF",
              border: "1.5px dashed #C8CDD8",
              borderRadius: 6,
              padding: "8px 14px",
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
            {t("modal_edit_org.partner_add")}
          </button>
        </DialogPanel>

        <div>
          <DialogLabel htmlFor="eo-notes" optional>
            {t("modal_edit_org.label_notes")}
          </DialogLabel>
          <DialogTextarea
            id="eo-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderLeft: "3px solid #DC2626",
              color: "#991B1B",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 14px",
              borderRadius: 4,
            }}
          >
            {error}
          </div>
        )}
      </ActionDialog>
    </>
  );
}
