import { createContext, useContext, useMemo, useState } from "react";
import { DEFAULT_HAUNT_SCOPE, isHauntScope, type HauntId, type HauntScope } from "../models/haunt";
import { readPreference } from "../preferences/localPreferences";

export interface HauntScopeState {
  /** The haunt being looked at, or `all`. */
  scope: HauntScope;
  setScope: (scope: HauntScope) => void;
  /** The haunt id a scope narrows to, or `null` under All Haunts. */
  hauntId: HauntId | null;
  /** True when both haunts are on screen together, so each needs naming. */
  isAllHaunts: boolean;
}

/**
 * The haunt the app is currently looking at.
 *
 * A context rather than a per-page hook because every page reads it — the
 * nav's own wording depends on it — and they must all agree at once. The
 * provider (`HauntScopeProvider`) is what reads and writes the stored
 * preference, so the app reopens where the user left it.
 */
export const HauntScopeContext = createContext<HauntScopeState | null>(null);

export function readStoredHauntScope(): HauntScope {
  const stored = readPreference("hauntScope");
  return isHauntScope(stored) ? stored : DEFAULT_HAUNT_SCOPE;
}

/**
 * The current haunt context. Outside the provider — in an isolated test, or
 * a component rendered on its own — it answers All Haunts and remembers
 * nothing, which is the same thing a first launch sees.
 */
export function useHauntScope(): HauntScopeState {
  const context = useContext(HauntScopeContext);
  const [fallback, setFallback] = useState<HauntScope>(DEFAULT_HAUNT_SCOPE);

  const standalone = useMemo<HauntScopeState>(
    () => ({
      scope: fallback,
      setScope: setFallback,
      hauntId: fallback === "all" ? null : fallback,
      isAllHaunts: fallback === "all",
    }),
    [fallback],
  );

  return context ?? standalone;
}
