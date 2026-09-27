import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getDatabase } from "../../database/client";
import {
  buildRegistry,
  HauntRegistryContext,
  type HauntRegistry,
} from "../../hooks/useHauntRegistry";
import type { ExperienceType } from "../../models/experienceType";
import type { Haunt } from "../../models/haunt";
import type { Venue } from "../../models/park";
import { createExperienceTypeRepository } from "../../repositories/experienceTypeRepository";
import { createHauntRepository } from "../../repositories/hauntRepository";
import { createParkRepository } from "../../repositories/parkRepository";

interface RegistryData {
  isLoading: boolean;
  error: string | null;
  haunts: Haunt[];
  venues: Venue[];
  experienceTypes: ExperienceType[];
}

const INITIAL: RegistryData = {
  isLoading: true,
  error: null,
  haunts: [],
  venues: [],
  experienceTypes: [],
};

/**
 * Loads what haunts exist, where they run and what they call things — once,
 * at startup, for the whole app.
 *
 * This is the hinge the Haunt Pack system turns on. Every heading, filter
 * and label downstream reads these rows, so importing a pack adds a haunt
 * to the interface without a line of code naming it.
 */
export function HauntRegistryProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<RegistryData>(INITIAL);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = await getDatabase();
        const [haunts, venues, experienceTypes] = await Promise.all([
          createHauntRepository(db).getAll(),
          createParkRepository(db).getAll(),
          createExperienceTypeRepository(db).getAll(),
        ]);

        if (!cancelled) {
          setData({ isLoading: false, error: null, haunts, venues, experienceTypes });
        }
      } catch (error) {
        if (!cancelled) {
          setData({
            ...INITIAL,
            isLoading: false,
            error: error instanceof Error ? error.message : "Couldn't load the haunts.",
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [reloads]);

  // Importing a pack adds a haunt; the app has to see it without a restart.
  const refresh = useCallback(() => setReloads((count) => count + 1), []);

  const registry = useMemo<HauntRegistry>(
    () => ({ ...buildRegistry(data), refresh }),
    [data, refresh],
  );

  return <HauntRegistryContext.Provider value={registry}>{children}</HauntRegistryContext.Provider>;
}
