import { createContext, useContext, useMemo, useState } from "react";
import { ALL_HAUNTS, DEFAULT_HAUNT_SCOPE, type HauntId, type HauntScope } from "../models/haunt";
import { readPreference } from "../preferences/localPreferences";

export interface HauntScopeState {
  /** The haunt being looked at, or `all`. */
  scope: HauntScope;
  setScope: (scope: HauntScope) => void;
  /** What the app opens on, chosen in Settings. */
  defaultScope: HauntScope;
  /** Changes the default and switches to it, which is what choosing one means. */
  setDefaultScope: (scope: HauntScope) => void;
  /** The haunt id a scope narrows to, or `null` under All Haunts. */
  hauntId: HauntId | null;
  /** True when every haunt is on screen together, so each needs naming. */
  isAllHaunts: boolean;
}

/**
 * The haunt the app is currently looking at.
 *
 * A context rather than a per-page hook because every page reads it — the
 * nav's own wording depends on it — and they must all agree at once. The
 * provider (`HauntScopeProvider`) is what reads and writes the stored
 * preferences, so the app reopens where the user left it.
 */
export const HauntScopeContext = createContext<HauntScopeState | null>(null);

/**
 * A stored scope is `all` or a haunt id. Whether that haunt still exists is
 * the registry's business, not this function's — a haunt can be added by a
 * pack, so an id this build has never seen is not by itself wrong.
 */
function storedScope(key: "hauntScope" | "defaultHauntScope"): HauntScope | null {
  const stored = readPreference(key);
  if (typeof stored !== "string" || stored.trim() === "") {
    return null;
  }
  return stored === ALL_HAUNTS ? ALL_HAUNTS : stored;
}

/** What a fresh start opens on: the Settings choice, or the app default. */
export function readDefaultHauntScope(): HauntScope {
  return storedScope("defaultHauntScope") ?? DEFAULT_HAUNT_SCOPE;
}

/**
 * The haunt to open on: the one last looked at, falling back to the chosen
 * default. Returning to where the reader left off matters more than
 * re-asserting the default on every launch.
 */
export function readStoredHauntScope(): HauntScope {
  return storedScope("hauntScope") ?? readDefaultHauntScope();
}

/**
 * The current haunt context. Outside the provider — in an isolated test, or
 * a component rendered on its own — it answers the default and remembers
 * nothing, which is the same thing a first launch sees.
 */
export function useHauntScope(): HauntScopeState {
  const context = useContext(HauntScopeContext);
  const [fallback, setFallback] = useState<HauntScope>(DEFAULT_HAUNT_SCOPE);

  const standalone = useMemo<HauntScopeState>(
    () => ({
      scope: fallback,
      setScope: setFallback,
      defaultScope: DEFAULT_HAUNT_SCOPE,
      setDefaultScope: setFallback,
      hauntId: fallback === ALL_HAUNTS ? null : fallback,
      isAllHaunts: fallback === ALL_HAUNTS,
    }),
    [fallback],
  );

  return context ?? standalone;
}
