/**
 * Skeleton — placeholder shimmer durante load
 *
 * Design System v1.7 §3.5 (no spinners, skeleton > spinner per Foundation
 * SRS Nucleus rule "Skeleton > spinner for loading states").
 *
 * Anatomía: bloque rectangular con animación shimmer subtle. Width/height
 * configurables. Borde redondeado.
 *
 * Variantes pre-armadas:
 *   - <SkeletonLine width="60%" />   — para títulos / metadatos
 *   - <SkeletonBlock h={120} />      — para cards completas
 *   - <SkeletonCard />               — minicard con border-top + 4 líneas
 *   - <SkeletonKpiCard />            — KPI card de cockpit
 *   - <SkeletonInterventionCard />   — card horizontal del cockpit
 *   - <SkeletonKanbanCard />         — card Kanban con drag handle
 */

const SHIMMER_KEYFRAMES = `
@keyframes skeleton-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
`;

// Estilo base reutilizable. Background gradient subtle dark.
const baseStyle = {
  background:
    "linear-gradient(90deg, #141414 0%, #1F1F1F 50%, #141414 100%)",
  backgroundSize: "800px 100%",
  animation: "skeleton-shimmer 1.6s ease-in-out infinite",
  borderRadius: 4,
};

export function SkeletonLine({ width = "100%", height = 12, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{ ...baseStyle, width, height, ...style }}
    />
  );
}

export function SkeletonBlock({ width = "100%", height = 60, className = "", style = {} }) {
  return (
    <div
      className={className}
      style={{ ...baseStyle, width, height, borderRadius: 6, ...style }}
    />
  );
}

/* KPI Card · matchea exact dimensions de KpiStripV2 */
export function SkeletonKpiCard() {
  return (
    <div
      className="bg-wr-bg border-l-2 border-wr-border"
      style={{ padding: "16px 20px" }}
    >
      <div className="flex items-center justify-between mb-3">
        <SkeletonLine width="50%" height={10} />
        <SkeletonLine width={16} height={16} style={{ borderRadius: "50%" }} />
      </div>
      <SkeletonLine width={60} height={36} style={{ borderRadius: 4, marginBottom: 8 }} />
      <SkeletonLine width="70%" height={9} />
    </div>
  );
}

/* Intervention card horizontal Full · matchea dimensions */
export function SkeletonInterventionCardFull() {
  return (
    <div
      className="bg-wr-surface border border-wr-border rounded-sm"
      style={{ padding: 14, borderTop: "2px solid #1F1F1F" }}
    >
      <div className="flex justify-between mb-3">
        <SkeletonLine width={90} height={11} />
        <SkeletonLine width={70} height={16} style={{ borderRadius: 2 }} />
      </div>
      <SkeletonLine width="80%" height={16} style={{ marginBottom: 6 }} />
      <SkeletonLine width="60%" height={11} style={{ marginBottom: 14 }} />
      <div className="space-y-2 mb-4">
        <SkeletonLine width="50%" height={11} />
        <SkeletonLine width="65%" height={11} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SkeletonBlock height={28} />
        <SkeletonBlock height={28} />
      </div>
    </div>
  );
}

/* Intervention card mini (4-cols grid) · matchea dimensions */
export function SkeletonInterventionCardMini() {
  return (
    <div
      className="bg-wr-surface border border-wr-border rounded-sm"
      style={{ padding: 12, borderTop: "2px solid #1F1F1F" }}
    >
      <SkeletonLine width="60%" height={10} style={{ marginTop: 3, marginBottom: 8 }} />
      <SkeletonLine width="85%" height={13} style={{ marginBottom: 12 }} />
      <div className="flex justify-between">
        <SkeletonLine width="35%" height={10} />
        <SkeletonLine width={60} height={14} style={{ borderRadius: 2 }} />
      </div>
    </div>
  );
}

/* Kanban card · matchea dimensions de WoKanbanCard */
export function SkeletonKanbanCard() {
  return (
    <div
      className="bg-wr-surface border border-wr-border"
      style={{
        padding: 14,
        borderRadius: "0 0 8px 8px",
        borderTop: "2px solid #1F1F1F",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <SkeletonLine width={8} height={14} />
        <SkeletonLine width={50} height={14} style={{ borderRadius: 2 }} />
        <SkeletonLine width={60} height={9} />
      </div>
      <SkeletonLine width="80%" height={15} style={{ marginBottom: 6 }} />
      <SkeletonLine width="65%" height={11} style={{ marginBottom: 10 }} />
      <div className="flex gap-1.5 mb-3">
        <SkeletonLine width={60} height={18} style={{ borderRadius: 4 }} />
        <SkeletonLine width={50} height={18} style={{ borderRadius: 999 }} />
      </div>
      <div className="space-y-1 mb-2">
        <SkeletonLine width="100%" height={11} />
        <SkeletonLine width="70%" height={11} />
      </div>
      <div
        className="flex justify-between pt-2"
        style={{ borderTop: "1px solid #1F1F1F" }}
      >
        <SkeletonLine width="40%" height={11} />
        <SkeletonLine width="25%" height={11} />
      </div>
    </div>
  );
}

/* Sidebar widget · genérico */
export function SkeletonWidget({ title, rows = 3 }) {
  return (
    <section className="border-b border-wr-border">
      <header className="px-5 py-3">
        <SkeletonLine width="40%" height={10} />
      </header>
      <div className="px-5 pb-4 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBlock key={i} height={48} />
        ))}
      </div>
    </section>
  );
}

/* Inyectar keyframes una vez en el documento (idempotente) */
if (typeof document !== "undefined" && !document.getElementById("skeleton-shimmer-style")) {
  const style = document.createElement("style");
  style.id = "skeleton-shimmer-style";
  style.textContent = SHIMMER_KEYFRAMES;
  document.head.appendChild(style);
}
