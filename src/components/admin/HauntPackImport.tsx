import { useState } from "react";
import {
  CircleAlert,
  CircleCheck,
  FileJson,
  FolderOpen,
  PackagePlus,
  TriangleAlert,
} from "lucide-react";
import { useHauntPackImport } from "../../hooks/useHauntPackImport";
import { parseImportSummary } from "../../packs/importHauntPack";
import type { PackConflict, PackCounts, PackPreview } from "../../packs/planPackImport";
import type { PackImportRecord } from "../../packs/packState";
import { formatDisplayDate } from "../../utils/formatDate";
import { Badge, Button, Modal, Panel, Textarea } from "../ui";
// Shares the message block with Settings, which says the same things about
// a file that was refused or an import that landed.
import "../settings/SettingsPanels.css";
import "./HauntPackImport.css";

function countLine(counts: PackCounts): string {
  return `${counts.created} new · ${counts.updated} updated · ${counts.unchanged} unchanged`;
}

function CountRow({ label, counts }: { label: string; counts: PackCounts }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>{counts.created}</td>
      <td>{counts.updated}</td>
      <td>{counts.unchanged}</td>
    </tr>
  );
}

function ConflictItem({ conflict }: { conflict: PackConflict }) {
  const hasValues = conflict.current !== undefined || conflict.incoming !== undefined;

  return (
    <li className="pack-import__conflict">
      <p className="pack-import__conflict-title">
        {conflict.name}
        {conflict.field && <span className="pack-import__conflict-field">{conflict.field}</span>}
      </p>
      <p className="pack-import__conflict-detail">{conflict.detail}</p>
      {hasValues && (
        <dl className="pack-import__conflict-values">
          <div>
            <dt>Kept</dt>
            <dd>{conflict.current ?? "nothing recorded"}</dd>
          </div>
          <div>
            <dt>Not written</dt>
            <dd>{conflict.incoming ?? "nothing"}</dd>
          </div>
        </dl>
      )}
    </li>
  );
}

/** The numbers, the warnings and the conflicts, before a single row is written. */
function PackPreviewBody({ preview }: { preview: PackPreview }) {
  return (
    <div className="pack-import__preview">
      <dl className="pack-import__meta">
        <div>
          <dt>Haunt</dt>
          <dd>
            {preview.hauntName}{" "}
            {preview.isNewHaunt ? (
              <Badge variant="positive">New to this archive</Badge>
            ) : (
              <Badge>Already here</Badge>
            )}
          </dd>
        </div>
        <div>
          <dt>Pack</dt>
          <dd>
            {preview.packId} · version {preview.packVersion}
          </dd>
        </div>
        <div>
          <dt>Made</dt>
          <dd>{formatDisplayDate(preview.generatedAt) ?? "not stated"}</dd>
        </div>
      </dl>

      <table className="pack-import__table">
        <thead>
          <tr>
            <th scope="col">Records</th>
            <th scope="col">New</th>
            <th scope="col">Updated</th>
            <th scope="col">Unchanged</th>
          </tr>
        </thead>
        <tbody>
          <CountRow label="Seasons" counts={preview.seasons} />
          <CountRow label="Experiences" counts={preview.experiences} />
          <CountRow label="Venues" counts={preview.venues} />
          <CountRow label="Vocabulary" counts={preview.experienceTypes} />
          <CountRow label="Characters" counts={preview.characters} />
          <CountRow label="Sources" counts={preview.sources} />
        </tbody>
      </table>

      <p className="pack-import__note">
        {preview.mediaReferences} media {preview.mediaReferences === 1 ? "reference" : "references"}{" "}
        · {preview.citationsAdded} {preview.citationsAdded === 1 ? "citation" : "citations"} added.
        A pack carries records and links, never image files, and never anyone&rsquo;s ratings, notes
        or rankings.
      </p>

      {preview.provenance && <p className="pack-import__provenance">{preview.provenance}</p>}

      {preview.conflicts.length > 0 && (
        <section className="pack-import__flags pack-import__flags--conflict">
          <h4>
            <CircleAlert size={15} aria-hidden="true" />
            {preview.conflicts.length} {preview.conflicts.length === 1 ? "conflict" : "conflicts"}{" "}
            with edits made here
          </h4>
          <p className="pack-import__flags-lead">
            These were edited in Admin Mode after the last pack wrote them. They are left exactly as
            they are — the pack does not overwrite your corrections.
          </p>
          <ul>
            {preview.conflicts.map((conflict, index) => (
              <ConflictItem key={`${conflict.id}-${conflict.field ?? index}`} conflict={conflict} />
            ))}
          </ul>
        </section>
      )}

      {preview.warnings.length > 0 && (
        <section className="pack-import__flags pack-import__flags--warning">
          <h4>
            <TriangleAlert size={15} aria-hidden="true" />
            {preview.warnings.length} {preview.warnings.length === 1 ? "warning" : "warnings"}
          </h4>
          <p className="pack-import__flags-lead">
            Worth reading, but none of these stop the import.
          </p>
          <ul>
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function HistoryRow({ record }: { record: PackImportRecord }) {
  const summary = parseImportSummary(record.summary);
  const experiences = summary?.experiences as PackCounts | undefined;

  return (
    <li className="pack-import__history-item">
      <div className="pack-import__history-text">
        <span className="pack-import__history-title">
          {record.hauntName} · {record.packId} {record.packVersion}
        </span>
        <span className="pack-import__history-detail">
          {formatDisplayDate(record.importedAt) ?? record.importedAt}
          {experiences && ` · experiences: ${countLine(experiences)}`}
        </span>
        {record.provenanceNotes && (
          <span className="pack-import__history-notes">{record.provenanceNotes}</span>
        )}
      </div>
      <Badge>{record.schemaId}</Badge>
    </li>
  );
}

export interface HauntPackImportProps {
  /** Called once an import lands, so the interface can pick up what is new. */
  onImported?: () => void | Promise<void>;
}

/**
 * Importing a Haunt Pack, and the record of every pack imported before.
 *
 * Nothing here is specific to a haunt this app has heard of. A pack that
 * validates brings its own event, its own venues and its own words for
 * things, and this panel is where a person sees exactly what that would do
 * before agreeing to it.
 */
export function HauntPackImport({ onImported }: HauntPackImportProps) {
  const importer = useHauntPackImport(onImported);
  const [showHistory, setShowHistory] = useState(false);

  return (
    <Panel elevated padding="lg" className="admin__section pack-import">
      <h2 className="admin__section-title">Haunt Packs</h2>
      <p className="pack-import__lead">
        A Haunt Pack is a single JSON file describing an event, its seasons and everything in them.
        Open one or paste it below — it is checked completely before anything is written, and you
        see what it would change before it changes it.
      </p>

      <div className="pack-import__actions">
        <Button
          variant="secondary"
          leadingIcon={<FolderOpen size={16} />}
          onClick={() => void importer.chooseFile()}
          disabled={importer.isBusy}
        >
          Open .json
        </Button>
        <Button
          variant="primary"
          leadingIcon={<PackagePlus size={16} />}
          onClick={() => void importer.check()}
          disabled={importer.isBusy || importer.text.trim() === ""}
        >
          {importer.isBusy ? "Checking…" : "Check this pack"}
        </Button>
        {importer.text !== "" && (
          <Button variant="ghost" onClick={importer.reset} disabled={importer.isBusy}>
            Clear
          </Button>
        )}
      </div>

      <Textarea
        label="Haunt Pack JSON"
        hint={
          importer.sourcePath
            ? `Loaded from ${importer.sourcePath}`
            : "Paste the whole file. Nothing is written until you say so."
        }
        rows={12}
        spellCheck={false}
        className="pack-import__textarea"
        value={importer.text}
        onChange={(event) => importer.setText(event.target.value)}
      />

      {importer.refusal && (
        <div className="settings-message settings-message--error" role="alert">
          <CircleAlert size={15} aria-hidden="true" />
          <div>
            <p className="settings-message__title">
              {importer.refusal.message} Nothing in the archive has changed.
            </p>
            <ul className="settings-message__list">
              {importer.refusal.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {importer.result && (
        <div className="settings-message settings-message--ok" role="status">
          <CircleCheck size={15} aria-hidden="true" />
          <div>
            <p className="settings-message__title">
              Imported {importer.result.hauntName} from {importer.result.packId}{" "}
              {importer.result.packVersion}.
            </p>
            <p>
              Seasons: {countLine(importer.result.seasons)}. Experiences:{" "}
              {countLine(importer.result.experiences)}.
            </p>
          </div>
        </div>
      )}

      <div className="pack-import__history">
        <button
          type="button"
          className="pack-import__history-toggle"
          onClick={() => setShowHistory((open) => !open)}
          aria-expanded={showHistory}
        >
          <FileJson size={14} aria-hidden="true" />
          {importer.history.length === 0
            ? "No packs imported yet"
            : `${importer.history.length} pack ${
                importer.history.length === 1 ? "import" : "imports"
              } on this machine`}
        </button>
        {showHistory && importer.history.length > 0 && (
          <ul className="pack-import__history-list">
            {importer.history.map((record) => (
              <HistoryRow key={record.id} record={record} />
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={importer.pending !== null}
        onClose={importer.cancel}
        title="Import this Haunt Pack?"
        description="Archive records only. Your ratings, notes and manual rankings are never touched by a pack."
        footer={
          <>
            <Button variant="ghost" onClick={importer.cancel} disabled={importer.isBusy}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => void importer.confirm()}
              disabled={importer.isBusy}
            >
              {importer.isBusy ? "Importing…" : "Import"}
            </Button>
          </>
        }
      >
        {importer.pending && <PackPreviewBody preview={importer.pending.preview} />}
      </Modal>
    </Panel>
  );
}
