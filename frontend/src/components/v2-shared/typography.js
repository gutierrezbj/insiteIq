/**
 * v2-shared · typography constants (Iter 2.22).
 *
 * Constantes compartidas para evitar repetir font-family + caps style
 * inline en cada page migrada. Importar donde haga falta.
 */

export const JAKARTA = "'Plus Jakarta Sans', sans-serif";
export const MONO = "'JetBrains Mono', monospace";

export const MONO_CAPS = {
  fontFamily: MONO,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};
