/**
 * Change password — forced on first login (must_change_password=true from seed)
 * or accessible on demand from the user's sidebar.
 *
 * Same war-room language as Login. Client-side guards mirror the backend:
 *   - new_password >= 10 chars
 *   - new_password != current_password
 *   - confirm must match new
 */
import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { preferredSpaceFor, spaceToPath } from "../../lib/auth";

export default function ChangePasswordPage() {
  const { user, changePassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const forced = !!user?.must_change_password;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const validation = useMemo(() => {
    const issues = [];
    if (next && next.length < 10) issues.push("Minimo 10 caracteres");
    if (next && current && next === current) issues.push("Debe diferir de la actual");
    if (next && confirm && next !== confirm) issues.push("No coinciden");
    return issues;
  }, [current, next, confirm]);

  const canSubmit =
    current.length > 0 &&
    next.length >= 10 &&
    confirm === next &&
    next !== current &&
    !busy;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setBusy(true);
    try {
      await changePassword(current, next);
      setDone(true);
      // Forced rotation flow: drop them at their preferred space
      if (forced) {
        const target = spaceToPath(preferredSpaceFor(user)) || "/";
        setTimeout(() => navigate(target, { replace: true }), 900);
      } else {
        const from = location.state?.from?.pathname;
        setTimeout(() => navigate(from || "/", { replace: true }), 900);
      }
    } catch (err) {
      setError(err.message || "No se pudo cambiar la contrasena");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-base">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm accent-bar bg-surface-raised p-6 rounded-md shadow-lg"
      >
        <div className="label-caps mb-2">
          {forced ? "Rotacion obligatoria" : "Seguridad"}
        </div>
        <h1 className="font-display text-2xl text-text-primary mb-1 tracking-tight">
          Cambiar contrasena
        </h1>
        <p className="font-body text-sm text-text-secondary mb-5">
          {forced
            ? "Tu cuenta fue provisionada por SRS. Antes de entrar, define una contrasena propia."
            : "Reemplaza tu contrasena actual por una nueva."}
        </p>

        <label className="label-caps block mb-1.5" htmlFor="cp-current">
          Contrasena actual
        </label>
        <input
          id="cp-current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className="w-full mb-4 bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
        />

        <label className="label-caps block mb-1.5" htmlFor="cp-new">
          Contrasena nueva
        </label>
        <input
          id="cp-new"
          type="password"
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={10}
          className="w-full mb-1.5 bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
        />
        <div className="mb-4 text-2xs font-mono uppercase tracking-widest-srs text-text-tertiary">
          {next.length}/10 min
        </div>

        <label className="label-caps block mb-1.5" htmlFor="cp-confirm">
          Confirmar nueva
        </label>
        <input
          id="cp-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full mb-3 bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
        />

        {validation.length > 0 && (
          <ul className="mb-4 text-2xs font-mono uppercase tracking-widest-srs text-warning space-y-1">
            {validation.map((v) => (
              <li key={v}>· {v}</li>
            ))}
          </ul>
        )}

        {error && (
          <div className="accent-bar-danger bg-surface-base text-danger text-sm px-3 py-2 mb-4 rounded-sm">
            {error}
          </div>
        )}

        {done && (
          <div className="accent-bar bg-surface-base text-success text-sm px-3 py-2 mb-4 rounded-sm font-body">
            Contrasena actualizada. Redirigiendo…
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-primary text-text-inverse font-mono font-semibold uppercase tracking-widest-srs text-xs py-3 rounded-sm transition-all duration-fast ease-out-expo hover:bg-primary-light hover:shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Guardando…" : "Actualizar contrasena"}
        </button>

        {!forced && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-3 w-full text-text-tertiary font-mono text-2xs uppercase tracking-widest-srs py-2 hover:text-text-primary transition-colors duration-fast"
          >
            Cancelar
          </button>
        )}

        <p className="mt-6 text-text-tertiary text-2xs font-mono tracking-widest-srs uppercase">
          Herramienta interna SRS · auditado en audit_log
        </p>
      </form>
    </div>
  );
}
