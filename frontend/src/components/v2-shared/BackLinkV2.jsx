/**
 * v2-shared · BackLinkV2 (Iter 2.22).
 *
 * Chip back-navigation paleta F: navy outline squared + hover navy fill.
 * Reemplaza al BackLink v1 (tokens amber + glow).
 *
 * Sufijo "V2" para no chocar con el v1 que sigue siendo usado por las
 * páginas v1 legacy aún sin migrar.
 */

import { Link } from "react-router-dom";
import { MONO_CAPS } from "./typography";

export default function BackLinkV2({ to, label, marginBottom = 18 }) {
  return (
    <Link
      to={to}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "#FFFFFF",
        border: "1px solid #C8CDD8",
        borderRadius: 6,
        ...MONO_CAPS,
        fontSize: 10,
        color: "#3D4A66",
        textDecoration: "none",
        marginBottom,
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
      <span style={{ color: "#0A1628", fontWeight: 800 }}>←</span>
      {label}
    </Link>
  );
}
