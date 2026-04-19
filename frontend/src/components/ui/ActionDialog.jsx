/**
 * ActionDialog — generic war-room modal for any WO action.
 *
 * Render-prop style: parent passes the form fields as children. Handles
 * backdrop, ESC, focus trap lite, submit wiring, error display.
 *
 * Usage:
 *   <ActionDialog
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     title="Advance to triage"
 *     submitLabel="Advance"
 *     onSubmit={async () => { await api.post(...); reload(); }}
 *   >
 *     <textarea ... />
 *   </ActionDialog>
 */
import { useEffect, useRef, useState } from "react";

export default function ActionDialog({
  open,
  onClose,
  title,
  subtitle,
  submitLabel = "Confirmar",
  submitDisabled = false,
  onSubmit,
  destructive = false,
  children,
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setBusy(false);
      setError(null);
      return;
    }
    // ESC to close
    function onKey(e) {
      if (e.key === "Escape" && !busy) onClose?.();
    }
    window.addEventListener("keydown", onKey);
    // Autofocus the dialog so focusable content inside gets keyboard routing
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
      // Parent is expected to close on success; safety net
      onClose?.();
    } catch (err) {
      setError(err?.message || "Accion fallo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/70 backdrop-blur-sm"
      onClick={() => !busy && onClose?.()}
    >
      <form
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-surface-raised accent-bar rounded-md shadow-2xl p-5 outline-none"
      >
        <div className="label-caps mb-1.5">
          {destructive ? "Accion destructiva" : "Accion"}
        </div>
        <h2 className="font-display text-xl text-text-primary leading-tight mb-1">
          {title}
        </h2>
        {subtitle && (
          <p className="font-body text-sm text-text-secondary mb-4">{subtitle}</p>
        )}

        <div className="mt-4 space-y-3">{children}</div>

        {error && (
          <div className="accent-bar-danger bg-surface-base text-danger text-sm px-3 py-2 mt-4 rounded-sm">
            {error}
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="font-mono text-2xs uppercase tracking-widest-srs text-text-tertiary hover:text-text-primary px-3 py-2 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || submitDisabled}
            className={`font-mono font-semibold uppercase tracking-widest-srs text-xs px-4 py-2.5 rounded-sm transition-all duration-fast ease-out-expo disabled:opacity-50 disabled:cursor-not-allowed ${
              destructive
                ? "bg-danger text-text-inverse hover:bg-danger/90 hover:shadow-glow-danger"
                : "bg-primary text-text-inverse hover:bg-primary-light hover:shadow-glow-primary"
            }`}
          >
            {busy ? "Ejecutando…" : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

// Reusable inputs so action forms stay consistent ----------

export function DialogLabel({ htmlFor, children, optional }) {
  return (
    <label htmlFor={htmlFor} className="label-caps block mb-1.5">
      {children}
      {optional && (
        <span className="ml-2 text-text-tertiary normal-case tracking-normal">
          (opcional)
        </span>
      )}
    </label>
  );
}

export function DialogInput({ id, ...props }) {
  return (
    <input
      id={id}
      {...props}
      className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
    />
  );
}

export function DialogTextarea({ id, rows = 3, ...props }) {
  return (
    <textarea
      id={id}
      rows={rows}
      {...props}
      className="w-full bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo resize-y"
    />
  );
}

export function DialogCheckbox({ id, label, checked, onChange, disabled }) {
  return (
    <label
      htmlFor={id}
      className={`flex items-center gap-2 font-body text-sm cursor-pointer ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="accent-primary w-4 h-4"
      />
      <span className="text-text-primary">{label}</span>
    </label>
  );
}
