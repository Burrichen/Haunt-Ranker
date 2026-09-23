import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  HauntScopeContext,
  readStoredHauntScope,
  type HauntScopeState,
} from "../../hooks/useHauntScope";
import type { HauntScope } from "../../models/haunt";
import { writePreference } from "../../preferences/localPreferences";

/**
 * Holds the haunt in view for the whole app, and remembers it.
 *
 * The choice is read from local storage on mount and written back on every
 * change, so relaunching lands where the user left off rather than
 * resetting to one haunt's archive.
 */
export function HauntScopeProvider({ children }: { children: ReactNode }) {
  const [scope, setScopeState] = useState<HauntScope>(readStoredHauntScope);

  const setScope = useCallback((next: HauntScope) => {
    setScopeState(next);
    writePreference("hauntScope", next);
  }, []);

  const value = useMemo<HauntScopeState>(
    () => ({
      scope,
      setScope,
      hauntId: scope === "all" ? null : scope,
      isAllHaunts: scope === "all",
    }),
    [scope, setScope],
  );

  return <HauntScopeContext.Provider value={value}>{children}</HauntScopeContext.Provider>;
}
