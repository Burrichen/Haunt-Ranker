import { useEffect, useState } from "react";
import { readPreference, writePreference } from "../preferences/localPreferences";

function readStoredPreference(): boolean {
  const stored = readPreference("ambientEffects");
  return stored === null ? true : stored === "true";
}

/**
 * Whether atmospheric background decoration (fog, glow, stars, ...) should
 * render. Defaults to on, persists to localStorage, and is exposed in
 * Settings → Appearance. `Atmosphere` reads it.
 */
export function useAmbientEffectsPreference(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(readStoredPreference);

  useEffect(() => {
    writePreference("ambientEffects", String(enabled));
  }, [enabled]);

  return [enabled, setEnabled];
}
