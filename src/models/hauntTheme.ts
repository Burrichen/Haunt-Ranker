import { HAUNT_IDS } from "./haunt";

/**
 * The visual identity a piece of the UI wears. Set as `data-haunt-theme` on
 * an element; `src/styles/tokens.css` resolves the semantic accent tokens for
 * everything inside it.
 *
 * - `hhn`: burnt orange, with its restrained purple as the secondary.
 * - `knotts`: moonlit plum, with a ghost-green secondary.
 * - `all`: the neutral shell, used when no single haunt is in view, so the
 *   two haunts' own colours stay free to tell their content apart.
 */
export type HauntTheme = "hhn" | "knotts" | "all";

/** The theme for a haunt, or the neutral shell when there isn't one. */
export function hauntTheme(hauntId: string | null | undefined): HauntTheme {
  if (hauntId === HAUNT_IDS.hhn) {
    return "hhn";
  }
  if (hauntId === HAUNT_IDS.knotts) {
    return "knotts";
  }
  return "all";
}
