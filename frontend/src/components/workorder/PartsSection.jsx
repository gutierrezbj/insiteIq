/**
 * PartsSection · v2 paleta F (Iter 2.36).
 *
 * Budget Approval Requests por WO (Decision #5 Modo 1). Lista de parts
 * requests + acciones inline según role y status. Backend flow:
 *   draft → send_to_client (SRS) | auto-purchase (SRS)
 *   sent_to_client → client_approve | client_reject (client o SRS-on-behalf)
 *   approved/rejected/expired/superseded → terminal
 * Below-threshold: auto-approved al crear, ball nunca sale de SRS.
 */
import { useState } from "react";
import { useFetch } from "../../lib/useFetch";
import { api } from "../../lib/api";
import ActionDialog, {
  DialogCheckbox,
  DialogInput,
  DialogLabel,
  DialogPanel,
  DialogTextarea,
} from "../ui/ActionDialog";
import { formatAge } from "../ui/Badges";
import SectionCard, { SectionTitle } from "../v2-shared/SectionCard";
import { JAKARTA, MONO, MONO_CAPS } from "../v2-shared/typography";

const STATUS_STYLES = {
  draft:            { dot: "#8B95A8", color: "#3D4A66", label: "draft" },
  sent_to_client:   { dot: "#E8A33D", color: "#7E5212", label: "sent to client" },
  client_responded: { dot: "#1E3A8A", color: "#1E40AF", label: "client responded" },
  approved:         { dot: "#16A34A", color: "#0A6131", label: "approved" },
  rejected:         { dot: "#DC2626", color: "#991B1B", label: "rejected" },
  expired:          { dot: "#DC2626", color: "#991B1B", label: "expired" },
  superseded:       { dot: "#C8CDD8", color: "#8B95A8", label: "superseded" },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span
      style={{
        ...MONO_CAPS,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 9.5,
        color: s.color,
        letterSpacing: "0.12em",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.dot }} />
      {s.label}
    </span>
  );
}

export default function PartsSection({ wo, isSrs, isClient }) {
  const { data: requests, loading, reload } = useFetch(
    `/work-orders/${wo.id}/parts`,
    { deps: [wo.id] }
  );

  const list = requests || [];
  const canCreate = isSrs;

  return (
    <SectionCard padding={0} style={{ marginTop: 16 }}>
      <header
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #E2E5EC",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <SectionTitle marginBottom={4}>Parts / Budget approvals</SectionTitle>
          <div style={{ fontFamily: JAKARTA, fontSize: 14, fontWeight: 700, color: "#0A1628" }}>
            {list.length === 0
              ? "— sin requests —"
              : `${list.length} request${list.length > 1 ? "s" : ""}`}
          </div>
        </div>
        {canCreate && <CreateRequestAction wo={wo} reload={reload} />}
      </header>

      <div>
        {loading && (
          <div style={{ padding: "20px 18px", ...MONO_CAPS, fontSize: 10, color: "#8B95A8", letterSpacing: "0.14em" }}>
            cargando…
          </div>
        )}
        {!loading && list.length === 0 && (
          <div
            style={{
              padding: "20px 18px",
              fontFamily: JAKARTA,
              fontSize: 13,
              color: "#3D4A66",
              lineHeight: 1.55,
              fontWeight: 500,
            }}
          >
            No hay requests todavía. Si el tech necesita partes fuera de kit, SRS coord abre un
            request para dejar todo trackeado: threshold, ball-in-court, exchanges y cierre con factura.
          </div>
        )}
        {list.map((r) => (
          <RequestRow key={r.id} req={r} isSrs={isSrs} isClient={isClient} reload={reload} />
        ))}
      </div>
    </SectionCard>
  );
}

/* ─── Request row ──────────────────────────────────────────────── */

function RequestRow({ req, isSrs, isClient, reload }) {
  const isOpen = !["approved", "rejected", "expired", "superseded"].includes(req.status);
  const ballSide = req.ball_in_court?.side;

  const canSend = isSrs && (req.status === "draft" || req.status === "client_responded");
  const canAutoPurchase = isSrs && !req.auto_purchased && isOpen;
  const canDecide = (isClient || isSrs) && req.status === "sent_to_client";

  return (
    <div style={{ padding: "14px 18px", borderBottom: "1px solid #F0F2F7" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <StatusPill status={req.status} />
            <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.12em" }}>
              · {req.parts?.length || 0} item{req.parts?.length === 1 ? "" : "s"}
            </span>
            {req.below_threshold && (
              <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A6131", letterSpacing: "0.12em", fontWeight: 800 }}>
                · auto-approved
              </span>
            )}
            {req.auto_purchased && (
              <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#0A1628", letterSpacing: "0.12em", fontWeight: 800 }}>
                · auto-purchased
              </span>
            )}
            {ballSide && isOpen && (
              <span
                style={{
                  ...MONO_CAPS,
                  fontSize: 9.5,
                  letterSpacing: "0.12em",
                  color: ballSide === "client" ? "#7E5212" : "#3D4A66",
                  fontWeight: 800,
                }}
              >
                · ball {ballSide}
                {req.ball_in_court?.since ? ` · ${formatAge(req.ball_in_court.since)} ago` : ""}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div
              style={{
                fontFamily: JAKARTA,
                fontSize: 22,
                fontWeight: 800,
                color: "#0A1628",
                letterSpacing: "-0.01em",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ${req.total_amount_usd?.toFixed(2)}
            </div>
            <div style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em" }}>
              usd · threshold ${req.threshold_applied_usd?.toFixed(2)}
              {req.currency_native !== "USD" && req.total_amount_native != null && (
                <> · {req.currency_native} {req.total_amount_native.toFixed(2)}</>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Parts list */}
      <div
        style={{
          marginBottom: 12,
          background: "#F4F6F8",
          border: "1px solid #E2E5EC",
          borderRadius: 4,
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {(req.parts || []).map((p, i) => (
          <div
            key={i}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}
          >
            <div style={{ minWidth: 0 }}>
              <span style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 600 }}>
                {p.name}
              </span>
              {p.part_number && (
                <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginLeft: 8 }}>
                  {p.part_number}
                </span>
              )}
              {p.vendor && (
                <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em", marginLeft: 8 }}>
                  via {p.vendor}
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 12,
                color: "#3D4A66",
                fontWeight: 600,
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {p.quantity} × ${p.unit_price_usd?.toFixed(2)} = ${p.total_price_usd?.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Exchanges */}
      {(req.exchanges?.length || 0) > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
            Exchanges ({req.exchanges.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {req.exchanges.map((ex, i) => <ExchangeRow key={i} ex={ex} />)}
          </div>
        </div>
      )}

      {req.auto_purchase_reason && (
        <div
          style={{
            marginBottom: 12,
            background: "#F4F6F8",
            border: "1px solid #E2E5EC",
            borderRadius: 4,
            padding: "10px 12px",
          }}
        >
          <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 4 }}>
            Auto-purchase reason
          </div>
          <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", fontWeight: 500 }}>
            {req.auto_purchase_reason}
          </div>
        </div>
      )}

      {/* Actions */}
      {(canSend || canAutoPurchase || canDecide) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {canSend && <SendToClientAction req={req} reload={reload} />}
          {canDecide && isClient && (
            <>
              <ClientDecisionAction req={req} reload={reload} approve label="Aprobar" tone="success" />
              <ClientDecisionAction req={req} reload={reload} approve={false} label="Rechazar" tone="destructive" />
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
          {canAutoPurchase && <AutoPurchaseAction req={req} reload={reload} />}
        </div>
      )}
    </div>
  );
}

const EXCHANGE_KIND = {
  quote_sent:        { color: "#3D4A66", label: "quote sent" },
  client_question:   { color: "#3D4A66", label: "client question" },
  srs_answer:        { color: "#3D4A66", label: "srs answer" },
  approval:          { color: "#0A6131", label: "approval" },
  rejection:         { color: "#991B1B", label: "rejection" },
  auto_purchase:     { color: "#0A1628", label: "auto-purchase" },
  srs_revision:      { color: "#3D4A66", label: "srs revision" },
  timeout_noted:     { color: "#7E5212", label: "timeout noted" },
};

function ExchangeRow({ ex }) {
  const k = EXCHANGE_KIND[ex.kind] || { color: "#3D4A66", label: ex.kind };
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 4,
        padding: "8px 10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <span style={{ ...MONO_CAPS, fontSize: 9.5, color: k.color, letterSpacing: "0.12em", fontWeight: 800 }}>
          {k.label}
        </span>
        <span style={{ ...MONO_CAPS, fontSize: 9, color: "#8B95A8", letterSpacing: "0.12em" }}>
          {ex.ts ? formatAge(ex.ts) + " ago" : "—"}
          {ex.ball_side_after && <> · ball {ex.ball_side_after}</>}
        </span>
      </div>
      {ex.notes && (
        <div style={{ fontFamily: JAKARTA, fontSize: 13, color: "#0A1628", marginTop: 4, fontWeight: 500 }}>
          {ex.notes}
        </div>
      )}
    </div>
  );
}

/* ─── Action buttons ───────────────────────────────────────────── */

function TinyButton({ onClick, label, tone = "default" }) {
  const styles = {
    default: { bg: "#0A1628", color: "#FFFFFF", border: "#0A1628", hoverBg: "#1A2640", shadow: "rgba(10, 22, 40, 0.32)" },
    success: { bg: "#16A34A", color: "#FFFFFF", border: "#16A34A", hoverBg: "#0A6131", shadow: "rgba(22, 163, 74, 0.32)" },
    destructive: { bg: "#DC2626", color: "#FFFFFF", border: "#DC2626", hoverBg: "#991B1B", shadow: "rgba(220, 38, 38, 0.32)" },
    soft: { bg: "#FFFFFF", color: "#3D4A66", border: "#C8CDD8", hoverBg: "#F4F6F8", hoverColor: "#0A1628", hoverBorder: "#0A1628" },
  };
  const s = styles[tone] || styles.default;
  const isSoft = tone === "soft";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...MONO_CAPS,
        fontSize: 11,
        letterSpacing: "0.14em",
        padding: "8px 14px",
        background: s.bg,
        color: s.color,
        border: `1.5px solid ${s.border}`,
        borderRadius: 6,
        cursor: "pointer",
        boxShadow: isSoft ? "none" : `0 2px 6px -1px ${s.shadow}`,
        transition: "all 160ms",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = s.hoverBg;
        if (s.hoverColor) e.currentTarget.style.color = s.hoverColor;
        if (s.hoverBorder) e.currentTarget.style.borderColor = s.hoverBorder;
        else if (!isSoft) e.currentTarget.style.borderColor = s.hoverBg;
        if (!isSoft) e.currentTarget.style.boxShadow = `0 4px 12px -2px ${s.shadow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = s.bg;
        e.currentTarget.style.color = s.color;
        e.currentTarget.style.borderColor = s.border;
        if (!isSoft) e.currentTarget.style.boxShadow = `0 2px 6px -1px ${s.shadow}`;
      }}
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
        title="Enviar cotización al cliente"
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
            ? "SRS registrando decisión del cliente (acting-on-behalf, queda audit)"
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
                ? "Cualquier condición o comentario"
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
      <TinyButton onClick={() => setOpen(true)} label="Auto-purchase" tone="soft" />
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
          <DialogLabel htmlFor="ap-reason">Razón</DialogLabel>
          <DialogTextarea
            id="ap-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Por qué no esperamos — down-time crítico, deadline, safety"
            required
          />
        </div>
      </ActionDialog>
    </>
  );
}

/* ─── Create request (multi-part form) ─────────────────────────── */

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
    setParts([{ ...BLANK_PART }]);
    setCurrency("USD");
    setTotalNative("");
    setExpiresHours("");
    setAutoNow(false);
    setAutoReason("");
    reload();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-trigger-v2">
        Nuevo request
      </button>

      <ActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo parts request"
        subtitle={`WO ${wo.reference} · threshold snapshot viene del agreement`}
        submitLabel="Crear request"
        submitDisabled={!canSubmit}
        onSubmit={submit}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {parts.map((p, i) => (
            <DialogPanel
              key={i}
              label={
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span>Item #{i + 1}</span>
                  {parts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePart(i)}
                      style={{
                        ...MONO_CAPS,
                        fontSize: 9.5,
                        letterSpacing: "0.14em",
                        color: "#8B95A8",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        textTransform: "uppercase",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#991B1B")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#8B95A8")}
                    >
                      Quitar
                    </button>
                  )}
                </div>
              }
            >
              <div>
                <DialogLabel htmlFor={`p-name-${i}`}>Nombre</DialogLabel>
                <DialogInput
                  id={`p-name-${i}`}
                  value={p.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                  placeholder="SFP 10G SR, batería UPS, cable fibra…"
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
            </DialogPanel>
          ))}

          <button
            type="button"
            onClick={addPart}
            style={{
              ...MONO_CAPS,
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "#3D4A66",
              border: "1.5px dashed #C8CDD8",
              padding: "10px 12px",
              borderRadius: 6,
              background: "#FFFFFF",
              cursor: "pointer",
              transition: "all 160ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#0A1628";
              e.currentTarget.style.color = "#0A1628";
              e.currentTarget.style.background = "#F4F6F8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#C8CDD8";
              e.currentTarget.style.color = "#3D4A66";
              e.currentTarget.style.background = "#FFFFFF";
            }}
          >
            + agregar otro item
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              ...MONO_CAPS,
              fontSize: 10,
              color: "#3D4A66",
              letterSpacing: "0.14em",
              paddingTop: 4,
            }}
          >
            <span>total</span>
            <span
              style={{
                fontFamily: JAKARTA,
                fontSize: 22,
                fontWeight: 800,
                color: "#0A1628",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ${totalUsd.toFixed(2)} USD
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2" style={{ paddingTop: 10, borderTop: "1px solid #E2E5EC" }}>
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

        <div style={{ paddingTop: 10, borderTop: "1px solid #E2E5EC" }}>
          <DialogCheckbox
            id="auto-now"
            label="Marcar auto-purchase al crear (urgent ops)"
            checked={autoNow}
            onChange={setAutoNow}
          />
          {autoNow && (
            <div style={{ marginTop: 10 }}>
              <DialogLabel htmlFor="auto-reason">Razón auto-purchase</DialogLabel>
              <DialogTextarea
                id="auto-reason"
                rows={2}
                value={autoReason}
                onChange={(e) => setAutoReason(e.target.value)}
                placeholder="Down-time crítico, deadline, safety"
                required
              />
            </div>
          )}
        </div>
      </ActionDialog>
    </>
  );
}
