import { Download } from "lucide-react";
import { useState } from "react";
import { getLastArchiveUpdate, isAutoArtworkEnabled } from "../../archive/archiveUpdate";
import { getDatabase } from "../../database/client";
import { syncArtwork, useArtworkSyncStatus } from "../../media/artworkSync";
import { writePreference } from "../../preferences/localPreferences";
import { Button, Panel, Toggle } from "../ui";
import "./SettingsPanels.css";

const ARCHIVE_NAMES: Record<string, string> = {
  hhn: "Halloween Horror Nights",
  knotts: "Knott's Scary Farm",
};

/**
 * The archive that ships with the app, and its artwork.
 *
 * Each version carries the latest HHN and Knott's datasets and applies them
 * on launch; this says what the last launch applied. Artwork is then saved
 * for offline use in the background — the only time Haunt Ranker goes
 * online, and only to fetch images the archive records. It can be turned off.
 */
export function ArchiveSettings() {
  const [autoArtwork, setAutoArtwork] = useState(isAutoArtworkEnabled);
  const artwork = useArtworkSyncStatus();
  const update = getLastArchiveUpdate();

  const toggleAutoArtwork = (enabled: boolean) => {
    writePreference("autoDownloadArtwork", enabled ? "true" : "false");
    setAutoArtwork(enabled);
  };

  return (
    <Panel elevated padding="lg" className="settings-panel">
      <h2 className="settings-panel__title">Archive</h2>
      <p className="settings-panel__lead">
        Each version of Haunt Ranker brings the latest archive with it and applies it when it opens.
        Your ratings, notes and rankings are never touched, and a safety copy is saved first.
      </p>

      <p className="settings-panel__lead">
        {update === null
          ? "Checking the archive…"
          : update.error
            ? `The last update couldn't be applied: ${update.error}`
            : update.result && update.result.applied.length > 0
              ? `Updated on this launch: ${update.result.applied
                  .map((entry) => `${ARCHIVE_NAMES[entry.key] ?? entry.key} ${entry.version}`)
                  .join(", ")}. Safety copy: ${update.result.safetyBackupPath}`
              : "The archive is up to date with this version."}
      </p>

      <Toggle
        checked={autoArtwork}
        onChange={toggleAutoArtwork}
        label="Download new artwork automatically"
        description="After an update, save offline copies of any official artwork the archive records that this computer doesn't have yet. This is the only time Haunt Ranker connects to the internet."
      />

      <div className="settings-field">
        <div className="settings-field__text">
          <span className="settings-field__label">Artwork</span>
          <span className="settings-field__description">
            {artwork.state === "running"
              ? artwork.total > 0
                ? `Saving artwork: ${artwork.done} of ${artwork.total}…`
                : "Looking for new artwork…"
              : artwork.state === "done"
                ? artwork.saved + artwork.skipped === 0
                  ? "Every recorded image is saved on this computer."
                  : `Saved ${artwork.saved} new image${artwork.saved === 1 ? "" : "s"}` +
                    (artwork.skipped > 0
                      ? `; ${artwork.skipped} couldn't be saved (unavailable or too large).`
                      : ".")
                : artwork.state === "failed"
                  ? `The download stopped: ${artwork.message}`
                  : "Images are saved on this computer and shown without going online."}
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leadingIcon={<Download size={14} />}
          disabled={artwork.state === "running"}
          onClick={() => void getDatabase().then((db) => syncArtwork(db))}
        >
          Download artwork now
        </Button>
      </div>
    </Panel>
  );
}
