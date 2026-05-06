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

import { useTranslation } from "react-i18next";
import EmptyState from "../v2-shared/EmptyState";

export default function KanbanColumn({
  id,
  title,
  count,
  children,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const { t } = useTranslation("common");
  return (
    <section
      data-col={id}
      className="kanban-col flex-shrink-0 rounded-lg flex flex-col"
      style={{
        width: 300,
        maxHeight: "calc(100vh - 280px)",
        background: "#F4F6F8",
        border: "1px solid #E2E5EC",
      }}
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
      {/* Header · navy strong title + counter pill navy soft */}
      <header
        className="px-4 py-3 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid #C8CDD8" }}
      >
        <h2
          className="font-jakarta text-[13px] uppercase"
          style={{ color: "#0A1628", fontWeight: 800, letterSpacing: "0.1em" }}
        >
          {title}
        </h2>
        <span
          className="font-jakarta px-2.5 py-0.5 rounded-full"
          style={{
            background: "#0A1628",
            color: "#FFFFFF",
            fontSize: 11,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
            minWidth: 28,
            textAlign: "center",
          }}
        >
          {count}
        </span>
      </header>

      {/* Body */}
      <div className="col-scroll wr-scroll flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {count === 0 ? (
          <EmptyState icon="inbox" title={t("kanban.empty_col")} compact />
        ) : (
          children
        )}
      </div>
    </section>
  );
}
