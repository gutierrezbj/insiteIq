/**
 * TechCard — tarjeta presentacional de un técnico.
 *
 * Layout:
 *   [Avatar 44 + dot presence]  Nombre
 *                                Cargo
 *                                Ciudad · HH:mm
 *
 * Patrón visual: card horizontal con avatar circular + dot bottom-right
 * (presence indicator clásico, escala 44px del avatar deja espacio para
 * el dot 10px sin tapar la silueta del ícono Solar).
 *
 * Props (todas opcionales excepto name):
 *   - name: string · nombre completo (display)
 *   - role: string · cargo bajo el nombre
 *   - tzLabel: string · ciudad/zona ("Madrid", "Lima", "NY")
 *   - techTime: string · "HH:mm" hora local del tech
 *   - color: string · hex color del dot (status del tech)
 *   - pulse: boolean · animar el dot (onduty)
 *   - title: string · tooltip HTML completo
 *   - onClick: () => void
 *
 * Diseño paleta F · sin imports a Iconify (usa SVG inline para reducir
 * dependencias y evitar reflows del CDN script).
 */

const FALLBACK_DOT = "#C8CDD8";

export default function TechCard({
  name,
  role,
  tzLabel,
  techTime,
  color,
  pulse = false,
  title,
  onClick,
}) {
  const dotColor = color || FALLBACK_DOT;
  const interactive = typeof onClick === "function";

  return (
    <div
      onClick={interactive ? onClick : undefined}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      title={title}
      style={{
        background: "#FFFFFF",
        border: "1px solid #E2E5EC",
        borderLeft: "3px solid #0A1628",
        borderRadius: 8,
        padding: 16,
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: interactive ? "pointer" : "default",
        transition: "all 160ms",
        outline: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderLeftColor = "#D97706";
        e.currentTarget.style.boxShadow = "0 2px 6px rgba(10, 22, 40, 0.06)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderLeftColor = "#0A1628";
        e.currentTarget.style.boxShadow = "none";
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderLeftColor = "#D97706";
        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(217, 119, 6, 0.15)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderLeftColor = "#0A1628";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Avatar + dot presence */}
      <div
        style={{
          position: "relative",
          width: 44,
          height: 44,
          background: "#F4F6F8",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {/* Solar `user-linear` inline SVG · stroke 1.5 */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#3D4A66"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3.5-6 7-6s7 2.5 7 6" />
        </svg>

        {/* Dot presence: bottom-right, 10px con border blanco 2px (clásico Slack/Discord) */}
        <span
          className={pulse ? "animate-pulse" : ""}
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: dotColor,
            border: "2px solid #FFFFFF",
          }}
          aria-label="status"
        />
      </div>

      {/* Texto: nombre + cargo + ciudad·hora */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily:
              "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 14.5,
            fontWeight: 700,
            color: "#0A1628",
            letterSpacing: "-0.005em",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            lineHeight: 1.2,
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily:
              "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: "#3D4A66",
            marginTop: 2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {role || <span style={{ color: "#C8CDD8" }}>—</span>}
        </div>
        <div
          style={{
            fontFamily:
              "ui-monospace, 'JetBrains Mono', SFMono-Regular, monospace",
            fontSize: 11,
            color: "#8B95A8",
            marginTop: 3,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {tzLabel && techTime ? (
            <>
              {tzLabel} <span style={{ color: "#C8CDD8" }}>·</span> {techTime}
            </>
          ) : (
            <span style={{ color: "#C8CDD8" }}>—</span>
          )}
        </div>
      </div>
    </div>
  );
}
