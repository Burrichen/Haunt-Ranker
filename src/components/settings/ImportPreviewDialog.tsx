import { Button, Modal } from "../ui";
import type { BackupTableCount } from "../../backup/backupFormat";
import type { PendingImport } from "../../hooks/useBackup";
import { formatDisplayDate } from "../../utils/formatDate";
import "./SettingsPanels.css";

export interface ImportPreviewDialogProps {
  pending: PendingImport | null;
  currentCounts: BackupTableCount[];
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The last thing between a backup file and the user's data.
 *
 * It shows what is in the file *beside* what is already here, per table,
 * because "1,204 rows" is not something anyone can consent to — "Ratings:
 * 96 now, 96 in the backup" is.
 */
export function ImportPreviewDialog({
  pending,
  currentCounts,
  isBusy,
  onConfirm,
  onCancel,
}: ImportPreviewDialogProps) {
  const currentByKey = new Map(currentCounts.map((entry) => [entry.key, entry.count]));
  const rows = (pending?.summary.counts ?? []).filter(
    (entry) => entry.count > 0 || (currentByKey.get(entry.key) ?? 0) > 0,
  );
  const currentTotal = currentCounts.reduce((total, entry) => total + entry.count, 0);

  return (
    <Modal
      isOpen={pending !== null}
      onClose={onCancel}
      title="Replace everything with this backup?"
      description="Importing replaces all archive records, ratings, notes and rankings currently in Haunt Ranker. A copy of what's here now is saved first."
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={isBusy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm} disabled={isBusy}>
            {isBusy ? "Importing…" : "Replace my data"}
          </Button>
        </>
      }
    >
      {pending && (
        <div className="import-preview">
          <dl className="import-preview__meta">
            <div>
              <dt>File</dt>
              <dd>{pending.path}</dd>
            </div>
            <div>
              <dt>Exported</dt>
              <dd>{formatDisplayDate(pending.summary.exportedAt) ?? "unknown"}</dd>
            </div>
            <div>
              <dt>Made by</dt>
              <dd>
                Haunt Ranker {pending.summary.appVersion} · format v{pending.summary.formatVersion}
              </dd>
            </div>
          </dl>

          <table className="import-preview__table">
            <thead>
              <tr>
                <th scope="col">Records</th>
                <th scope="col">Here now</th>
                <th scope="col">In the backup</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.key}>
                  <th scope="row">{entry.label}</th>
                  <td>{currentByKey.get(entry.key) ?? 0}</td>
                  <td>{entry.count}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row">Total</th>
                <td>{currentTotal}</td>
                <td>{pending.summary.totalRows}</td>
              </tr>
            </tfoot>
          </table>

          <p className="import-preview__note">
            Imported media keeps its links and its licence notes. Image files you chose yourself
            stay where they are on this machine — a backup carries the records, not the pictures.
          </p>
        </div>
      )}
    </Modal>
  );
}
