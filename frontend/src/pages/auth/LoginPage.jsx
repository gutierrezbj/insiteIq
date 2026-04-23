/**
 * Login — shared across the 3 spaces.
 * SRS Identity Sprint applied: war room + relojeria suiza. Mechanical precision,
 * mono-caps CTA, amber glow on hover, tight radius, Spanish UI (internal SRS).
 *
 * Z-a patch · quick-access demo chips:
 * Herramienta interna, solo usuarios sembrados. Para acelerar
 * review multi-rol (JuanCho + equipo SRS + clientes invited), se muestran
 * 5 chips de un click que rellenan email + password seed (InsiteIQ2026!)
 * y disparan login. Si el user no rotó su contraseña, el backend redirige
 * al forced-rotation automáticamente.
 */
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { preferredSpaceFor, spaceToPath } from "../../lib/auth";

const SEED_PASSWORD = "InsiteIQ2026!";

const DEMO_ROLES = [
  {
    key: "admin",
    label: "Admin SRS",
    sub: "Owner · full",
    email: "juang@systemrapid.io",
  },
  {
    key: "coord",
    label: "Coord SRS",
    sub: "Ops · Andros",
    email: "androsb@systemrapid.com",
  },
  {
    key: "finance",
    label: "Finanzas SRS",
    sub: "Adriana",
    email: "adrianab@systemrapid.com",
  },
  {
    key: "client",
    label: "Cliente",
    sub: "Fractalia · Rackel",
    email: "rackel.rocha@fractaliasystems.es",
  },
  {
    key: "tech",
    label: "Tech plantilla",
    sub: "Agustin",
    email: "agustinc@systemrapid.com",
  },
  {
    key: "tech_ext",
    label: "Tech externo",
    sub: "Arlindo · sub",
    email: "arlindoo@systemrapid.com",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [quickKey, setQuickKey] = useState(null);

  async function submit(emailArg, passwordArg) {
    setError(null);
    setBusy(true);
    try {
      const user = await login(emailArg, passwordArg);
      const from = location.state?.from?.pathname;
      const target = from || spaceToPath(preferredSpaceFor(user)) || "/no-access";
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || "Credenciales invalidas");
    } finally {
      setBusy(false);
      setQuickKey(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    submit(email, password);
  }

  async function handleQuick(role) {
    setQuickKey(role.key);
    setEmail(role.email);
    setPassword(SEED_PASSWORD);
    submit(role.email, SEED_PASSWORD);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-surface-base">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="accent-bar bg-surface-raised p-6 rounded-md shadow-lg"
        >
          <div className="label-caps mb-2">InsiteIQ · v1 Foundation</div>
          <h1 className="font-display text-2xl text-text-primary mb-6 tracking-tight">
            Iniciar sesion
          </h1>

          <label className="label-caps block mb-1.5" htmlFor="login-email">
            Email
          </label>
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

        </form>

        {/* Quick-access demo chips */}
        <div className="mt-6 p-4 bg-surface-raised/50 border border-surface-border rounded-md">
          <div className="flex items-center justify-between mb-3">
            <span className="label-caps">Demo</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map((role) => {
              const isActive = quickKey === role.key;
              return (
                <button
                  key={role.key}
                  type="button"
                  disabled={busy}
                  onClick={() => handleQuick(role)}
                  className={`text-left px-3 py-2 rounded-sm border transition-all duration-fast ease-out-expo group
                    ${
                      isActive
                        ? "border-primary bg-surface-overlay shadow-glow-primary"
                        : "border-surface-border bg-surface-overlay/40 hover:border-primary hover:bg-surface-overlay hover:shadow-glow-primary"
                    }
                    disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <div className="font-display text-sm text-text-primary leading-tight group-hover:text-primary-light transition-colors duration-fast">
                    {role.label}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-widest-srs text-text-tertiary mt-0.5">
                    {role.sub}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
