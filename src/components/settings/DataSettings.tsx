import { CircleAlert, CircleCheck, Download, RefreshCw, Upload } from "lucide-react";
import { BACKUP_FORMAT_VERSION } from "../../models/backup";
import { DATABASE_URL } from "../../database/client";
import { SCHEMA_VERSION } from "../../database/schemaVersion";
import { useBackup } from "../../hooks/useBackup";
import { Button, Panel } from "../ui";
import { ImportPreviewDialog } from "./ImportPreviewDialog";
import "./SettingsPanels.css";

export function DataSettings() {
  const backup = useBackup();

  return (
    <Panel elevated padding="lg" className="settings-panel">
      <h2 className="settings-panel__title">Data</h2>
      <p className="settings-panel__lead">
        A backup is a single JSON file on this machine — your ratings, notes and manual rankings,
        every archive record and every edit you&rsquo;ve made to one. There is no account and
        nothing is uploaded anywhere.
      </p>

      <div className="settings-panel__actions">
        <Button
          variant="secondary"
          leadingIcon={<Download size={16} />}
          onClick={() => void backup.exportBackup()}
          disabled={backup.isBusy}
        >
          Export Haunt Ranker
        </Button>
        <Button
          variant="secondary"
          leadingIcon={<Upload size={16} />}
          onClick={() => void backup.chooseImportFile()}
          disabled={backup.isBusy}
        >
          Import Haunt Ranker
        </Button>
      </div>

      {backup.error && (
        <p className="settings-message settings-message--error" role="alert">
          <CircleAlert size={15} aria-hidden="true" />
          {backup.error}
        </p>
      )}

      {backup.validationErrors.length > 0 && (
        <div className="settings-message settings-message--error" role="alert">
          <CircleAlert size={15} aria-hidden="true" />
          <div>
            <p className="settings-message__title">
              That file wasn&rsquo;t imported — nothing here has changed.
            </p>
            <ul className="settings-message__list">
              {backup.validationErrors.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {backup.message && !backup.importResult && (
        <p className="settings-message settings-message--ok">
          <CircleCheck size={15} aria-hidden="true" />
          <span>
            {backup.message}
            {backup.exportedPath && (
              <span className="settings-message__path">{backup.exportedPath}</span>
            )}
          </span>
        </p>
      )}

      {backup.importResult && (
        <div className="settings-message settings-message--ok" role="status">
          <CircleCheck size={15} aria-hidden="true" />
          <div>
            <p className="settings-message__title">
              Restored {backup.importResult.summary.totalRows} records from the backup.
            </p>
            <p>
              Your previous data was saved first, in case you want it back:
              <span className="settings-message__path">{backup.importResult.safetyBackupPath}</span>
            </p>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<RefreshCw size={14} />}
              onClick={() => window.location.reload()}
            >
              Reload to see it
            </Button>
          </div>
        </div>
      )}

      {!backup.isLoading && (
        <dl className="settings-stats">
          {backup.currentCounts
            .filter((entry) => entry.count > 0)
            .map((entry) => (
              <div key={entry.key} className="settings-stats__item">
                <dt>{entry.label}</dt>
                <dd>{entry.count}</dd>
              </div>
            ))}
          {backup.currentTotal === 0 && (
            <p className="settings-stats__empty">
              Nothing stored yet — an export would produce an empty backup.
            </p>
          )}
        </dl>
      )}

      <p className="settings-panel__footnote">
        Database {DATABASE_URL} · schema version {SCHEMA_VERSION}
        {backup.appliedSchemaVersion !== null && backup.appliedSchemaVersion !== SCHEMA_VERSION
          ? ` (applied: ${backup.appliedSchemaVersion})`
          : ""}{" "}
        · backup format v{BACKUP_FORMAT_VERSION}
      </p>

      <ImportPreviewDialog
        pending={backup.pendingImport}
        currentCounts={backup.currentCounts}
        isBusy={backup.isBusy}
        onConfirm={() => void backup.confirmImport()}
        onCancel={backup.cancelImport}
      />
    </Panel>
  );
}
