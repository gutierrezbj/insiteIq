/**
 * CreateSubscriptionAction — crea recurring billing subscription (X-c).
 * El stream oculto Panama $154K/año vive aqui.
 */
import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useFetch } from "../../lib/useFetch";
import ActionDialog, {
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../ui/ActionDialog";

function firstOfNextMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export default function CreateSubscriptionAction({ onCreated }) {
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [agreementId, setAgreementId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("monthly_fee");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [cadence, setCadence] = useState("monthly");
  const [nextRun, setNextRun] = useState(
    firstOfNextMonth().toISOString().slice(0, 10)
  );
  const [dueInDays, setDueInDays] = useState(30);
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
      (agreements || []).filter((a) => !orgId || a.organization_id === orgId),
    [agreements, orgId]
  );

  useEffect(() => {
    if (agreementId) {
      const a = (agreements || []).find((x) => x.id === agreementId);
      if (a && orgId && a.organization_id !== orgId) setAgreementId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  // Cadence → category sync
  useEffect(() => {
    if (cadence === "monthly") setCategory("monthly_fee");
    else setCategory("quarterly_fee");
  }, [cadence]);

  const canSubmit =
    !!orgId && !!agreementId && title.trim().length > 0 && Number(amount) > 0;

  async function submit() {
    const body = {
      organization_id: orgId,
      service_agreement_id: agreementId,
      title: title.trim(),
      description: description.trim() || null,
      category,
      amount: Number(amount),
      currency: currency.toUpperCase() || "USD",
      tax_rate_pct: Number(taxRate) || 0,
      cadence,
      next_run: new Date(nextRun + "T00:00:00Z").toISOString(),
      due_in_days: Number(dueInDays) || 30,
      notes: notes.trim() || null,
    };
    const created = await api.post("/subscriptions", body);
    setOpen(false);
    onCreated?.(created);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        + Subscription
      </button>

      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Recurring billing subscription"
        subtitle="Stream fijo · genera Invoice draft automatico cada cadencia"
        submitLabel="Crear"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="cs-org">Cliente</DialogLabel>
          <Select
            id="cs-org"
            value={orgId}
            onChange={setOrgId}
            options={[
              { v: "", l: "— elegir —" },
              ...clientOrgs.map((o) => ({
                v: o.id,
                l: `${o.legal_name}${o.country ? ` · ${o.country}` : ""}`,
              })),
            ]}
          />
        </div>
        <div>
          <DialogLabel htmlFor="cs-ag">Service agreement</DialogLabel>
          <Select
            id="cs-ag"
            value={agreementId}
            onChange={setAgreementId}
            disabled={!orgId}
            options={[
              { v: "", l: orgId ? "— elegir —" : "(elegi cliente primero)" },
              ...orgAgreements.map((a) => ({
                v: a.id,
                l: `${a.title} · ${a.shield_level}`,
              })),
            ]}
          />
        </div>
        <div>
          <DialogLabel htmlFor="cs-title">Titulo</DialogLabel>
          <DialogInput
            id="cs-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Arcos Panama ops mensualidad"
            required
          />
        </div>
        <div>
          <DialogLabel htmlFor="cs-desc" optional>
            Descripcion
          </DialogLabel>
          <DialogTextarea
            id="cs-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <DialogLabel htmlFor="cs-amt">Amount</DialogLabel>
            <DialogInput
              id="cs-amt"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="12833.33"
              required
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-cur">Currency</DialogLabel>
            <DialogInput
              id="cs-cur"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
              maxLength={3}
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-tax" optional>
              Tax %
            </DialogLabel>
            <DialogInput
              id="cs-tax"
              type="number"
              step="0.1"
              min="0"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <DialogLabel htmlFor="cs-cad">Cadence</DialogLabel>
            <Select
              id="cs-cad"
              value={cadence}
              onChange={setCadence}
              options={[
                { v: "monthly", l: "monthly" },
                { v: "quarterly", l: "quarterly" },
                { v: "annual", l: "annual" },
              ]}
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-next">First run</DialogLabel>
            <DialogInput
              id="cs-next"
              type="date"
              value={nextRun}
              onChange={(e) => setNextRun(e.target.value)}
              required
            />
          </div>
          <div>
            <DialogLabel htmlFor="cs-due">Due days</DialogLabel>
            <DialogInput
              id="cs-due"
              type="number"
              min="1"
              value={dueInDays}
              onChange={(e) => setDueInDays(e.target.value)}
            />
          </div>
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
          />
        </div>
      </ActionDialog>
    </>
  );
}

function Select({ id, value, onChange, options, disabled }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body text-sm focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  );
}
