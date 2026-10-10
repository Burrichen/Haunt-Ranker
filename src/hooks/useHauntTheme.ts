import { createContext, useContext } from "react";
import type { HauntTheme } from "../models/hauntTheme";

/**
 * The haunt theme in effect where a component renders. CSS already follows
 * `data-haunt-theme` down the DOM; this carries the same value to content
 * that leaves the DOM tree — a modal portalled to `<body>` — so a review
 * opened on a Knott's page still looks like Knott's.
 *
 * Outside any provider it is HHN's, which is also what `:root` resolves to.
 */
export const HauntThemeContext = createContext<HauntTheme>("hhn");

export function useHauntTheme(): HauntTheme {
  return useContext(HauntThemeContext);
}
