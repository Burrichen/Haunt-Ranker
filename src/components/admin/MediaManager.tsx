import { useState } from "react";
import { FolderOpen, Plus, Trash2 } from "lucide-react";
import type { Media, MediaDistribution, MediaInput, MediaType } from "../../models/media";
import type { Source } from "../../models/source";
import { importLocalMediaFile } from "../../media/mediaFiles";
import { Badge, Button, IconButton, Input, Panel, SegmentedControl, Textarea } from "../ui";
import {
  DISTRIBUTION_HELP,
  DISTRIBUTION_LABELS,
  DISTRIBUTION_OPTIONS,
  MEDIA_TYPES,
  MEDIA_TYPE_LABELS,
} from "./provenanceConstants";
import "./SubRecordEditors.css";

export interface MediaManagerProps {
  media: Media[];
  /** Sources this record cites, so a piece of artwork can name where it came from. */
  sources: Source[];
  onAdd: (input: Omit<MediaInput, "owner">) => Promise<void>;
  onRemove: (media: Media) => Promise<void>;
}

/**
 * Artwork references and their provenance.
 *
 * Two things are recorded separately on purpose: where the image currently
 * is (a remote URL, or a file copied into the app's own directory) and what
 * we may do with it. Nothing is ever assumed distributable, and no artwork
 * is ever generated to paper over a gap — a missing image is a normal state
 * that the fallback card already handles.
 */
export function MediaManager({ media, sources, onAdd, onRemove }: MediaManagerProps) {
  const [mediaType, setMediaType] = useState<MediaType>("poster");
  const [distribution, setDistribution] = useState<MediaDistribution>("reference");
  const [url, setUrl] = useState("");
  const [localFile, setLocalFile] = useState<{
    storedPath: string;
    originalFileName: string;
  } | null>(null);
  const [attribution, setAttribution] = useState("");
  const [licenseNotes, setLicenseNotes] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const hasFile = localFile !== null || url.trim() !== "";

  const reset = () => {
    setUrl("");
    setLocalFile(null);
    setAttribution("");
    setLicenseNotes("");
    setSourceId("");
  };

  const chooseFile = async () => {
    setIsPicking(true);
    setError(null);
    try {
      const imported = await importLocalMediaFile();
      if (imported) {
        setLocalFile(imported);
        setUrl("");
        // A file the user chose is theirs and stays here; say so rather than
        // leaving it on the reference default.
        setDistribution("local");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't import that file.");
    } finally {
      setIsPicking(false);
    }
  };

  const add = async () => {
    if (!hasFile) {
      return;
    }
    setError(null);
    try {
      await onAdd({
        mediaType,
        url: localFile ? null : url.trim(),
        localPath: localFile?.storedPath ?? null,
        attribution: attribution.trim() || localFile?.originalFileName || null,
        licenseNotes: licenseNotes.trim() || null,
        sourceId: sourceId || null,
        distribution,
      });
      reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't add that media.");
    }
  };

  return (
    <section aria-label="Media">
      <Panel elevated padding="lg" className="sub-editor">
        <div className="sub-editor__header">
          <h2 className="sub-editor__title">Media</h2>
          <p className="sub-editor__hint">
            Artwork references and where they came from. The app stores metadata and, for your own
            files, a managed copy — never anything generated to fill a gap. An attraction with no
            artwork is normal and shows the fallback card.
          </p>
        </div>

        {media.length > 0 && (
          <ul className="sub-editor__list">
            {media.map((item) => (
              <li key={item.id} className="sub-editor__item">
                <div className="sub-editor__item-text">
                  <span className="sub-editor__item-title">
                    {MEDIA_TYPE_LABELS[item.mediaType]}
                  </span>
                  <span className="sub-editor__item-detail">
                    <Badge variant={item.distribution === "bundled" ? "orange" : "neutral"}>
                      {DISTRIBUTION_LABELS[item.distribution]}
                    </Badge>
                    {item.localPath ? ` ${item.localPath}` : ` ${item.url}`}
                  </span>
                  {item.attribution && (
                    <span className="sub-editor__item-detail">{item.attribution}</span>
                  )}
                  {item.licenseNotes && (
                    <span className="sub-editor__item-detail">{item.licenseNotes}</span>
                  )}
                </div>
                <IconButton
                  icon={<Trash2 size={14} />}
                  label={`Remove ${MEDIA_TYPE_LABELS[item.mediaType]}`}
                  size="sm"
                  onClick={() => void onRemove(item)}
                />
              </li>
            ))}
          </ul>
        )}

        <div className="sub-editor__form sub-editor__form--stacked">
          <h3 className="sub-editor__subtitle">Add artwork</h3>

          <div className="sub-editor__field">
            <label htmlFor="media-kind" className="sub-editor__label">
              Kind
            </label>
            <select
              id="media-kind"
              className="sub-editor__select"
              value={mediaType}
              onChange={(event) => setMediaType(event.target.value as MediaType)}
            >
              {MEDIA_TYPES.map((value) => (
                <option key={value} value={value}>
                  {MEDIA_TYPE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="media-source-row">
            <Input
              label="Remote URL"
              hint="The original, referenced where it lives."
              value={url}
              disabled={localFile !== null}
              onChange={(event) => setUrl(event.target.value)}
              className="sub-editor__grow"
            />
            <div className="sub-editor__field">
              <span className="sub-editor__label">Or a file of your own</span>
              <Button
                variant="secondary"
                leadingIcon={<FolderOpen size={14} />}
                isLoading={isPicking}
                onClick={() => void chooseFile()}
              >
                Choose image…
              </Button>
            </div>
          </div>

          {localFile && (
            <p className="media-file-note">
              Copied <strong>{localFile.originalFileName}</strong> into the app&rsquo;s media folder
              as <code>{localFile.storedPath}</code>. The archive no longer depends on where the
              original lives.
            </p>
          )}

          <div className="sub-editor__field">
            <span className="sub-editor__label">What may we do with it?</span>
            <SegmentedControl
              options={DISTRIBUTION_OPTIONS}
              value={distribution}
              onChange={(value) => setDistribution(value as MediaDistribution)}
              aria-label="Distribution policy"
            />
            <p className="sub-editor__hint">{DISTRIBUTION_HELP[distribution]}</p>
          </div>

          <Input
            label="Attribution"
            value={attribution}
            onChange={(event) => setAttribution(event.target.value)}
          />
          <Textarea
            label="License notes"
            rows={2}
            placeholder="What's actually known about reuse — not an assumption."
            value={licenseNotes}
            onChange={(event) => setLicenseNotes(event.target.value)}
          />

          {sources.length > 0 && (
            <div className="sub-editor__field">
              <label htmlFor="media-source" className="sub-editor__label">
                Came from which source?
              </label>
              <select
                id="media-source"
                className="sub-editor__select"
                value={sourceId}
                onChange={(event) => setSourceId(event.target.value)}
              >
                <option value="">Not recorded</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="secondary"
            leadingIcon={<Plus size={14} />}
            disabled={!hasFile}
            onClick={() => void add()}
          >
            Add media
          </Button>
        </div>

        {error && (
          <p className="admin-error" role="alert">
            {error}
          </p>
        )}
      </Panel>
    </section>
  );
}
