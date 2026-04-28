/**
 * KanbanColumn — columna del Kanban con drop zone visual.
 *
 * Extraído 1:1 de mocks/insiteiq_kanban_v2_static.html.
 *
 * Anatomía:
 *   - Header: title uppercase + counter pill
 *   - Body scrollable con cards (children)
 *   - Drop zone visual cuando body.drag-active está activo (outline dashed gris)
 *   - is-drop-target cuando drag está sobre esta columna (outline cyan + bg subtle)
 *   - Empty state si no hay cards
 *
 * Props:
 *   - id (key del column-stage map)
 *   - title
 *   - count
 *   - children (cards)
 *   - onDragOver, onDragLeave, onDrop
 */

import { Icon, ICONS } from "../../lib/icons";

export default function KanbanColumn({
  id,
  title,
  count,
  children,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  return (
    <section
      data-col={id}
      className="kanban-col flex-shrink-0 bg-wr-surface-2/60 rounded-lg flex flex-col"
      style={{ width: 300, maxHeight: "calc(100vh - 280px)" }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        e.currentTarget.classList.add("is-drop-target");
        onDragOver?.(id, e);
      }}
      onDragLeave={(e) => {
        // Solo quitar si salimos completamente de la columna
        if (!e.currentTarget.contains(e.relatedTarget)) {
          e.currentTarget.classList.remove("is-drop-target");
        }
        onDragLeave?.(id, e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("is-drop-target");
        onDrop?.(id, e);
      }}
    >
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-wr-border flex-shrink-0">
        <h2
          className="font-display text-[13px] font-semibold uppercase text-wr-text"
          style={{ letterSpacing: "0.08em" }}
        >
          {title}
        </h2>
        <span
          className="px-2 py-0.5 rounded-full bg-wr-bg border border-wr-border font-mono text-[11px] text-wr-text-mid"
        >
          {count}
        </span>
      </header>

      {/* Body */}
      <div className="col-scroll wr-scroll flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {count === 0 ? (
          <div className="text-center py-8 text-wr-text-dim">
            <Icon icon={ICONS.inbox} size={24} color="#6B7280" />
            <p className="text-[12px] mt-2">Sin intervenciones</p>
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
