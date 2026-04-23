/**
 * BackLink · shared back-navigation control with more visual weight.
 *
 * Antes: font-mono text-2xs text-text-tertiary casi invisible.
 * Ahora: chip con border, padding, hover amber + subtle lift.
 *
 * Props:
 *   to?: string   · destino (si presente, usa <Link>)
 *   onClick?: fn  · handler (fallback si no hay 'to')
 *   label: string · texto a la derecha de la flecha
 *   compact?: bool· variante apretada (algunos layouts mobile)
 */
import { Link } from "react-router-dom";

const BASE_CLS =
  "inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-widest-srs " +
  "text-text-secondary bg-surface-overlay/60 border border-surface-border rounded-sm " +
  "px-3 py-1.5 mb-4 transition-all duration-fast ease-out-expo " +
  "hover:text-primary-light hover:border-primary hover:shadow-glow-primary hover:-translate-y-px";

const COMPACT_CLS =
  "inline-flex items-center gap-1.5 font-mono text-2xs uppercase tracking-widest-srs " +
  "text-text-secondary bg-surface-overlay/60 border border-surface-border rounded-sm " +
  "px-2.5 py-1 mb-3 transition-all duration-fast ease-out-expo " +
  "hover:text-primary-light hover:border-primary hover:shadow-glow-primary";

function Arrow() {
  return (
    <span className="font-mono text-primary-light" aria-hidden="true">
      ←
    </span>
  );
}

export default function BackLink({ to, onClick, label, compact = false }) {
  const cls = compact ? COMPACT_CLS : BASE_CLS;
  if (to) {
    return (
      <Link to={to} className={cls}>
        <Arrow />
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      <Arrow />
      <span>{label}</span>
    </button>
  );
}
