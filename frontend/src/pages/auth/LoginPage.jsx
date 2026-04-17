/**
 * Login — shared across the 3 spaces.
 * SRS Identity Sprint applied: war room + relojeria suiza. Mechanical precision,
 * mono-caps CTA, amber glow on hover, tight radius, Spanish UI (internal SRS).
 */
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { preferredSpaceFor, spaceToPath } from "../../lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      const from = location.state?.from?.pathname;
      const target = from || spaceToPath(preferredSpaceFor(user)) || "/no-access";
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || "Credenciales invalidas");
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
        <div className="label-caps mb-2">InsiteIQ · v1 Foundation</div>
        <h1 className="font-display text-2xl text-text-primary mb-6 tracking-tight">
          Iniciar sesion
        </h1>

        <label className="label-caps block mb-1.5" htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full mb-4 bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
        />

        <label className="label-caps block mb-1.5" htmlFor="login-password">
          Contrasena
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full mb-5 bg-surface-overlay border border-surface-border rounded-sm px-3 py-2 text-text-primary font-body focus:outline-none focus:border-primary focus:shadow-glow-primary transition-all duration-fast ease-out-expo"
        />

        {error && (
          <div className="accent-bar-danger bg-surface-base text-danger text-sm px-3 py-2 mb-4 rounded-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-text-inverse font-mono font-semibold uppercase tracking-widest-srs text-xs py-3 rounded-sm transition-all duration-fast ease-out-expo hover:bg-primary-light hover:shadow-glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Validando…" : "Iniciar sesion"}
        </button>

        <p className="mt-6 text-text-tertiary text-2xs font-mono tracking-widest-srs uppercase">
          Herramienta interna SRS · Solo usuarios autorizados
        </p>
      </form>
    </div>
  );
}
