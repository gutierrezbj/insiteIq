/**
 * v2-shared · MetaRow (Iter 2.22).
 *
 * Row de definition list: label mono caps izq + value Plus Jakarta der.
 * Para metadata sections tipo "Client org / Service agreement / Cluster lead".
 */

import { JAKARTA, MONO_CAPS } from "./typography";

export default function MetaRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderBottom: "1px solid #F0F2F7",
      }}
    >
      <span style={{ ...MONO_CAPS, fontSize: 9.5, color: "#8B95A8", letterSpacing: "0.14em", flexShrink: 0 }}>
        {label}
      </span>
      <span
        style={{
          fontFamily: JAKARTA,
          fontSize: 13,
          color: "#0A1628",
          fontWeight: 600,
          maxWidth: "60%",
          textAlign: "right",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {value}
      </span>
    </div>
  );
}
