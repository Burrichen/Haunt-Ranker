import { useState } from "react";
import { CircleAlert, ShieldOff, Trash2 } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  AttractionForm,
  CharacterEditor,
  ConfirmDialog,
  MediaManager,
  RelationEditor,
  SourceManager,
} from "../components/admin";
import { Button, EmptyState, LoadingState, PageHeader, Panel } from "../components/ui";
import { useAdminMode } from "../hooks/useAdminMode";
import { useAttractionEditor } from "../hooks/useAttractionEditor";
import type { AttractionType } from "../models/attraction";
import "./AttractionEditor.css";

export function AttractionEditor() {
  const { attractionId } = useParams<{ attractionId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [adminMode] = useAdminMode();
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const editor = useAttractionEditor(attractionId);
  const {
    isLoading,
    error,
    notFound,
    attraction,
    years,
    otherAttractions,
    characters,
    relations,
    sources,
    media,
    save,
    deleteAttraction,
  } = editor;

  if (!adminMode) {
    return (
      <>
        <PageHeader title="Edit attraction" backTo="/" />
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

  if (error || notFound) {
    return (
      <>
        <PageHeader title="Edit attraction" backTo="/admin" />
        <EmptyState
          icon={<CircleAlert size={24} />}
          title={notFound ? "Attraction not found" : "Couldn't load this attraction"}
          description={error ?? "It may have been deleted."}
        />
      </>
    );
  }

  const requestedType = searchParams.get("type");
  const initialType: AttractionType = requestedType === "scare_zone" ? "scare_zone" : "house";
  const isNew = !attractionId;

  if (years.length === 0) {
    return (
      <>
        <PageHeader title="Add attraction" backTo="/admin" />
        <EmptyState
          icon={<CircleAlert size={24} />}
          title="Add an event year first"
          description="Every attraction belongs to an event year, so there needs to be one to put it in."
          action={
            <Button variant="secondary" onClick={() => navigate("/admin")}>
              Back to Admin Mode
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div className="attraction-editor">
      <PageHeader
        title={
          isNew ? `Add ${initialType === "house" ? "house" : "scare zone"}` : "Edit attraction"
        }
        subtitle={attraction?.name}
        backTo="/admin"
        actions={
          attraction ? (
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Trash2 size={14} />}
              onClick={() => setIsConfirmingDelete(true)}
            >
              Delete
            </Button>
          ) : undefined
        }
      />

      <AttractionForm
        attraction={attraction}
        attractionType={initialType}
        years={years}
        onCancel={() => navigate("/admin")}
        onSave={async (input) => {
          const savedId = await save(input);
          if (isNew) {
            // Sub-records need a record to hang off, so a new attraction
            // lands on its own editor rather than staging them in memory.
            navigate(`/admin/attractions/${savedId}`, { replace: true });
          }
        }}
      />

      {isNew ? (
        <Panel padding="lg" className="attraction-editor__note">
          <p>
            Characters, related attractions, sources and media can be added once this attraction is
            saved.
          </p>
        </Panel>
      ) : (
        <>
          <CharacterEditor
            characters={characters}
            onAdd={editor.addCharacter}
            onRemove={editor.removeCharacter}
          />
          <RelationEditor
            relations={relations}
            otherAttractions={otherAttractions}
            onAdd={editor.addRelation}
            onRemove={editor.removeRelation}
          />
          <SourceManager
            sources={sources}
            allSources={editor.allSources}
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
        </>
      )}

      <ConfirmDialog
        isOpen={isConfirmingDelete}
        title="Delete this attraction?"
        description={
          attraction
            ? `"${attraction.name}" and everything recorded about it — characters, sources, media and links — will be removed.`
            : undefined
        }
        confirmLabel="Delete attraction"
        onConfirm={async () => {
          await deleteAttraction();
          navigate("/admin", { replace: true });
        }}
        onCancel={() => setIsConfirmingDelete(false)}
      >
        <p className="admin__danger">
          If you&rsquo;ve rated or written a note about this attraction, that goes too. Deleting
          archive facts can&rsquo;t be undone.
        </p>
      </ConfirmDialog>
    </div>
  );
}
