/**
 * PartsSection — Budget Approval Requests por WO (Decision #5 Modo 1).
 *
 * Renderiza la lista de parts requests de la WO + acciones inline segun
 * role y status del request.
 *
 * Backend flow snapshot:
 *   draft            -> send_to_client (SRS) | auto-purchase (SRS)
 *   sent_to_client   -> client_approve | client_reject (client o SRS-on-behalf)
 *   approved         -> terminal, auto-purchase todavia posible
 *   rejected         -> terminal
 *   expired          -> timeout sin respuesta
 *   superseded       -> re-cotizado
 *
 * Below-threshold: auto-approved al crear, ball nunca sale de SRS.
 */
import { useState } from "react";
import { useFetch } from "../../lib/useFetch";
import { api } from "../../lib/api";
import ActionDialog, {
  DialogCheckbox,
  DialogInput,
  DialogLabel,
  DialogTextarea,
} from "../ui/ActionDialog";
import { formatAge } from "../ui/Badges";

// Status chrome: tiny bar + dot + caps label — matches global language
const STATUS_LOOK = {
  draft: {
    dot: "bg-text-tertiary",
    text: "text-text-secondary",
    label: "draft",
  },
  sent_to_client: {
    dot: "bg-warning",
    text: "text-warning",
    label: "sent to client",
  },
  client_responded: {
    dot: "bg-info",
    text: "text-info",
    label: "client responded",
  },
  approved: {
    dot: "bg-success",
    text: "text-success",
    label: "approved",
  },
  rejected: {
    dot: "bg-danger",
    text: "text-danger",
    label: "rejected",
  },
  expired: {
    dot: "bg-danger",
    text: "text-danger",
    label: "expired",
  },
  superseded: {
    dot: "bg-text-tertiary",
    text: "text-text-tertiary",
    label: "superseded",
  },
};

export default function PartsSection({ wo, isSrs, isClient }) {
  const { data: requests, loading, reload } = useFetch(
    `/work-orders/${wo.id}/parts`,
    { deps: [wo.id] }
  );

  const list = requests || [];
  const canCreate = isSrs;

  return (
    <section className="bg-surface-raised accent-bar rounded-sm mt-4">
      <header className="px-4 py-3 border-b border-surface-border flex items-center justify-between gap-3">
        <div>
          <div className="label-caps">Parts / Budget approvals</div>
          <h2 className="font-display text-base text-text-primary leading-tight">
            {list.length === 0
              ? "— sin requests —"
              : `${list.length} request${list.length > 1 ? "s" : ""}`}
          </h2>
        </div>
        {canCreate && <CreateRequestAction wo={wo} reload={reload} />}
      </header>

      <div className="divide-y divide-surface-border">
        {loading && (
          <div className="px-4 py-6 font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
            cargando…
          </div>
        )}
        {!loading && list.length === 0 && (
          <div className="px-4 py-6 font-body text-sm text-text-secondary">
            No hay requests todavia. Si el tech necesita partes fuera de kit,
            SRS coord abre un request para dejar todo trackeado: threshold,
            ball-in-court, exchanges y cierre con factura.
          </div>
        )}
        {list.map((r) => (
          <RequestRow
            key={r.id}
            req={r}
            isSrs={isSrs}
            isClient={isClient}
            reload={reload}
          />
        ))}
      </div>
    </section>
  );
}

// -------------------- Request row --------------------

function RequestRow({ req, isSrs, isClient, reload }) {
  const look = STATUS_LOOK[req.status] || STATUS_LOOK.draft;
  const isOpen = !["approved", "rejected", "expired", "superseded"].includes(
    req.status
  );
  const ballSide = req.ball_in_court?.side;

  // Who can act on this request now?
  const canSend = isSrs && (req.status === "draft" || req.status === "client_responded");
  const canAutoPurchase = isSrs && !req.auto_purchased && isOpen;
  const canDecide = (isClient || isSrs) && req.status === "sent_to_client";

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest-srs ${look.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${look.dot}`} />
              {look.label}
            </span>
            <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              · {req.parts?.length || 0} item{req.parts?.length === 1 ? "" : "s"}
            </span>
            {req.below_threshold && (
              <span className="font-mono text-2xs uppercase tracking-widest-srs text-success">
                · auto-approved
              </span>
            )}
            {req.auto_purchased && (
              <span className="font-mono text-2xs uppercase tracking-widest-srs text-primary-light">
                · auto-purchased
              </span>
            )}
            {ballSide && isOpen && (
              <span
                className={`font-mono text-2xs uppercase tracking-widest-srs ${
                  ballSide === "client" ? "text-warning" : "text-text-secondary"
                }`}
              >
                · ball {ballSide}
                {req.ball_in_court?.since
                  ? ` · ${formatAge(req.ball_in_court.since)} ago`
                  : ""}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-xl text-text-primary leading-none">
              ${req.total_amount_usd?.toFixed(2)}
            </div>
            <div className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
              usd · threshold ${req.threshold_applied_usd?.toFixed(2)}
              {req.currency_native !== "USD" && req.total_amount_native != null && (
                <> · {req.currency_native} {req.total_amount_native.toFixed(2)}</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Parts list */}
      <div className="mb-3 bg-surface-base rounded-sm p-3 space-y-1.5">
        {(req.parts || []).map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 font-body text-sm"
          >
            <div className="min-w-0">
              <span className="text-text-primary">{p.name}</span>
              {p.part_number && (
                <span className="ml-2 font-mono text-2xs text-text-tertiary">
                  {p.part_number}
                </span>
              )}
              {p.vendor && (
                <span className="ml-2 font-mono text-2xs text-text-tertiary">
                  via {p.vendor}
                </span>
              )}
            </div>
            <div className="font-mono text-2xs text-text-secondary whitespace-nowrap">
              {p.quantity} × ${p.unit_price_usd?.toFixed(2)} = ${p.total_price_usd?.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Exchanges */}
      {(req.exchanges?.length || 0) > 0 && (
        <div className="mb-3">
          <div className="label-caps mb-1.5">Exchanges ({req.exchanges.length})</div>
          <div className="space-y-1.5">
            {req.exchanges.map((ex, i) => (
              <ExchangeRow key={i} ex={ex} />
            ))}
          </div>
        </div>
      )}

      {req.auto_purchase_reason && (
        <div className="mb-3 bg-surface-base rounded-sm p-2.5 border border-surface-border">
          <div className="label-caps mb-0.5">Auto-purchase reason</div>
          <div className="font-body text-sm text-text-primary">
            {req.auto_purchase_reason}
          </div>
        </div>
      )}

      {/* Actions */}
      {(canSend || canAutoPurchase || canDecide) && (
        <div className="flex flex-wrap gap-2 mt-2">
          {canSend && (
            <SendToClientAction req={req} reload={reload} />
          )}
          {canDecide && isClient && (
            <>
              <ClientDecisionAction
                req={req}
                reload={reload}
                approve
                label="Aprobar"
                tone="success"
              />
              <ClientDecisionAction
                req={req}
                reload={reload}
                approve={false}
                label="Rechazar"
                tone="destructive"
              />
            </>
          )}
          {canDecide && !isClient && isSrs && (
            <>
              <ClientDecisionAction
                req={req}
                reload={reload}
                approve
                onBehalf
                label="Aprobar (SRS-on-behalf)"
                tone="soft"
              />
              <ClientDecisionAction
                req={req}
                reload={reload}
                approve={false}
                onBehalf
                label="Rechazar (SRS-on-behalf)"
                tone="soft"
              />
            </>
          )}
          {canAutoPurchase && (
            <AutoPurchaseAction req={req} reload={reload} />
          )}
        </div>
      )}
    </div>
  );
}

function ExchangeRow({ ex }) {
  const KIND_LABELS = {
    quote_sent: "quote sent",
    client_question: "client question",
    srs_answer: "srs answer",
    approval: "approval",
    rejection: "rejection",
    auto_purchase: "auto-purchase",
    srs_revision: "srs revision",
    timeout_noted: "timeout noted",
  };
  const toneClass =
    ex.kind === "approval"
      ? "text-success"
      : ex.kind === "rejection"
      ? "text-danger"
      : ex.kind === "auto_purchase"
      ? "text-primary-light"
      : "text-text-secondary";
  return (
    <div className="bg-surface-base rounded-sm px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={`font-mono text-2xs uppercase tracking-widest-srs ${toneClass}`}>
          {KIND_LABELS[ex.kind] || ex.kind}
        </span>
        <span className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary">
          {ex.ts ? formatAge(ex.ts) + " ago" : "—"}
          {ex.ball_side_after && <> · ball {ex.ball_side_after}</>}
        </span>
      </div>
      {ex.notes && (
        <div className="font-body text-sm text-text-primary mt-0.5">
          {ex.notes}
        </div>
      )}
    </div>
  );
}

// -------------------- Action buttons --------------------

function TinyButton({ onClick, label, tone = "default" }) {
  const toneClass =
    tone === "destructive"
      ? "bg-danger text-text-inverse hover:bg-danger/90 hover:shadow-glow-danger"
      : tone === "success"
      ? "bg-success text-text-inverse hover:bg-success/90 hover:shadow-glow-success"
      : tone === "soft"
      ? "bg-surface-overlay text-text-secondary border border-surface-border hover:text-text-primary hover:border-primary"
      : "bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm transition-all duration-fast ease-out-expo ${toneClass}`}
    >
      {label}
    </button>
  );
}

function SendToClientAction({ req, reload }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");

  async function submit() {
    await api.post(`/parts/${req.id}/send-to-client`, {
      kind: "quote_sent",
      notes: notes || null,
    });
    reload();
  }

  return (
    <>
      <TinyButton onClick={() => setOpen(true)} label="Enviar al cliente" />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Enviar cotizacion al cliente"
        subtitle={`$${req.total_amount_usd?.toFixed(2)} USD · ball pasa a cliente`}
        submitLabel="Enviar"
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="send-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="send-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexto para el cliente — entra al audit log"
          />
        </div>
      </ActionDialog>
    </>
  );
}

function ClientDecisionAction({ req, reload, approve, onBehalf, label, tone }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");

  async function submit() {
    const path = approve
      ? `/parts/${req.id}/client-approve`
      : `/parts/${req.id}/client-reject`;
    await api.post(path, { notes: notes || null });
    reload();
  }

  return (
    <>
      <TinyButton onClick={() => setOpen(true)} label={label} tone={tone} />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={approve ? "Aprobar request" : "Rechazar request"}
        subtitle={
          onBehalf
            ? "SRS registrando decision del cliente (acting-on-behalf, queda audit)"
            : `$${req.total_amount_usd?.toFixed(2)} USD · ball vuelve a SRS`
        }
        submitLabel={approve ? "Aprobar" : "Rechazar"}
        destructive={!approve}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="decision-notes" optional>
            Notas
          </DialogLabel>
          <DialogTextarea
            id="decision-notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              approve
                ? "Cualquier condicion o comentario"
                : "Motivo del rechazo (importante para audit)"
            }
          />
        </div>
      </ActionDialog>
    </>
  );
}

function AutoPurchaseAction({ req, reload }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function submit() {
    await api.post(`/parts/${req.id}/auto-purchase`, { reason });
    reload();
  }

  const canSubmit = reason.trim().length > 0;

  return (
    <>
      <TinyButton
        onClick={() => setOpen(true)}
        label="Auto-purchase"
        tone="soft"
      />
      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Auto-purchase (urgent ops)"
        subtitle="SRS compra ya. Queda flag auto_purchased + reason en audit."
        submitLabel="Comprar ahora"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div>
          <DialogLabel htmlFor="ap-reason">Razon</DialogLabel>
          <DialogTextarea
            id="ap-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Por que no esperamos — down-time critico, deadline, safety"
            required
          />
        </div>
      </ActionDialog>
    </>
  );
}

// -------------------- Create request (multi-part form) --------------------

const BLANK_PART = {
  name: "",
  part_number: "",
  quantity: 1,
  unit_price_usd: 0,
  vendor: "",
  lead_time_days: "",
  notes: "",
};

function CreateRequestAction({ wo, reload }) {
  const [open, setOpen] = useState(false);
  const [parts, setParts] = useState([{ ...BLANK_PART }]);
  const [currency, setCurrency] = useState("USD");
  const [totalNative, setTotalNative] = useState("");
  const [expiresHours, setExpiresHours] = useState("");
  const [autoNow, setAutoNow] = useState(false);
  const [autoReason, setAutoReason] = useState("");

  function update(i, field, value) {
    setParts((ps) => {
      const next = [...ps];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function addPart() {
    setParts((ps) => [...ps, { ...BLANK_PART }]);
  }

  function removePart(i) {
    setParts((ps) => ps.filter((_, idx) => idx !== i));
  }

  const totalUsd = parts.reduce(
    (acc, p) =>
      acc + (parseInt(p.quantity || 0, 10) || 0) * (parseFloat(p.unit_price_usd || 0) || 0),
    0
  );

  const canSubmit =
    parts.length > 0 &&
    parts.every(
      (p) => p.name.trim().length > 0 && parseFloat(p.unit_price_usd || 0) >= 0
    ) &&
    (!autoNow || autoReason.trim().length > 0);

  async function submit() {
    const body = {
      parts: parts.map((p) => ({
        name: p.name.trim(),
        part_number: p.part_number || null,
        quantity: parseInt(p.quantity || 1, 10),
        unit_price_usd: parseFloat(p.unit_price_usd || 0),
        total_price_usd:
          parseInt(p.quantity || 1, 10) * parseFloat(p.unit_price_usd || 0),
        vendor: p.vendor || null,
        lead_time_days: p.lead_time_days ? parseInt(p.lead_time_days, 10) : null,
        notes: p.notes || null,
      })),
      currency_native: currency || "USD",
      total_amount_native: totalNative ? parseFloat(totalNative) : null,
      expires_in_hours: expiresHours ? parseInt(expiresHours, 10) : null,
      auto_purchase_reason: autoNow ? autoReason : null,
    };
    await api.post(`/work-orders/${wo.id}/parts`, body);
    // reset form for next open
    setParts([{ ...BLANK_PART }]);
    setCurrency("USD");
    setTotalNative("");
    setExpiresHours("");
    setAutoNow(false);
    setAutoReason("");
    reload();
  }

  function handleClose() {
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono font-semibold uppercase tracking-widest-srs text-2xs px-3 py-2 rounded-sm bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary transition-all duration-fast ease-out-expo"
      >
        Nuevo request
      </button>

      <ActionDialog
        open={open}
        onClose={handleClose}
        title="Nuevo parts request"
        subtitle={`WO ${wo.reference} · threshold snapshot viene del agreement`}
        submitLabel="Crear request"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        {/* Parts list */}
        <div className="space-y-3">
          {parts.map((p, i) => (
            <div
              key={i}
              className="bg-surface-base rounded-sm p-3 border border-surface-border space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="label-caps">Item #{i + 1}</div>
                {parts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePart(i)}
                    className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-danger"
                  >
                    Quitar
                  </button>
                )}
              </div>

              <div>
                <DialogLabel htmlFor={`p-name-${i}`}>Nombre</DialogLabel>
                <DialogInput
                  id={`p-name-${i}`}
                  value={p.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  placeholder="SFP 10G SR, bateria UPS, cable fibra…"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <DialogLabel htmlFor={`p-pn-${i}`} optional>
                    Part number
                  </DialogLabel>
                  <DialogInput
                    id={`p-pn-${i}`}
                    value={p.part_number}
                    onChange={(e) => update(i, "part_number", e.target.value)}
                  />
                </div>
                <div>
                  <DialogLabel htmlFor={`p-vendor-${i}`} optional>
                    Vendor
                  </DialogLabel>
                  <DialogInput
                    id={`p-vendor-${i}`}
                    value={p.vendor}
                    onChange={(e) => update(i, "vendor", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <DialogLabel htmlFor={`p-qty-${i}`}>Cantidad</DialogLabel>
                  <DialogInput
                    id={`p-qty-${i}`}
                    type="number"
                    min="1"
                    value={p.quantity}
                    onChange={(e) => update(i, "quantity", e.target.value)}
                  />
                </div>
                <div>
                  <DialogLabel htmlFor={`p-unit-${i}`}>Unit USD</DialogLabel>
                  <DialogInput
                    id={`p-unit-${i}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={p.unit_price_usd}
                    onChange={(e) => update(i, "unit_price_usd", e.target.value)}
                  />
                </div>
                <div>
                  <DialogLabel htmlFor={`p-lt-${i}`} optional>
                    Lead days
                  </DialogLabel>
                  <DialogInput
                    id={`p-lt-${i}`}
                    type="number"
                    min="0"
                    value={p.lead_time_days}
                    onChange={(e) => update(i, "lead_time_days", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addPart}
            className="w-full font-mono text-2xs uppercase tracking-widest-srs text-text-secondary border border-dashed border-surface-border py-2.5 rounded-sm hover:border-primary hover:text-primary-light transition-colors duration-fast"
          >
            + agregar otro item
          </button>

          <div className="flex items-center justify-between font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary pt-1">
            <span>total</span>
            <span className="font-display text-xl text-text-primary">
              ${totalUsd.toFixed(2)} USD
            </span>
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-surface-border">
          <div>
            <DialogLabel htmlFor="cur" optional>
              Moneda local
            </DialogLabel>
            <DialogInput
              id="cur"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
            />
          </div>
          <div>
            <DialogLabel htmlFor="cur-amt" optional>
              Total local
            </DialogLabel>
            <DialogInput
              id="cur-amt"
              type="number"
              step="0.01"
              value={totalNative}
              onChange={(e) => setTotalNative(e.target.value)}
            />
          </div>
          <div>
            <DialogLabel htmlFor="exp" optional>
              Expira (h)
            </DialogLabel>
            <DialogInput
              id="exp"
              type="number"
              min="1"
              value={expiresHours}
              onChange={(e) => setExpiresHours(e.target.value)}
            />
          </div>
        </div>

        <div className="pt-2 border-t border-surface-border">
          <DialogCheckbox
            id="auto-now"
            label="Marcar auto-purchase al crear (urgent ops)"
            checked={autoNow}
            onChange={setAutoNow}
          />
          {autoNow && (
            <div className="mt-2">
              <DialogLabel htmlFor="auto-reason">Razon auto-purchase</DialogLabel>
              <DialogTextarea
                id="auto-reason"
                rows={2}
                value={autoReason}
                onChange={(e) => setAutoReason(e.target.value)}
                placeholder="Down-time critico, deadline, safety"
                required
              />
            </div>
          )}
        </div>
      </ActionDialog>
    </>
  );
}
