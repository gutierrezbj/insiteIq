/**
 * CreateOrgAction — SRS owner/director crea organizacion con al menos
 * una partner_relationship activa (cliente / channel partner / vendor / etc).
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api";
import ActionDialog, {
  DialogCountrySelect,
  DialogInput,
  DialogLabel,
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

export default function CreateOrgAction({ onCreated }) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [legalName, setLegalName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [taxId, setTaxId] = useState("");
  const [partnerType, setPartnerType] = useState("client");
  const [notes, setNotes] = useState("");

  function reset() {
    setLegalName("");
    setDisplayName("");
    setCountry("");
    setJurisdiction("");
    setTaxId("");
    setPartnerType("client");
    setNotes("");
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 300);
  }

  const canSubmit = legalName.trim().length > 0;

  async function submit() {
    const taxIds = taxId.trim() ? { primary: taxId.trim() } : {};
    const body = {
      legal_name: legalName.trim(),
      display_name: displayName.trim() || null,
      country: country.trim().toUpperCase() || null,
      jurisdiction: jurisdiction.trim() || null,
      tax_ids: taxIds,
      partner_relationships: [
        { type: partnerType, status: "active" },
      ],
      notes: notes.trim() || null,
    };
    const res = await api.post("/organizations", body);
    reset();
    close();
    onCreated?.(res);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-trigger-v2"
      >
        {t("modal_create_org.btn_trigger")}
      </button>

      <ActionDialog
        open={open}
        onClose={close}
        title={t("modal_create_org.title")}
        subtitle={t("modal_create_org.subtitle")}
        submitLabel={t("modal_create_org.btn_submit")}
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="co-legal">{t("modal_create_org.label_legal")}</DialogLabel>
          <DialogInput
            id="co-legal"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder={t("modal_create_org.placeholder_legal")}
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="co-display" optional>
            {t("modal_create_org.label_display")}
          </DialogLabel>
          <DialogInput
            id="co-display"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("modal_create_org.placeholder_display")}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="co-country" optional>
              {t("modal_create_org.label_country")}
            </DialogLabel>
            <DialogCountrySelect
              id="co-country"
              value={country}
              onChange={setCountry}
            />
          </div>
          <div>
            <DialogLabel htmlFor="co-jur" optional>
              {t("modal_create_org.label_jurisdiction")}
            </DialogLabel>
            <DialogInput
              id="co-jur"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder={t("modal_create_org.placeholder_jurisdiction")}
            />
          </div>
        </div>
        <div>
          <DialogLabel htmlFor="co-tax" optional>
            {t("modal_create_org.label_tax")}
          </DialogLabel>
          <DialogInput
            id="co-tax"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder={t("modal_create_org.placeholder_tax")}
          />
        </div>
        <div>
          <DialogLabel htmlFor="co-partner">{t("modal_create_org.label_partner")}</DialogLabel>
          <DialogSelect
            id="co-partner"
            value={partnerType}
            onChange={setPartnerType}
            options={PARTNER_TYPES.map((pt) => ({ v: pt, l: pt }))}
          />
        </div>
        <div>
          <DialogLabel htmlFor="co-notes" optional>
            {t("modal_create_org.label_notes")}
          </DialogLabel>
          <DialogTextarea
            id="co-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("modal_create_org.placeholder_notes")}
          />
        </div>
      </ActionDialog>
    </>
  );
}
