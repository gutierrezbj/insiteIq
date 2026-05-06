/**
 * ActionDialog · v2 paleta F (Iter 2.27).
 *
 * Wrapper modal compartido por TODOS los action dialogs del sistema:
 * GenerateInvoice, CreateSubscription, CreateVendorInvoice, Create*
 * (User/Org/Site), PartsSection, RateCardSection, BriefingSection,
 * CostSnapshotAction, EquipmentSection, IntakeWorkOrderAction.
 *
 * API preservada (props + exports DialogLabel/DialogInput/DialogTextarea/
 * DialogCheckbox) — cero cambios en consumers.
 *
 * Render-prop style: parent passes the form fields as children. Handles
 * backdrop, ESC, focus trap lite, submit wiring, error display.
 *
 * Owner roast 2026-05-05: "Validado por Adriana, salvo generate invoice
 * que tiene el formato antiguo" — fix wrapper sirve a 13+ modales en
 * cadena.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const JAKARTA = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";

const MONO_CAPS = {
  fontFamily: MONO,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

export default function ActionDialog({
  open,
  onClose,
  title,
  subtitle,
  submitLabel,
  submitDisabled = false,
  onSubmit,
  destructive = false,
  children,
}) {
  const { t } = useTranslation("common");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);

  const effectiveSubmitLabel = submitLabel ?? t("common.confirm");

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
      return;
    }
    function onKey(e) {
      if (e.key === "Escape" && !busy) onClose?.();
    }
    window.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (busy || submitDisabled) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit?.();
      onClose?.();
    } catch (err) {
      setError(err?.message || t("common.action_failed"));
    } finally {
      setBusy(false);
    }
  }

  const submitColors = destructive
    ? { bg: "#DC2626", border: "#DC2626", hoverBg: "#991B1B", shadow: "rgba(220, 38, 38, 0.32)" }
    : { bg: "#0A1628", border: "#0A1628", hoverBg: "#1A2640", shadow: "rgba(10, 22, 40, 0.32)" };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 16px",
        background: "rgba(10, 22, 40, 0.55)",
        backdropFilter: "blur(4px)",
      }}
      onClick={() => !busy && onClose?.()}
    >
      <form
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#FFFFFF",
          border: "1px solid #E2E5EC",
          borderLeft: "3px solid #0A1628",
          borderRadius: 8,
          padding: "24px 26px",
          boxShadow: "0 24px 48px -8px rgba(10, 22, 40, 0.32), 0 12px 24px -6px rgba(10, 22, 40, 0.16)",
          outline: "none",
        }}
      >
        <div
          style={{
            ...MONO_CAPS,
            fontSize: 10,
            color: destructive ? "#991B1B" : "#8B95A8",
            letterSpacing: "0.16em",
            marginBottom: 6,
          }}
        >
          {destructive ? t("common.destructive_action") : t("common.action")}
        </div>
        <h2
          style={{
            fontFamily: JAKARTA,
            fontSize: 22,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
            marginBottom: subtitle ? 6 : 16,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontFamily: JAKARTA, fontSize: 13, color: "#3D4A66", lineHeight: 1.5, marginBottom: 18, fontWeight: 500 }}>
            {subtitle}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>

        {error && (
          <div
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              borderLeft: "3px solid #DC2626",
              color: "#991B1B",
              fontFamily: JAKARTA,
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 14px",
              borderRadius: 4,
              marginTop: 14,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            style={{
              ...MONO_CAPS,
              fontSize: 10,
              letterSpacing: "0.14em",
              padding: "10px 16px",
              background: "transparent",
              color: "#3D4A66",
              border: "none",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.5 : 1,
              transition: "color 160ms",
            }}
            onMouseEnter={(e) => { if (!busy) e.currentTarget.style.color = "#0A1628"; }}
            onMouseLeave={(e) => { if (!busy) e.currentTarget.style.color = "#3D4A66"; }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={busy || submitDisabled}
            style={{
              ...MONO_CAPS,
              fontSize: 11,
              letterSpacing: "0.14em",
              padding: "10px 18px",
              background: submitColors.bg,
              color: "#FFFFFF",
              border: `1.5px solid ${submitColors.border}`,
              borderRadius: 6,
              cursor: busy || submitDisabled ? "not-allowed" : "pointer",
              opacity: busy || submitDisabled ? 0.5 : 1,
              boxShadow: `0 2px 6px -1px ${submitColors.shadow}`,
              transition: "all 160ms",
            }}
            onMouseEnter={(e) => {
              if (busy || submitDisabled) return;
              e.currentTarget.style.background = submitColors.hoverBg;
              e.currentTarget.style.borderColor = submitColors.hoverBg;
              e.currentTarget.style.boxShadow = `0 4px 12px -2px ${submitColors.shadow}`;
            }}
            onMouseLeave={(e) => {
              if (busy || submitDisabled) return;
              e.currentTarget.style.background = submitColors.bg;
              e.currentTarget.style.borderColor = submitColors.border;
              e.currentTarget.style.boxShadow = `0 2px 6px -1px ${submitColors.shadow}`;
            }}
          >
            {busy ? t("common.executing") : effectiveSubmitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Reusable inputs (paleta F · API preservada) ────────────── */

export function DialogLabel({ htmlFor, children, optional }) {
  const { t } = useTranslation("common");
  return (
    <label
      htmlFor={htmlFor}
      style={{
        ...MONO_CAPS,
        display: "block",
        fontSize: 9.5,
        color: "#3D4A66",
        letterSpacing: "0.14em",
        marginBottom: 6,
      }}
    >
      {children}
      {optional && (
        <span
          style={{
            marginLeft: 6,
            color: "#8B95A8",
            textTransform: "none",
            letterSpacing: "0.02em",
            fontWeight: 500,
          }}
        >
          {t("common.optional_suffix")}
        </span>
      )}
    </label>
  );
}

const inputBaseStyle = {
  width: "100%",
  height: 38,
  border: "1px solid #C8CDD8",
  borderRadius: 6,
  padding: "0 12px",
  fontFamily: JAKARTA,
  fontSize: 13.5,
  fontWeight: 500,
  color: "#0A1628",
  background: "#FFFFFF",
  outline: "none",
  transition: "all 160ms",
};

const focusInputStyle = (e) => {
  e.currentTarget.style.border = "1.5px solid #0A1628";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10, 22, 40, 0.10)";
};

const blurInputStyle = (e) => {
  e.currentTarget.style.border = "1px solid #C8CDD8";
  e.currentTarget.style.boxShadow = "none";
};

export function DialogInput({ id, ...props }) {
  return (
    <input
      id={id}
      {...props}
      style={inputBaseStyle}
      onFocus={focusInputStyle}
      onBlur={blurInputStyle}
    />
  );
}

export function DialogTextarea({ id, rows = 3, ...props }) {
  return (
    <textarea
      id={id}
      rows={rows}
      {...props}
      style={{
        ...inputBaseStyle,
        height: "auto",
        padding: "10px 12px",
        resize: "vertical",
        lineHeight: 1.5,
      }}
      onFocus={focusInputStyle}
      onBlur={blurInputStyle}
    />
  );
}

export function DialogSelect({ id, value, onChange, options, required, ...props }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      required={required}
      {...props}
      style={{ ...inputBaseStyle, cursor: "pointer" }}
      onFocus={focusInputStyle}
      onBlur={blurInputStyle}
    >
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>{o}</option>
        ) : (
          <option key={o.v ?? o.value} value={o.v ?? o.value}>
            {o.l ?? o.label}
          </option>
        )
      )}
    </select>
  );
}

export function DialogPanel({ label, children, padding = 14 }) {
  return (
    <div
      style={{
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
        borderRadius: 6,
        padding,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {label && (
        <div
          style={{
            ...MONO_CAPS,
            fontSize: 9.5,
            color: "#3D4A66",
            letterSpacing: "0.14em",
          }}
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

export function DialogCheckbox({ id, label, checked, onChange, disabled }) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: JAKARTA,
        fontSize: 13.5,
        color: "#0A1628",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: "#0A1628" }}
      />
      <span>{label}</span>
    </label>
  );
}
