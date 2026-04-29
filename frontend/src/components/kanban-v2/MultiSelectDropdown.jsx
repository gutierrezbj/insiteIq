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
        className={`h-9 px-3 flex items-center gap-1.5 text-[13px] border rounded-full transition ${
          hasSelection
            ? "border-wr-amber/40 bg-wr-amber/10 text-wr-amber"
            : "border-wr-border text-wr-text-mid hover:border-wr-border-strong"
        }`}
      >
        {label}
        {hasSelection && (
          <span
            className="px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold"
            style={{ background: "rgba(245, 158, 11, 0.2)", color: "#F59E0B" }}
          >
            {count}
          </span>
        )}
        <Icon icon={ICONS.chevronDown} size={14} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 left-0 bg-wr-surface border border-wr-border-strong rounded-md shadow-xl wr-scroll"
          style={{
            minWidth: 220,
            maxHeight: 300,
            overflowY: "auto",
            boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.7)",
          }}
        >
          {normalized.length === 0 ? (
            <p
              className="p-3 text-[12px] text-wr-text-dim italic"
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
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] transition ${
                          isSelected
                            ? "text-wr-amber bg-wr-amber/5"
                            : "text-wr-text-mid hover:text-wr-text hover:bg-wr-surface-2"
                        }`}
                      >
                        <span
                          className="flex items-center justify-center"
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 2,
                            border: `1px solid ${isSelected ? "#F59E0B" : "#2A2A2A"}`,
                            background: isSelected ? "#F59E0B" : "transparent",
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && (
                            <Icon icon={ICONS.checkCircle} size={10} color="#0A0A0A" />
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
                  className="border-t border-wr-border px-3 py-2 flex items-center justify-between"
                >
                  <span className="text-[10px] text-wr-text-dim font-mono">
                    {count} seleccionado{count > 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={clear}
                    className="text-[11px] text-wr-text-dim hover:text-wr-amber transition"
                    style={{ letterSpacing: "0.06em" }}
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
