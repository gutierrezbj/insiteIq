/**
 * Iconos Lucide para el widget de alertas.
 * NUNCA emojis. Stroke 1.5, size variable.
 */
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  Truck,
  UserX,
  Zap,
  Lock,
  Cloud,
  Battery,
  Circle,
  ShieldAlert,
} from "lucide-react";

export function SeverityIcon({ severity, size = 14, className = "" }) {
  const base = { strokeWidth: 1.75 };
  if (severity === "critical")
    return <AlertOctagon size={size} className={`text-danger ${className}`} {...base} />;
  if (severity === "warning")
    return <AlertTriangle size={size} className={`text-primary-light ${className}`} {...base} />;
  return <Info size={size} className={`text-text-tertiary ${className}`} {...base} />;
}

const KIND_ICON = {
  traffic:       Truck,
  no_show:       UserX,
  accident:      Zap,
  site_closed:   ShieldAlert,
  weather:       Cloud,
  access_denied: Lock,
  fleet:         Battery,
  other:         Circle,
};

export function KindIcon({ kind, size = 12, className = "" }) {
  const Comp = KIND_ICON[kind] || Circle;
  return <Comp size={size} strokeWidth={1.75} className={`text-text-secondary ${className}`} />;
}

export const KIND_LABEL = {
  traffic: "trafico",
  no_show: "no show",
  accident: "accidente",
  site_closed: "site cerrado",
  weather: "clima",
  access_denied: "acceso",
  fleet: "flota",
  other: "otro",
};
