import { useEffect, useState } from "react";
import {
  ATTRACTION_VIEW_MODES,
  readPreference,
  writePreference,
  type AttractionViewMode,
} from "../preferences/localPreferences";

export type { AttractionViewMode };

const DEFAULT_VIEW_MODE: AttractionViewMode = "card";

function readStoredViewMode(): AttractionViewMode {
  const stored = readPreference("attractionViewMode");
  return ATTRACTION_VIEW_MODES.includes(stored as AttractionViewMode)
    ? (stored as AttractionViewMode)
    : DEFAULT_VIEW_MODE;
}

/**
 * The user's preferred way to browse attraction lists — shared by Houses
 * and Scare Zones (and any future attraction listing) so choosing a view
 * once applies everywhere, and persists across app restarts.
 */
export function useAttractionViewMode(): [AttractionViewMode, (mode: AttractionViewMode) => void] {
  const [viewMode, setViewMode] = useState<AttractionViewMode>(readStoredViewMode);

  useEffect(() => {
    writePreference("attractionViewMode", viewMode);
  }, [viewMode]);

  return [viewMode, setViewMode];
}
