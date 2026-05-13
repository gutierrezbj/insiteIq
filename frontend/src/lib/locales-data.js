/**
 * Datasets compartidos para inputs de país y timezone — reusados en
 * todos los Edit/Create modals para evitar text input libre que invita
 * a errores tipográficos.
 *
 * Si necesitas un país o TZ que no está acá, lo agregas a esta lista
 * (es la única fuente para los desplegables) y se propaga a todos los
 * formularios automáticamente.
 *
 * Iter 2.63e · feedback owner 2026-05-10: "los paises deberian ser
 * desplegables preestablecidos · timezones también"
 */

/**
 * Países con presencia operativa SRS (clients + sites + members).
 * Sort: alfabético por nombre español para que sea fácil de scanear.
 * ISO = ISO-3166 alpha-2.
 */
export const COUNTRIES = [
  { iso: "AR", name: "Argentina" },
  { iso: "AW", name: "Aruba" },
  { iso: "BR", name: "Brasil" },
  { iso: "CA", name: "Canadá" },
  { iso: "CL", name: "Chile" },
  { iso: "CO", name: "Colombia" },
  { iso: "CR", name: "Costa Rica" },
  { iso: "CW", name: "Curazao" },
  { iso: "DO", name: "Rep. Dominicana" },
  { iso: "EC", name: "Ecuador" },
  { iso: "ES", name: "España" },
  { iso: "FR", name: "Francia" },
  { iso: "GB", name: "Reino Unido" },
  { iso: "GF", name: "Guayana Francesa" },
  { iso: "GP", name: "Guadalupe" },
  { iso: "GT", name: "Guatemala" },
  { iso: "HN", name: "Honduras" },
  { iso: "IT", name: "Italia" },
  { iso: "MQ", name: "Martinica" },
  { iso: "MX", name: "México" },
  { iso: "NI", name: "Nicaragua" },
  { iso: "PA", name: "Panamá" },
  { iso: "PE", name: "Perú" },
  { iso: "PR", name: "Puerto Rico" },
  { iso: "PT", name: "Portugal" },
  { iso: "PY", name: "Paraguay" },
  { iso: "SV", name: "El Salvador" },
  { iso: "TT", name: "Trinidad y Tobago" },
  { iso: "US", name: "Estados Unidos" },
  { iso: "UY", name: "Uruguay" },
  { iso: "VE", name: "Venezuela" },
  { iso: "VI", name: "Islas Vírgenes (US)" },
];

/**
 * Timezones con presencia operativa SRS (equipo + sites).
 * Cada entry trae IANA + label corto sugerido para tz_label.
 * Sort: por offset GMT (occidental → oriental).
 */
export const TIMEZONES = [
  { tz: "America/Los_Angeles",  label: "LA" },
  { tz: "America/Phoenix",      label: "Phoenix" },
  { tz: "America/Denver",       label: "Denver" },
  { tz: "America/Chicago",      label: "Chicago" },
  { tz: "America/Mexico_City",  label: "Ciudad de México" },
  { tz: "America/Costa_Rica",   label: "Costa Rica" },
  { tz: "America/Guatemala",    label: "Guatemala" },
  { tz: "America/New_York",     label: "NY" },
  { tz: "America/Miami",        label: "Miami" },
  { tz: "America/Toronto",      label: "Toronto" },
  { tz: "America/Bogota",       label: "Bogotá" },
  { tz: "America/Lima",         label: "Lima" },
  { tz: "America/Panama",       label: "Panamá" },
  { tz: "America/Caracas",      label: "Caracas" },
  { tz: "America/La_Paz",       label: "La Paz" },
  { tz: "America/Santiago",     label: "Santiago" },
  { tz: "America/Asuncion",     label: "Asunción" },
  { tz: "America/Curacao",      label: "Curazao" },
  { tz: "America/Puerto_Rico",  label: "San Juan" },
  { tz: "America/Santo_Domingo", label: "Santo Domingo" },
  { tz: "America/Argentina/Buenos_Aires", label: "Buenos Aires" },
  { tz: "America/Montevideo",   label: "Montevideo" },
  { tz: "America/Sao_Paulo",    label: "São Paulo" },
  { tz: "Atlantic/Azores",      label: "Azores" },
  { tz: "UTC",                  label: "UTC" },
  { tz: "Europe/London",        label: "London" },
  { tz: "Europe/Lisbon",        label: "Lisboa" },
  { tz: "Europe/Madrid",        label: "Madrid" },
  { tz: "Europe/Paris",         label: "París" },
  { tz: "Europe/Rome",          label: "Roma" },
  { tz: "Africa/Casablanca",    label: "Casablanca" },
];

/**
 * Lookup helper · dado un IANA tz, devuelve el label corto sugerido.
 * Si no está en TIMEZONES devuelve null (caller usa el IANA crudo).
 */
export function tzLabelFor(iana) {
  if (!iana) return null;
  const found = TIMEZONES.find((t) => t.tz === iana);
  return found ? found.label : null;
}

/**
 * Lookup helper · dado un ISO-2, devuelve el nombre del país.
 */
export function countryNameFor(iso) {
  if (!iso) return null;
  const found = COUNTRIES.find((c) => c.iso === iso.toUpperCase());
  return found ? found.name : null;
}
