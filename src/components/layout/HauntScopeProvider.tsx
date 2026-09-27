import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  HauntScopeContext,
  readDefaultHauntScope,
  readStoredHauntScope,
  type HauntScopeState,
} from "../../hooks/useHauntScope";
import type { HauntScope } from "../../models/haunt";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { writePreference } from "../../preferences/localPreferences";

/**
 * Holds the haunt in view for the whole app, and remembers it.
 *
 * Two stored values, doing different jobs: the haunt last looked at, so a
 * relaunch returns to it, and the default chosen in Settings, which is what
 * a first launch — or an install that has never chosen — opens on.
 */
export function HauntScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<HauntScope>(readStoredHauntScope);
  const [defaultScope, setDefaultScopeState] = useState<HauntScope>(readDefaultHauntScope);
  const registry = useHauntRegistry();

  const setScope = useCallback((next: HauntScope) => {
    setScopeState(next);
    writePreference("hauntScope", next);
  }, []);

  const setDefaultScope = useCallback(
    (next: HauntScope) => {
      setDefaultScopeState(next);
      writePreference("defaultHauntScope", next);
      // Choosing a default and then not seeing it would be a strange thing
      // to have asked for, so it takes effect now as well.
      setScope(next);
    },
    [setScope],
  );

  // A remembered haunt can stop existing: a Haunt Pack withdrawn, or a
  // backup restored from a machine that never had it. Rather than leaving
  // the app pointed at a haunt-shaped hole — empty lists, generic wording,
  // no way back — it reads as the default, or as All Haunts if that has
  // gone too. What is stored is left alone, so a haunt that comes back is
  // still the one being looked at.
  const knownHaunts = registry.haunts;
  const isKnown = (value: HauntScope) =>
    value === "all" || knownHaunts.length === 0 || knownHaunts.some((haunt) => haunt.id === value);
  const effectiveScope: HauntScope = isKnown(scope)
    ? scope
    : isKnown(defaultScope)
      ? defaultScope
      : "all";

  const value = useMemo<HauntScopeState>(
    () => ({
      scope: effectiveScope,
      setScope,
      defaultScope,
      setDefaultScope,
      hauntId: effectiveScope === "all" ? null : effectiveScope,
      isAllHaunts: effectiveScope === "all",
    }),
    [effectiveScope, setScope, defaultScope, setDefaultScope],
  );

  return <HauntScopeContext.Provider value={value}>{children}</HauntScopeContext.Provider>;
}
