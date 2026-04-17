/**
 * Per-space theme registry. Import the theme for the active space.
 *
 * Usage (Fase 4 wiring):
 *   import { getTheme } from "./themes";
 *   const theme = getTheme("srs"|"client"|"tech");
 */
import { themeSRS } from "./srs";
import { themeClient } from "./client";
import { themeTech } from "./tech";

export const themes = {
  srs: themeSRS,
  client: themeClient,
  tech: themeTech,
};

export function getTheme(spaceId) {
  const t = themes[spaceId];
  if (!t) throw new Error(`Unknown space theme: ${spaceId}`);
  return t;
}

export { themeSRS, themeClient, themeTech };
export { techWoStatusColor } from "./tech";
