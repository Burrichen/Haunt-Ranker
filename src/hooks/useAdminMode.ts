import { useEffect, useState } from "react";
import { readPreference, writePreference } from "../preferences/localPreferences";

function readStoredPreference(): boolean {
  // Anything other than an explicit "true" means off, so a corrupted or
  // missing value can never leave editing switched on.
  return readPreference("adminMode") === "true";
}

/**
 * Whether the archive is editable.
 *
 * Off by default and off on any read failure: the app is a reading tool
 * first, and archive facts stay read-only until someone deliberately turns
 * this on in Settings. It gates which controls render — it is not a security
 * boundary, and it isn't what stops invalid writes; the repositories do that.
 * It is also deliberately left out of backups, so restoring data on another
 * machine never switches editing on there.
 */
export function useAdminMode(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(readStoredPreference);

  useEffect(() => {
    writePreference("adminMode", String(enabled));
  }, [enabled]);

  return [enabled, setEnabled];
}
