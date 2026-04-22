/**
 * CreateVendorInvoiceAction — SRS registra factura de un vendor (X-d AP).
 * El vendor debe tener partner_relationship.type=vendor_* activo en su org.
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

export default function CreateVendorInvoiceAction({ onCreated }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const [vendorId, setVendorId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issuedAt, setIssuedAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10)
  );
  const [currency, setCurrency] = useState("USD");
  const [subtotal, setSubtotal] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [linkedWos, setLinkedWos] = useState(""); // comma-separated IDs or refs
  const [linkedBas, setLinkedBas] = useState(""); // comma-separated IDs
  const [notes, setNotes] = useState("");

  const { data: orgs } = useFetch(open ? "/organizations" : null, {
    auto: open,
    deps: [open],
  });
  const { data: wos } = useFetch(open ? "/work-orders?limit=200" : null, {
    auto: open,
    deps: [open],
  });

  const vendorOrgs = useMemo(
    () =>
      (orgs || []).filter((o) =>
        (o.partner_relationships || []).some(
          (r) =>
            r.status === "active" &&
            ["vendor_labor", "vendor_material", "vendor_service"].includes(
              r.type
            )
        )
      ),
    [orgs]
  );

  const subN = Number(subtotal) || 0;
  const taxN = Number(taxRate) || 0;
  const taxAmount = Number(((subN * taxN) / 100).toFixed(2));
  const total = Number((subN + taxAmount).toFixed(2));

  // Parse linked WOs — accept comma-separated IDs or WO references
  const parsedWos = useMemo(() => {
    if (!linkedWos.trim() || !wos) return [];
    const tokens = linkedWos
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ids = [];
    for (const t of tokens) {
      // if looks like an ObjectId (24 hex chars) use as-is
      if (/^[a-f0-9]{24}$/i.test(t)) {
        ids.push(t);
        continue;
      }
      // else try matching by reference
      const hit = wos.find((w) => w.reference === t);
      if (hit) ids.push(hit.id);
    }
    return ids;
  }, [linkedWos, wos]);

  const parsedBas = useMemo(() => {
    return linkedBas
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[a-f0-9]{24}$/i.test(s));
  }, [linkedBas]);

  function reset() {
    setVendorId("");
    setInvoiceNumber("");
    setIssuedAt(new Date().toISOString().slice(0, 10));
    setDueDate(new Date(Date.now() + 30 * 86400 * 1000).toISOString().slice(0, 10));
    setCurrency("USD");
    setSubtotal("");
    setTaxRate("0");
    setLinkedWos("");
    setLinkedBas("");
    setNotes("");
  }

  const canSubmit =
    !!vendorId && invoiceNumber.trim() && subN > 0;

  async function submit() {
    const body = {
      vendor_organization_id: vendorId,
      vendor_invoice_number: invoiceNumber.trim(),
      issued_at: new Date(issuedAt + "T00:00:00Z").toISOString(),
      due_date: new Date(dueDate + "T00:00:00Z").toISOString(),
      currency: currency.toUpperCase() || "USD",
      subtotal: subN,
      tax_rate_pct: taxN,
      tax_amount: taxAmount,
      total,
      linked_work_order_ids: parsedWos,
      linked_budget_approval_ids: parsedBas,
      notes: notes.trim() || null,
    };
    const created = await api.post("/vendor-invoices", body);
    reset();
    setOpen(false);
    onCreated?.(created);
    if (created?.id) navigate(`/srs/finance/vendor-invoices/${created.id}`);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        + Registrar factura vendor
      </button>

      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Vendor invoice · registrar deuda"
        subtitle="AP · trazabilidad de lo que SRS debe a proveedores"
        submitLabel="Registrar"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="cv-vendor">Vendor</DialogLabel>
          <Select
            id="cv-vendor"
            value={vendorId}
            onChange={setVendorId}
            options={[
              { v: "", l: "— elegir vendor (con rol vendor_*) —" },
              ...vendorOrgs.map((o) => ({
                v: o.id,
                l: `${o.legal_name}${o.country ? ` · ${o.country}` : ""}`,
              })),
            ]}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="cv-num">Vendor invoice #</DialogLabel>
            <DialogInput
              id="cv-num"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="FERVI-2026-0421"
              required
            />
          </div>
          <div>
            <DialogLabel htmlFor="cv-cur">Currency</DialogLabel>
            <DialogInput
              id="cv-cur"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <DialogLabel htmlFor="cv-iss">Issued at</DialogLabel>
            <DialogInput
              id="cv-iss"
              type="date"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </div>
          <div>
            <DialogLabel htmlFor="cv-due">Due date</DialogLabel>
            <DialogInput
              id="cv-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <DialogLabel htmlFor="cv-sub">Subtotal</DialogLabel>
            <DialogInput
              id="cv-sub"
              type="number"
              step="0.01"
              min="0.01"
              value={subtotal}
              onChange={(e) => setSubtotal(e.target.value)}
              required
            />
          </div>
          <div>
            <DialogLabel htmlFor="cv-tax" optional>
              Tax %
            </DialogLabel>
            <DialogInput
              id="cv-tax"
              type="number"
              step="0.1"
              min="0"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
          <div>
            <DialogLabel>Total</DialogLabel>
            <div className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 font-display text-base text-primary-light">
              {total.toFixed(2)}
            </div>
          </div>
        </div>

        <div>
          <DialogLabel htmlFor="cv-wos" optional>
            Linked WO refs (coma-separadas) — IDs o references
          </DialogLabel>
          <DialogInput
            id="cv-wos"
            value={linkedWos}
            onChange={(e) => setLinkedWos(e.target.value)}
            placeholder="FRAC-CS-0000101, 69e3fde5..."
          />
          {parsedWos.length > 0 && (
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-success mt-1">
              · {parsedWos.length} WO{parsedWos.length === 1 ? "" : "s"} matched
            </div>
          )}
        </div>
        <div>
          <DialogLabel htmlFor="cv-bas" optional>
            Linked PO (budget_approval IDs) coma-separados
          </DialogLabel>
          <DialogInput
            id="cv-bas"
            value={linkedBas}
            onChange={(e) => setLinkedBas(e.target.value)}
            placeholder="69e3fde5..."
          />
          <p className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary mt-1">
            Necesario para three-way match efectivo
          </p>
        </div>

        <div>
          <DialogLabel htmlFor="cv-notes" optional>
            Notas internas
          </DialogLabel>
          <DialogTextarea
            id="cv-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexto · escalaciones · referencia email vendor"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function Select({ id, value, onChange, options }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
