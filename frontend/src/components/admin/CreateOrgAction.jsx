/**
 * CreateOrgAction — SRS owner/director crea organizacion con al menos
 * una partner_relationship activa (cliente / channel partner / vendor / etc).
 */
import { useState } from "react";
import { api } from "../../lib/api";
import ActionDialog, {
  DialogInput,
  DialogLabel,
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
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        + Add org
      </button>

      <ActionDialog
        open={open}
        onClose={close}
        title="Crear organizacion"
        subtitle="Mas partner_relationships se suman via update. Una sola para arrancar."
        submitLabel="Crear"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="co-legal">Legal name</DialogLabel>
          <DialogInput
            id="co-legal"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Fractalia Systems S.L."
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="co-display" optional>
            Display name
          </DialogLabel>
          <DialogInput
            id="co-display"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Fractalia"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="co-country" optional>
              Country (ISO-2)
            </DialogLabel>
            <DialogInput
              id="co-country"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              placeholder="ES"
              maxLength={2}
            />
          </div>
          <div>
            <DialogLabel htmlFor="co-jur" optional>
              Jurisdiction
            </DialogLabel>
            <DialogInput
              id="co-jur"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value)}
              placeholder="Madrid"
            />
          </div>
        </div>
        <div>
          <DialogLabel htmlFor="co-tax" optional>
            Tax ID primary
          </DialogLabel>
          <DialogInput
            id="co-tax"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="CIF / VAT / RFC / RUC / EIN"
          />
        </div>
        <div>
          <DialogLabel htmlFor="co-partner">Partner relationship</DialogLabel>
          <select
            id="co-partner"
            value={partnerType}
            onChange={(e) => setPartnerType(e.target.value)}
            className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
          >
            {PARTNER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <DialogLabel htmlFor="co-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="co-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexto interno · contactos clave · historial comercial"
          />
        </div>
      </ActionDialog>
    </>
  );
}
