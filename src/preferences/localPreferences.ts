import type { BackupPreferences } from "../models/backup";

/**
 * Preferences live in localStorage rather than the database because they
 * describe *this installation* — how the app looks and behaves here — and
 * because they must be readable before a database connection exists.
 *
 * The keys are collected here, not hidden inside each hook, so the backup
 * code and the hooks can't disagree about what a preference is called.
 */
export const PREFERENCE_KEYS = {
  ambientEffects: "haunt-ranker:ambient-effects",
  motion: "haunt-ranker:motion",
  attractionViewMode: "haunt-ranker:attraction-view-mode",
  adminMode: "haunt-ranker:admin-mode",
  hauntScope: "haunt-ranker:haunt-scope",
} as const;

export type PreferenceKey = keyof typeof PREFERENCE_KEYS;

/** How much of the app's motion to allow. `system` follows the OS setting. */
export const MOTION_PREFERENCES = ["system", "reduce", "full"] as const;
export type MotionPreference = (typeof MOTION_PREFERENCES)[number];
export const DEFAULT_MOTION_PREFERENCE: MotionPreference = "system";

export const ATTRACTION_VIEW_MODES = ["card", "compact"] as const;
export type AttractionViewMode = (typeof ATTRACTION_VIEW_MODES)[number];

/** Reading can throw where site data is blocked; a missing preference is the answer. */
export function readPreference(key: PreferenceKey): string | null {
  try {
    return window.localStorage.getItem(PREFERENCE_KEYS[key]);
  } catch {
    return null;
  }
}

export function writePreference(key: PreferenceKey, value: string): void {
  try {
    window.localStorage.setItem(PREFERENCE_KEYS[key], value);
  } catch {
    // Ignore write failures — the preference falls back to its default next
    // launch, which is always the safe direction.
  }
}

/**
 * The preferences worth carrying to another machine.
 *
 * Admin Mode is deliberately not among them. It's a safety default rather
 * than a taste, and importing someone's backup should never quietly make the
 * archive editable here.
 */
export function collectTransferablePreferences(): BackupPreferences {
  const preferences: BackupPreferences = {};

  const ambient = readPreference("ambientEffects");
  if (ambient !== null) {
    preferences.ambientEffects = ambient === "true";
  }

  const motion = readPreference("motion");
  if (motion !== null) {
    preferences.motion = motion;
  }

  const viewMode = readPreference("attractionViewMode");
  if (viewMode !== null) {
    preferences.attractionViewMode = viewMode;
  }

  return preferences;
}

/** Applies restored preferences, ignoring any value this version doesn't recognise. */
export function applyTransferablePreferences(preferences: BackupPreferences): void {
  if (typeof preferences.ambientEffects === "boolean") {
    writePreference("ambientEffects", String(preferences.ambientEffects));
  }
  if (MOTION_PREFERENCES.includes(preferences.motion as MotionPreference)) {
    writePreference("motion", preferences.motion as MotionPreference);
  }
  if (ATTRACTION_VIEW_MODES.includes(preferences.attractionViewMode as AttractionViewMode)) {
    writePreference("attractionViewMode", preferences.attractionViewMode as AttractionViewMode);
  }
}
