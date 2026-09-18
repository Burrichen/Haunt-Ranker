import { useState } from "react";
import { CircleAlert, ShieldOff } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { MediaManager, SourceManager } from "../components/admin";
import {
  Button,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  Panel,
  Textarea,
} from "../components/ui";
import { useAdminMode } from "../hooks/useAdminMode";
import { useYearEditor } from "../hooks/useYearEditor";
import type { EventYear, EventYearInput } from "../models/eventYear";
import "./AttractionEditor.css";

/**
 * Mounted only once the record has loaded, so its fields start from the
 * record directly rather than being synced into state by an effect.
 */
function YearDetailsForm({
  eventYear,
  onSave,
  onBack,
}: {
  eventYear: EventYear;
  onSave: (input: Partial<EventYearInput>) => Promise<void>;
  onBack: () => void;
}) {
  const [name, setName] = useState(eventYear.name);
  const [calendarYear, setCalendarYear] = useState(String(eventYear.calendarYear));
  const [description, setDescription] = useState(eventYear.description ?? "");
  const [sourceNotes, setSourceNotes] = useState(eventYear.sourceNotes ?? "");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        name: name.trim(),
        calendarYear: Number(calendarYear),
        description: description.trim() || null,
        sourceNotes: sourceNotes.trim() || null,
      });
    } catch (caught) {
      setSaveError(caught instanceof Error ? caught.message : "Couldn't save this event year.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Panel elevated padding="lg" className="attraction-form__section">
      <h2 className="attraction-form__section-title">The event</h2>

      <div className="attraction-form__row">
        <Input
          label="Year"
          type="number"
          value={calendarYear}
          onChange={(event) => setCalendarYear(event.target.value)}
        />
        <Input
          label="Event name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="attraction-form__grow"
        />
      </div>

      <Textarea
        label="Description"
        rows={3}
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <Textarea
        label="Source notes"
        rows={2}
        placeholder="How well documented this event is, and anything still unverified."
        value={sourceNotes}
        onChange={(event) => setSourceNotes(event.target.value)}
      />

      {saveError && (
        <p className="attraction-form__error" role="alert">
          {saveError}
        </p>
      )}

      <div className="attraction-form__actions">
        <Button variant="secondary" onClick={onBack} disabled={isSaving}>
          Back
        </Button>
        <Button variant="primary" isLoading={isSaving} onClick={() => void handleSave()}>
          Save event year
        </Button>
      </div>
    </Panel>
  );
}

export function YearEditor() {
  const { eventYearId } = useParams<{ eventYearId: string }>();
  const navigate = useNavigate();
  const [adminMode] = useAdminMode();
  const editor = useYearEditor(eventYearId);
  const { isLoading, error, notFound, eventYear, sources, allSources, media } = editor;

  if (!adminMode) {
    return (
      <>
        <PageHeader title="Edit event year" backTo="/" />
        <EmptyState
          icon={<ShieldOff size={24} />}
          title="Admin Mode is off"
          description="Archive records are read-only. Turn Admin Mode on in Settings to edit them."
          action={
            <Button variant="secondary" onClick={() => navigate("/settings")}>
              Open Settings
            </Button>
          }
        />
      </>
    );
  }

  if (isLoading) {
    return <LoadingState label="Loading…" />;
  }

  if (error || notFound || !eventYear) {
    return (
      <>
        <PageHeader title="Edit event year" backTo="/admin" />
        <EmptyState
          icon={<CircleAlert size={24} />}
          title={notFound ? "Event year not found" : "Couldn't load this event year"}
          description={error ?? "It may have been deleted."}
        />
      </>
    );
  }

  return (
    <div className="attraction-editor">
      <PageHeader title="Edit event year" subtitle={eventYear.name} backTo="/admin" />

      <YearDetailsForm
        eventYear={eventYear}
        onSave={editor.save}
        onBack={() => navigate("/admin")}
      />

      <SourceManager
        sources={sources}
        allSources={allSources}
        onCreate={editor.addSource}
        onUpdate={editor.updateSource}
        onAttach={editor.attachSource}
        onDetach={editor.removeSource}
        onDelete={editor.deleteSource}
      />

      <MediaManager
        media={media}
        sources={sources}
        onAdd={editor.addMedia}
        onRemove={editor.removeMedia}
      />
    </div>
  );
}
