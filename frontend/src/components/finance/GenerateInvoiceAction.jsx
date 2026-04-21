/**
 * GenerateInvoiceAction — SRS admin genera un Invoice draft a partir de
 * closed WOs del period × agreement. Aplica el rate_card automatico.
 *
 * Scope mostrar:
 *  - Org picker filtrado a clientes
 *  - Agreement picker filtrado a los del org
 *  - Period: default mes corriente, editable
 *  - tax_rate_pct configurable (ej. 21 ES, 16 MX, 0 USA default)
 *  - client_ref para cross-reference con PO cliente
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../ui/ActionDialog";

function firstOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function lastOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

export default function GenerateInvoiceAction({ defaultOrgId, onGenerated }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const [orgId, setOrgId] = useState(defaultOrgId || "");
  const [agreementId, setAgreementId] = useState("");
  const [periodStart, setPeriodStart] = useState(isoDate(firstOfMonth()));
  const [periodEnd, setPeriodEnd] = useState(isoDate(lastOfMonth()));
  const [taxRate, setTaxRate] = useState("0");
  const [clientRef, setClientRef] = useState("");
  const [notes, setNotes] = useState("");

  const { data: orgs } = useFetch(open ? "/organizations" : null, {
    auto: open,
    deps: [open],
  });
  const { data: agreements } = useFetch(open ? "/service-agreements" : null, {
    auto: open,
    deps: [open],
  });

  const clientOrgs = useMemo(
    () =>
      (orgs || []).filter((o) =>
        (o.active_roles || []).some((r) =>
          ["client", "prime_contractor", "channel_partner"].includes(r)
        )
      ),
    [orgs]
  );

  const orgAgreements = useMemo(
    () =>
      (agreements || []).filter(
        (a) => (!orgId || a.organization_id === orgId) && !!a.rate_card
      ),
    [agreements, orgId]
  );

  useEffect(() => {
    // Reset agreement if org changed
    if (agreementId) {
      const a = (agreements || []).find((x) => x.id === agreementId);
      if (a && orgId && a.organization_id !== orgId) setAgreementId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const canSubmit =
    !!orgId && !!agreementId && !!periodStart && !!periodEnd;

  async function submit() {
    const body = {
      organization_id: orgId,
      service_agreement_id: agreementId,
      period_start: new Date(periodStart + "T00:00:00Z").toISOString(),
      period_end: new Date(periodEnd + "T23:59:59Z").toISOString(),
      tax_rate_pct: Number(taxRate) || 0,
      client_ref: clientRef.trim() || null,
      notes: notes.trim() || null,
    };
    const created = await api.post("/invoices/generate", body);
    setOpen(false);
    onGenerated?.(created);
    if (created?.id) navigate(`/srs/finance/invoices/${created.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        + Generate invoice
      </button>

      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Generate invoice"
        subtitle="Agrupa closed WOs del periodo × agreement aplicando rate_card"
        submitLabel="Generar draft"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="gi-org">Cliente</DialogLabel>
          <Select
            id="gi-org"
            value={orgId}
            onChange={setOrgId}
            options={[
              { v: "", l: "— elegir —" },
              ...clientOrgs.map((o) => ({
                v: o.id,
                l: `${o.legal_name}${o.country ? ` · ${o.country}` : ""}`,
              })),
            ]}
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="gi-ag">Service Agreement</DialogLabel>
          <Select
            id="gi-ag"
            value={agreementId}
            onChange={setAgreementId}
            disabled={!orgId}
            options={[
              {
                v: "",
                l: orgAgreements.length
                  ? "— elegir —"
                  : orgId
                  ? "(sin agreements con rate_card)"
                  : "(elegi cliente primero)",
              },
              ...orgAgreements.map((a) => ({
                v: a.id,
                l: `${a.title} · ${a.shield_level} · ${a.currency}`,
              })),
            ]}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="gi-ps">Period start</DialogLabel>
            <DialogInput
              id="gi-ps"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              required
            />
          </div>
          <div>
            <DialogLabel htmlFor="gi-pe">Period end</DialogLabel>
            <DialogInput
              id="gi-pe"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="gi-tax" optional>
              Tax rate %
            </DialogLabel>
            <DialogInput
              id="gi-tax"
              type="number"
              step="0.1"
              min="0"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="21 ES · 16 MX · 0 US"
            />
          </div>
          <div>
            <DialogLabel htmlFor="gi-cr" optional>
              Client PO/BPA ref
            </DialogLabel>
            <DialogInput
              id="gi-cr"
              value={clientRef}
              onChange={(e) => setClientRef(e.target.value)}
              placeholder="PA-1000066 / PO-1004018"
            />
          </div>
        </div>
        <div>
          <DialogLabel htmlFor="gi-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="gi-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cualquier comentario que deba aparecer en la factura"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function Select({ id, value, onChange, options, disabled, required }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      required={required}
      className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
