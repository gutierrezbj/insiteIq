/**
 * Login — shared across the 3 spaces.
 *
 * Iter 2.20 (2026-05-05) · Variante B BANDA HERO ALTA
 *   - Top: banda navy con wordmark + tagline + 3 counters horizontales
 *   - Border-bottom verde 4px (signature live · paleta F)
 *   - Bottom: form light centrado en card + 6 demo chips
 *   - Cero quote interna (la frase canónica del owner queda en CLAUDE.md/memory,
 *     NO en cara pública del login)
 *
 * Paleta F NAVEGANTE: navy #0A1628 + slate #C8CDD8 + Plus Jakarta + JetBrains Mono.
 *
 * Quick-access demo chips (Z-a · sigue vigente):
 * Herramienta interna, solo usuarios sembrados. 6 chips de un click que
 * rellenan email + password seed (InsiteIQ2026!) y disparan login.
 * Si el user no rotó su contraseña, el backend redirige al forced-rotation.
 */
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../contexts/AuthContext";
import { preferredSpaceFor, spaceToPath } from "../../lib/auth";

const SEED_PASSWORD = "InsiteIQ2026!";

// Chips demo · apuntan a usuarios DEMO dedicados (pwd seed fija · sin rotación
// forzada · one-click siempre funciona). Operan sobre el cliente ficticio
// "Aurora Retail (DEMO)". NO son las cuentas reales del equipo (que rotan pwd
// y romperían los chips). Creados por scripts/load_demo_environment.py.
// Reversibles con scripts/cleanup_demo_environment.py.
const DEMO_ROLES = [
  { key: "admin",    label: "Admin SRS",       sub: "Demo · owner full",     email: "demo-admin@systemrapid.com" },
  { key: "coord",    label: "Coord SRS",       sub: "Demo · ops",            email: "demo-coord@systemrapid.com" },
  { key: "finance",  label: "Finanzas SRS",    sub: "Demo · finance",        email: "demo-finance@systemrapid.com" },
  { key: "client",   label: "Cliente",         sub: "Demo · Aurora Retail",  email: "demo-cliente@systemrapid.com" },
  { key: "tech",     label: "Tech plantilla",  sub: "Demo · campo",          email: "demo-tech@systemrapid.com" },
  { key: "tech_ext", label: "Tech externo",    sub: "Demo · sub",            email: "demo-tech-ext@systemrapid.com" },
  { key: "pruebas",  label: "Pruebas Tech",    sub: "Demo · doble SRS+campo", email: "demo-pruebas@systemrapid.com" },
];

const HERO_COUNTERS = [
  { num: "142", label: "Sitios" },
  { num: "23",  label: "Técnicos" },
  { num: "11",  label: "WO · live" },
];

const MONO_LABEL = {
  fontFamily: "'JetBrains Mono', monospace",
  fontWeight: 700,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const JAKARTA = "'Plus Jakarta Sans', sans-serif";

export default function LoginPage() {
  const { t } = useTranslation("common");
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
      setError(err.message || t("page_auth.error_invalid_credentials"));
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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#F4F6F8" }}>
      {/* ─── Hero band navy ─────────────────────────────────────── */}
      <div
        style={{
          background: "#0A1628",
          color: "#FFFFFF",
          padding: "36px 48px 28px",
          borderBottom: "4px solid #16A34A",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 40,
            maxWidth: 1100,
            margin: "0 auto",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ ...MONO_LABEL, fontSize: 10, color: "#C8CDD8", letterSpacing: "0.18em", marginBottom: 8 }}>
              SRS · Sistema operativo interno · v1 Foundation
            </div>
            <div
              style={{
                fontFamily: JAKARTA,
                fontSize: 48,
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 1,
              }}
            >
              InsiteIQ
            </div>
            <div
              style={{
                fontFamily: JAKARTA,
                fontStyle: "italic",
                fontSize: 16,
                fontWeight: 400,
                color: "#C8CDD8",
                marginTop: 10,
                maxWidth: 540,
              }}
            >
              Field services IT · cobertura internacional · 25 años de operación.
            </div>
          </div>

          <div style={{ display: "flex", gap: 36 }}>
            {HERO_COUNTERS.map((c) => (
              <div key={c.label} style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontFamily: JAKARTA,
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#FFFFFF",
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {c.num}
                </div>
                <div style={{ ...MONO_LABEL, fontSize: 9, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 4 }}>
                  {c.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Body con form + chips ─────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: 420 }}>
          <form
            onSubmit={handleSubmit}
            style={{
              width: "100%",
              background: "#FFFFFF",
              padding: "32px 28px",
              borderRadius: 8,
              border: "1px solid #E2E5EC",
              boxShadow: "0 8px 24px -4px rgba(10, 22, 40, 0.08), 0 4px 8px -2px rgba(10, 22, 40, 0.04)",
            }}
          >
            <div style={{ ...MONO_LABEL, fontSize: 10, color: "#8B95A8", marginBottom: 6 }}>
              Acceso operativo
            </div>
            <h2
              style={{
                fontFamily: JAKARTA,
                fontSize: 26,
                fontWeight: 800,
                color: "#0A1628",
                letterSpacing: "-0.02em",
                marginBottom: 22,
              }}
            >
              Iniciar sesión
            </h2>

            <FieldLabel>{t("page_auth.field_email")}</FieldLabel>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />

            <FieldLabel>{t("page_auth.field_password")}</FieldLabel>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
              onFocus={focusInput}
              onBlur={blurInput}
            />

            {error && (
              <div
                style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  borderLeft: "3px solid #DC2626",
                  color: "#991B1B",
                  fontFamily: JAKARTA,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "8px 12px",
                  borderRadius: 4,
                  marginTop: 4,
                  marginBottom: 12,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                width: "100%",
                height: 42,
                background: "#0A1628",
                color: "#FFFFFF",
                border: "1.5px solid #0A1628",
                borderRadius: 6,
                fontFamily: JAKARTA,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                cursor: busy ? "not-allowed" : "pointer",
                marginTop: 8,
                opacity: busy ? 0.5 : 1,
                boxShadow: "0 2px 6px -1px rgba(10, 22, 40, 0.32)",
                transition: "all 160ms",
              }}
              onMouseEnter={(e) => {
                if (busy) return;
                e.currentTarget.style.background = "#1A2640";
                e.currentTarget.style.boxShadow = "0 4px 12px -2px rgba(10, 22, 40, 0.42)";
              }}
              onMouseLeave={(e) => {
                if (busy) return;
                e.currentTarget.style.background = "#0A1628";
                e.currentTarget.style.boxShadow = "0 2px 6px -1px rgba(10, 22, 40, 0.32)";
              }}
            >
              {busy ? t("page_auth.submitting_login") : t("page_auth.submit_login")}
            </button>
          </form>

          {/* ─── Demo chips · 6 cuentas (Z-a + Iter 2.20) ────────── */}
          <div
            style={{
              width: "100%",
              marginTop: 18,
              padding: "16px 18px",
              background: "rgba(255, 255, 255, 0.92)",
              border: "1px solid #E2E5EC",
              borderRadius: 8,
            }}
          >
            <div style={{ ...MONO_LABEL, fontSize: 10, color: "#8B95A8", marginBottom: 12 }}>
              Demo
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {DEMO_ROLES.map((role) => {
                const isActive = quickKey === role.key;
                return (
                  <button
                    key={role.key}
                    type="button"
                    disabled={busy}
                    onClick={() => handleQuick(role)}
                    style={{
                      textAlign: "left",
                      padding: "8px 12px",
                      background: isActive ? "#0A1628" : "#FFFFFF",
                      border: `1px solid ${isActive ? "#0A1628" : "#C8CDD8"}`,
                      borderRadius: 6,
                      cursor: busy ? "not-allowed" : "pointer",
                      opacity: busy && !isActive ? 0.4 : 1,
                      transition: "all 160ms",
                    }}
                    onMouseEnter={(e) => {
                      if (busy || isActive) return;
                      e.currentTarget.style.borderColor = "#0A1628";
                      e.currentTarget.style.background = "#F4F6F8";
                    }}
                    onMouseLeave={(e) => {
                      if (busy || isActive) return;
                      e.currentTarget.style.borderColor = "#C8CDD8";
                      e.currentTarget.style.background = "#FFFFFF";
                    }}
                  >
                    <div
                      style={{
                        fontFamily: JAKARTA,
                        fontSize: 13,
                        fontWeight: 700,
                        color: isActive ? "#FFFFFF" : "#0A1628",
                        lineHeight: 1.2,
                      }}
                    >
                      {role.label}
                    </div>
                    <div
                      style={{
                        ...MONO_LABEL,
                        fontSize: 9,
                        color: isActive ? "#C8CDD8" : "#8B95A8",
                        letterSpacing: "0.1em",
                        marginTop: 3,
                      }}
                    >
                      {role.sub}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function FieldLabel({ children }) {
  return (
    <label
      style={{
        display: "block",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        fontWeight: 700,
        color: "#3D4A66",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        marginBottom: 6,
      }}
    >
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  height: 38,
  border: "1px solid #C8CDD8",
  borderRadius: 6,
  padding: "0 12px",
  fontSize: 13.5,
  color: "#0A1628",
  fontFamily: JAKARTA,
  fontWeight: 500,
  outline: "none",
  marginBottom: 14,
  transition: "all 160ms",
  background: "#FFFFFF",
};

function focusInput(e) {
  e.currentTarget.style.border = "1.5px solid #0A1628";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10, 22, 40, 0.10)";
}

function blurInput(e) {
  e.currentTarget.style.border = "1px solid #C8CDD8";
  e.currentTarget.style.boxShadow = "none";
}
