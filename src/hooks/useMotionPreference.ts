import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_MOTION_PREFERENCE,
  MOTION_PREFERENCES,
  readPreference,
  writePreference,
  type MotionPreference,
} from "../preferences/localPreferences";

export type { MotionPreference };

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function mediaQuery(): MediaQueryList | null {
  return typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_MOTION_QUERY) : null;
}

function subscribeToSystem(onChange: () => void): () => void {
  const query = mediaQuery();
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}

function readSystemPreference(): boolean {
  return mediaQuery()?.matches ?? false;
}

function readStoredPreference(): MotionPreference {
  const stored = readPreference("motion");
  return MOTION_PREFERENCES.includes(stored as MotionPreference)
    ? (stored as MotionPreference)
    : DEFAULT_MOTION_PREFERENCE;
}

export interface MotionPreferenceState {
  /** What the user chose: follow the system, always reduce, or never reduce. */
  preference: MotionPreference;
  setPreference: (preference: MotionPreference) => void;
  /** What that actually means right now. */
  isReduced: boolean;
  /** What the operating system is asking for, shown beside the "System" option. */
  systemPrefersReduced: boolean;
}

/**
 * Motion, as a three-way choice rather than a switch.
 *
 * A plain on/off toggle would have to either ignore the operating system's
 * accessibility setting or silently disagree with it; "System" keeps the OS
 * in charge by default and lets someone override it in either direction here.
 *
 * The choice is published as `data-reduce-motion` on the document element so
 * CSS decides what it means per component: `"true"` and `"false"` are the two
 * overrides, and "System" removes the attribute entirely, leaving the
 * `prefers-reduced-motion` media query in charge — which also means the right
 * thing happens before this hook has ever run.
 */
export function useMotionPreference(): MotionPreferenceState {
  const [preference, setStoredPreference] = useState<MotionPreference>(readStoredPreference);
  const systemPrefersReduced = useSyncExternalStore(
    subscribeToSystem,
    readSystemPreference,
    () => false,
  );

  const isReduced = preference === "system" ? systemPrefersReduced : preference === "reduce";

  const setPreference = useCallback((next: MotionPreference) => {
    writePreference("motion", next);
    setStoredPreference(next);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (preference === "system") {
      delete root.dataset.reduceMotion;
    } else {
      root.dataset.reduceMotion = String(preference === "reduce");
    }
  }, [preference]);

  return { preference, setPreference, isReduced, systemPrefersReduced };
}
