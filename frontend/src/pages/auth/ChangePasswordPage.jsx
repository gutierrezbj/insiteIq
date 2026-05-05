/**
 * Change password · v2 paleta F (Iter 2.40).
 *
 * Forced rotation on first login (must_change_password=true) o accesible
 * on demand. Mismo lenguaje paleta F que LoginPage.
 *
 * Client-side guards mirror backend:
 *   - new_password >= 10 chars
 *   - new_password != current_password
 *   - confirm must match new
 */
import { useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { preferredSpaceFor, spaceToPath } from "../../lib/auth";

const JAKARTA = "'Plus Jakarta Sans', sans-serif";
const MONO = "'JetBrains Mono', monospace";
const MONO_CAPS = {
  fontFamily: MONO,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};

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
    if (next && next.length < 10) issues.push("Mínimo 10 caracteres");
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
      if (forced) {
        const target = spaceToPath(preferredSpaceFor(user)) || "/";
        setTimeout(() => navigate(target, { replace: true }), 900);
      } else {
        const from = location.state?.from?.pathname;
        setTimeout(() => navigate(from || "/", { replace: true }), 900);
      }
    } catch (err) {
      setError(err.message || "No se pudo cambiar la contraseña");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        background: "#F4F6F8",
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#FFFFFF",
          border: "1px solid #E2E5EC",
          borderLeft: "3px solid #0A1628",
          borderRadius: 8,
          padding: "32px 28px",
          boxShadow: "0 8px 24px -4px rgba(10, 22, 40, 0.08), 0 4px 8px -2px rgba(10, 22, 40, 0.04)",
        }}
      >
        <div
          style={{
            ...MONO_CAPS,
            fontSize: 10,
            color: forced ? "#7E5212" : "#8B95A8",
            letterSpacing: "0.16em",
            marginBottom: 6,
          }}
        >
          {forced ? "Rotación obligatoria" : "Seguridad"}
        </div>
        <h1
          style={{
            fontFamily: JAKARTA,
            fontSize: 22,
            fontWeight: 800,
            color: "#0A1628",
            letterSpacing: "-0.015em",
            marginBottom: 8,
          }}
        >
          Cambiar contraseña
        </h1>
        <p
          style={{
            fontFamily: JAKARTA,
            fontSize: 13,
            color: "#3D4A66",
            fontWeight: 500,
            lineHeight: 1.55,
            marginBottom: 22,
          }}
        >
          {forced
            ? "Tu cuenta fue provisionada por SRS. Antes de entrar, define una contraseña propia."
            : "Reemplaza tu contraseña actual por una nueva."}
        </p>

        <FieldLabel>Contraseña actual</FieldLabel>
        <PasswordInput
          id="cp-current"
          autoComplete="current-password"
          value={current}
          onChange={setCurrent}
        />

        <FieldLabel>Contraseña nueva</FieldLabel>
        <PasswordInput
          id="cp-new"
          autoComplete="new-password"
          value={next}
          onChange={setNext}
          minLength={10}
          marginBottom={4}
        />
        <div
          style={{
            ...MONO_CAPS,
            fontSize: 9.5,
            color: "#8B95A8",
            letterSpacing: "0.14em",
            marginBottom: 14,
          }}
        >
          {next.length}/10 min
        </div>

        <FieldLabel>Confirmar nueva</FieldLabel>
        <PasswordInput
          id="cp-confirm"
          autoComplete="new-password"
          value={confirm}
          onChange={setConfirm}
        />

        {validation.length > 0 && (
          <ul
            style={{
              marginBottom: 14,
              ...MONO_CAPS,
              fontSize: 9.5,
              color: "#7E5212",
              letterSpacing: "0.14em",
              listStyle: "none",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {validation.map((v) => (
              <li key={v}>· {v}</li>
            ))}
          </ul>
        )}

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
              marginBottom: 14,
            }}
          >
            {error}
          </div>
        )}

        {done && (
          <div
            style={{
              background: "#D9F1E5",
              border: "1px solid #16A34A",
              borderLeft: "3px solid #0A6131",
              color: "#0A6131",
              fontFamily: JAKARTA,
              fontSize: 13,
              fontWeight: 600,
              padding: "10px 14px",
              borderRadius: 4,
              marginBottom: 14,
            }}
          >
            Contraseña actualizada. Redirigiendo…
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            width: "100%",
            height: 42,
            background: "#0A1628",
            color: "#FFFFFF",
            border: "1.5px solid #0A1628",
            borderRadius: 6,
            ...MONO_CAPS,
            fontSize: 12,
            letterSpacing: "0.14em",
            cursor: canSubmit ? "pointer" : "not-allowed",
            opacity: canSubmit ? 1 : 0.5,
            boxShadow: "0 2px 6px -1px rgba(10, 22, 40, 0.32)",
            transition: "all 160ms",
          }}
          onMouseEnter={(e) => {
            if (!canSubmit) return;
            e.currentTarget.style.background = "#1A2640";
            e.currentTarget.style.borderColor = "#1A2640";
          }}
          onMouseLeave={(e) => {
            if (!canSubmit) return;
            e.currentTarget.style.background = "#0A1628";
            e.currentTarget.style.borderColor = "#0A1628";
          }}
        >
          {busy ? "Guardando…" : "Actualizar contraseña"}
        </button>

        {!forced && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              width: "100%",
              marginTop: 10,
              padding: "10px 16px",
              background: "#FFFFFF",
              color: "#3D4A66",
              border: "1.5px solid #C8CDD8",
              borderRadius: 6,
              ...MONO_CAPS,
              fontSize: 10,
              letterSpacing: "0.14em",
              cursor: "pointer",
              transition: "all 160ms",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#0A1628";
              e.currentTarget.style.borderColor = "#0A1628";
              e.currentTarget.style.background = "#F4F6F8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#3D4A66";
              e.currentTarget.style.borderColor = "#C8CDD8";
              e.currentTarget.style.background = "#FFFFFF";
            }}
          >
            Cancelar
          </button>
        )}

        <p style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", marginTop: 22 }}>
          Herramienta interna SRS · auditado en audit_log
        </p>
      </form>
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <div style={{ ...MONO_CAPS, fontSize: 9.5, color: "#3D4A66", letterSpacing: "0.14em", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, minLength, marginBottom = 14 }) {
  return (
    <input
      id={id}
      type="password"
      autoComplete={autoComplete}
      minLength={minLength}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      style={{
        width: "100%",
        height: 38,
        background: "#FFFFFF",
        border: "1px solid #C8CDD8",
        borderRadius: 6,
        padding: "0 12px",
        fontFamily: JAKARTA,
        fontSize: 13.5,
        color: "#0A1628",
        fontWeight: 500,
        outline: "none",
        marginBottom,
        transition: "all 160ms",
      }}
      onFocus={(e) => {
        e.currentTarget.style.border = "1.5px solid #0A1628";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10, 22, 40, 0.10)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.border = "1px solid #C8CDD8";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}
