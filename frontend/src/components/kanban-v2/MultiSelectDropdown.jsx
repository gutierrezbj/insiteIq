/**
 * MultiSelectDropdown — popover con checkboxes para filter bar Kanban.
 *
 * Design System v1.7 §5.4 (Filter bar).
 *
 * Anatomía:
 *   - Trigger button: label + chevron + counter pill cuando hay selección
 *   - Popover absolute al hacer click: lista scrollable de options con checkboxes
 *   - Click outside cierra el popover
 *   - Footer con "Limpiar" (deselect all) si hay alguna selección
 *
 * Props:
 *   - label: texto del trigger (Prioridad, Cliente, Shield, Técnico)
 *   - options: array de { value, label } o array de strings
 *   - selected: Set de values seleccionados
 *   - onChange: (newSet) => void
 */

import { useEffect, useRef, useState } from "react";
import { Icon, ICONS } from "../../lib/icons";

function normalizeOption(opt) {
  if (typeof opt === "string") return { value: opt, label: opt };
  return opt;
}

export default function MultiSelectDropdown({
  label,
  options = [],
  selected = new Set(),
  onChange,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Click outside cierra
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const count = selected.size;
  const hasSelection = count > 0;

  const toggle = (value) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange?.(next);
  };

  const clear = () => onChange?.(new Set());

  const normalized = options.map(normalizeOption);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-3 flex items-center gap-1.5 text-[13px] transition font-jakarta"
        style={{
          height: 34,
          borderRadius: 6,
          border: "1.5px solid #0A1628",
          background: hasSelection ? "#0A1628" : "#FFFFFF",
          color: hasSelection ? "#FFFFFF" : "#0A1628",
          fontWeight: 700,
        }}
        onMouseEnter={(e) => {
          if (!hasSelection) {
            e.currentTarget.style.background = "#F0F2F7";
          }
        }}
        onMouseLeave={(e) => {
          if (!hasSelection) {
            e.currentTarget.style.background = "#FFFFFF";
          }
        }}
      >
        {label}
        {hasSelection && (
          <span
            className="font-jakarta"
            style={{
              background: "#FFFFFF",
              color: "#0A1628",
              fontSize: 10,
              fontWeight: 800,
              minWidth: 20,
              padding: "1px 6px",
              borderRadius: 3,
              textAlign: "center",
            }}
          >
            {count}
          </span>
        )}
        <Icon icon={ICONS.chevronDown} size={12} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 left-0 rounded-md wr-scroll"
          style={{
            minWidth: 220,
            maxHeight: 300,
            overflowY: "auto",
            background: "#FFFFFF",
            border: "1px solid #C8CDD8",
            boxShadow: "0 16px 32px -4px rgba(10, 22, 40, 0.20), 0 8px 16px -4px rgba(10, 22, 40, 0.12)",
          }}
        >
          {normalized.length === 0 ? (
            <p
              className="p-3 text-[12px] text-cl-text-dim italic"
            >
              Sin opciones disponibles
            </p>
          ) : (
            <>
              <ul className="py-1">
                {normalized.map((opt) => {
                  const isSelected = selected.has(opt.value);
                  return (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => toggle(opt.value)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] font-jakarta transition"
                        style={{
                          color: isSelected ? "#0A1628" : "#3D4A66",
                          background: isSelected ? "#E8EDF5" : "transparent",
                          fontWeight: isSelected ? 700 : 500,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "#F7F8FA";
                            e.currentTarget.style.color = "#0A1628";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "#3D4A66";
                          }
                        }}
                      >
                        <span
                          className="flex items-center justify-center"
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 3,
                            border: `1.5px solid ${isSelected ? "#0A1628" : "#C8CDD8"}`,
                            background: isSelected ? "#0A1628" : "#FFFFFF",
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && (
                            <Icon icon={ICONS.checkCircle} size={11} color="#FFFFFF" />
                          )}
                        </span>
                        <span className="flex-1 truncate">{opt.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {hasSelection && (
                <div
                  className="px-3 py-2 flex items-center justify-between"
                  style={{ borderTop: "1px solid #E2E5EC", background: "#F7F8FA" }}
                >
                  <span className="text-[10px] text-cl-text-dim font-mono">
                    {count} seleccionado{count > 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={clear}
                    className="font-jakarta uppercase transition"
                    style={{
                      fontSize: 11,
                      color: "#3D4A66",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#FF6B35")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#3D4A66")}
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
