import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, Link2, Pencil, Plus, Unlink } from "lucide-react";
import type { EntityId } from "../../models/common";
import type { Source, SourceInput, SourceType } from "../../models/source";
import { Badge, Button, IconButton, Input, Modal, Panel, Textarea } from "../ui";
import { ConfirmDialog } from "./ConfirmDialog";
import { SOURCE_TYPES, SOURCE_TYPE_LABELS } from "./provenanceConstants";
import "./SubRecordEditors.css";

const EMPTY_DRAFT: SourceInput = {
  sourceType: "article",
  title: "",
  url: null,
  publisher: null,
  publishedAt: null,
  notes: null,
};

function toDraft(source: Source): SourceInput {
  return {
    sourceType: source.sourceType,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    publishedAt: source.publishedAt,
    notes: source.notes,
  };
}

function optional(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

/** Hands a URL to the system browser — the app never navigates itself to an external site. */
async function openExternally(url: string) {
  try {
    await openUrl(url);
  } catch {
    // Opener unavailable (e.g. outside a Tauri window); better to do nothing
    // than to navigate this window away.
  }
}

function SourceFields({
  draft,
  onChange,
}: {
  draft: SourceInput;
  onChange: (draft: SourceInput) => void;
}) {
  return (
    <div className="source-fields">
      <Input
        label="Title"
        value={draft.title}
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
      />

      <div className="sub-editor__field">
        <label htmlFor="source-type-field" className="sub-editor__label">
          Type
        </label>
        <select
          id="source-type-field"
          className="sub-editor__select"
          value={draft.sourceType}
          onChange={(event) => onChange({ ...draft, sourceType: event.target.value as SourceType })}
        >
          {SOURCE_TYPES.map((value) => (
            <option key={value} value={value}>
              {SOURCE_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>

      <Input
        label="URL"
        hint="Opened in your browser, never inside the app."
        value={draft.url ?? ""}
        onChange={(event) => onChange({ ...draft, url: optional(event.target.value) })}
      />
      <Input
        label="Publisher / channel"
        value={draft.publisher ?? ""}
        onChange={(event) => onChange({ ...draft, publisher: optional(event.target.value) })}
      />
      <Input
        label="Date"
        hint="However precisely it's known — a full date, or just a year."
        value={draft.publishedAt ?? ""}
        onChange={(event) => onChange({ ...draft, publishedAt: optional(event.target.value) })}
      />
      <Textarea
        label="Notes"
        rows={3}
        value={draft.notes ?? ""}
        onChange={(event) => onChange({ ...draft, notes: optional(event.target.value) })}
      />
    </div>
  );
}

export interface SourceManagerProps {
  /** Sources cited by this record. */
  sources: Source[];
  /** Every source in the archive, for citing one that already exists. */
  allSources: Source[];
  onCreate: (input: SourceInput) => Promise<void>;
  onUpdate: (id: EntityId, input: SourceInput) => Promise<void>;
  onAttach: (id: EntityId) => Promise<void>;
  onDetach: (id: EntityId) => Promise<void>;
  /** Deletes the source everywhere, not just here. */
  onDelete: (id: EntityId) => Promise<void>;
}

/**
 * Provenance for one record.
 *
 * A source is a shared archive object, so this distinguishes three actions
 * that are easy to conflate: **detach** (stop citing it here), **delete**
 * (remove it from the archive entirely), and **cite an existing one**
 * (because a single recap article can cover a whole event).
 */
export function SourceManager({
  sources,
  allSources,
  onCreate,
  onUpdate,
  onAttach,
  onDetach,
  onDelete,
}: SourceManagerProps) {
  const [draft, setDraft] = useState<SourceInput>(EMPTY_DRAFT);
  const [editing, setEditing] = useState<Source | null>(null);
  const [editDraft, setEditDraft] = useState<SourceInput>(EMPTY_DRAFT);
  const [deleting, setDeleting] = useState<Source | null>(null);
  const [attachId, setAttachId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const cited = new Set(sources.map((source) => source.id));
  const attachable = allSources.filter((source) => !cited.has(source.id));

  const run = async (action: () => Promise<void>) => {
    setError(null);
    try {
      await action();
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work.");
      return false;
    }
  };

  return (
    <section aria-label="Sources">
      <Panel elevated padding="lg" className="sub-editor">
        <div className="sub-editor__header">
          <h2 className="sub-editor__title">Sources</h2>
          <p className="sub-editor__hint">
            Where this record&rsquo;s claims come from. Detaching stops this record citing a source;
            deleting removes it from the archive for everything that cites it.
          </p>
        </div>

        {sources.length > 0 && (
          <ul className="sub-editor__list">
            {sources.map((source) => (
              <li key={source.id} className="sub-editor__item">
                <div className="sub-editor__item-text">
                  <span className="sub-editor__item-title">{source.title}</span>
                  <span className="sub-editor__item-detail">
                    <Badge variant="neutral">{SOURCE_TYPE_LABELS[source.sourceType]}</Badge>
                    {source.publisher && ` ${source.publisher}`}
                    {source.publishedAt && ` · ${source.publishedAt}`}
                  </span>
                  {source.notes && <span className="sub-editor__item-detail">{source.notes}</span>}
                </div>
                <div className="sub-editor__item-actions">
                  {source.url && (
                    <IconButton
                      icon={<ExternalLink size={14} />}
                      label={`Open ${source.title}`}
                      size="sm"
                      onClick={() => void openExternally(source.url as string)}
                    />
                  )}
                  <IconButton
                    icon={<Pencil size={14} />}
                    label={`Edit ${source.title}`}
                    size="sm"
                    onClick={() => {
                      setEditing(source);
                      setEditDraft(toDraft(source));
                    }}
                  />
                  <IconButton
                    icon={<Unlink size={14} />}
                    label={`Detach ${source.title}`}
                    size="sm"
                    onClick={() => void run(() => onDetach(source.id))}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {attachable.length > 0 && (
          <div className="sub-editor__form">
            <div className="sub-editor__field sub-editor__grow">
              <label htmlFor="attach-source" className="sub-editor__label">
                Cite an existing source
              </label>
              <select
                id="attach-source"
                className="sub-editor__select"
                value={attachId}
                onChange={(event) => setAttachId(event.target.value)}
              >
                <option value="">Select a source…</option>
                {attachable.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="secondary"
              leadingIcon={<Link2 size={14} />}
              disabled={attachId === ""}
              onClick={() =>
                void run(async () => {
                  await onAttach(attachId);
                  setAttachId("");
                })
              }
            >
              Cite source
            </Button>
          </div>
        )}

        <div className="sub-editor__form sub-editor__form--stacked">
          <h3 className="sub-editor__subtitle">Add a new source</h3>
          <SourceFields draft={draft} onChange={setDraft} />
          <Button
            variant="secondary"
            leadingIcon={<Plus size={14} />}
            disabled={draft.title.trim() === ""}
            onClick={() =>
              void run(async () => {
                await onCreate({ ...draft, title: draft.title.trim() });
                setDraft(EMPTY_DRAFT);
              })
            }
          >
            Add source
          </Button>
        </div>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
      </Panel>

      <Modal
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit source"
        description="Changes apply everywhere this source is cited."
        footer={
          <>
            <Button
              variant="danger"
              onClick={() => {
                setDeleting(editing);
                setEditing(null);
              }}
            >
              Delete everywhere
            </Button>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                void run(async () => {
                  if (editing) {
                    await onUpdate(editing.id, { ...editDraft, title: editDraft.title.trim() });
                    setEditing(null);
                  }
                })
              }
            >
              Save source
            </Button>
          </>
        }
      >
        <SourceFields draft={editDraft} onChange={setEditDraft} />
      </Modal>

      <ConfirmDialog
        isOpen={deleting !== null}
        title="Delete this source?"
        description={
          deleting
            ? `"${deleting.title}" is removed from the archive, and every record citing it stops citing it.`
            : undefined
        }
        confirmLabel="Delete source"
        onConfirm={async () => {
          if (deleting) {
            await onDelete(deleting.id);
            setDeleting(null);
          }
        }}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}
