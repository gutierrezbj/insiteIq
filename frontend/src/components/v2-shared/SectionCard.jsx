/**
 * v2-shared · SectionCard + SectionTitle (Iter 2.22).
 *
 * Wrapper card con border-left navy 3px (signature paleta F) + border
 * 1px gris suave + radius 6 + padding 18.
 *
 * SectionTitle = label mono caps slate, default 14px margin-bottom.
 */

import { MONO_CAPS } from "./typography";

const BASE = {
  background: "#FFFFFF",
  border: "1px solid #E2E5EC",
  borderLeft: "3px solid #0A1628",
  borderRadius: 6,
};

export default function SectionCard({ children, padding = 18, style }) {
  return <section style={{ ...BASE, padding, ...style }}>{children}</section>;
}

export function SectionTitle({ children, marginBottom = 14 }) {
  return (
    <div style={{ ...MONO_CAPS, fontSize: 10, color: "#3D4A66", letterSpacing: "0.14em", marginBottom }}>
      {children}
    </div>
  );
}
