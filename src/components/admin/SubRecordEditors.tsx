import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Attraction } from "../../models/attraction";
import type { RelationType } from "../../models/attractionRelation";
import type { Character } from "../../models/character";
import type { EntityId } from "../../models/common";
import type { EditorRelation } from "../../hooks/useAttractionEditor";
import { Button, IconButton, Input, Panel } from "../ui";
import "./SubRecordEditors.css";

/**
 * The four sets of records that hang off an attraction. Each is add-and-remove
 * rather than in-place editing: they're small enough that correcting one by
 * replacing it is no worse than editing it, and it keeps every write a single
 * repository call with nothing staged.
 */

interface SectionProps {
  title: string;
  hint: string;
  children: React.ReactNode;
}

function Section({ title, hint, children }: SectionProps) {
  return (
    // Labelled so each editor is its own landmark — several of these sit on
    // the page at once and they repeat field names like "Name".
    <section aria-label={title}>
      <Panel elevated padding="lg" className="sub-editor">
        <div className="sub-editor__header">
          <h2 className="sub-editor__title">{title}</h2>
          <p className="sub-editor__hint">{hint}</p>
        </div>
        {children}
      </Panel>
    </section>
  );
}

function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return <IconButton icon={<Trash2 size={14} />} label={label} size="sm" onClick={onRemove} />;
}

export interface CharacterEditorProps {
  characters: Character[];
  onAdd: (input: { name: string; description?: string | null }) => Promise<void>;
  onRemove: (id: EntityId) => Promise<void>;
}

export function CharacterEditor({ characters, onAdd, onRemove }: CharacterEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const add = async () => {
    if (name.trim() === "") {
      return;
    }
    await onAdd({ name: name.trim(), description: description.trim() || null });
    setName("");
    setDescription("");
  };

  return (
    <Section title="Characters / creatures" hint="Who or what guests meet inside.">
      {characters.length > 0 && (
        <ul className="sub-editor__list">
          {characters.map((character) => (
            <li key={character.id} className="sub-editor__item">
              <div className="sub-editor__item-text">
                <span className="sub-editor__item-title">{character.name}</span>
                {character.description && (
                  <span className="sub-editor__item-detail">{character.description}</span>
                )}
              </div>
              <RemoveButton
                label={`Remove ${character.name}`}
                onRemove={() => void onRemove(character.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="sub-editor__form">
        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="sub-editor__grow"
        />
        <Input
          label="Description (optional)"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="sub-editor__grow"
        />
        <Button
          variant="secondary"
          leadingIcon={<Plus size={14} />}
          onClick={() => void add()}
          disabled={name.trim() === ""}
        >
          Add character
        </Button>
      </div>
    </Section>
  );
}

const RELATION_LABELS: Record<RelationType, string> = {
  sequel: "Sequel",
  previous_version: "Previous Version",
  same_franchise: "Same Franchise",
  related_concept: "Related Concept",
};

export interface RelationEditorProps {
  relations: EditorRelation[];
  otherAttractions: Attraction[];
  onAdd: (input: { relatedAttractionId: EntityId; relationType: RelationType }) => Promise<void>;
  onRemove: (id: EntityId) => Promise<void>;
}

export function RelationEditor({
  relations,
  otherAttractions,
  onAdd,
  onRemove,
}: RelationEditorProps) {
  const [relatedAttractionId, setRelatedAttractionId] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("same_franchise");

  const add = async () => {
    if (relatedAttractionId === "") {
      return;
    }
    await onAdd({ relatedAttractionId, relationType });
    setRelatedAttractionId("");
  };

  return (
    <Section
      title="Related attractions"
      hint="Sequels, earlier versions, and anything sharing a franchise or concept."
    >
      {relations.length > 0 && (
        <ul className="sub-editor__list">
          {relations.map(({ relation, other }) => (
            <li key={relation.id} className="sub-editor__item">
              <div className="sub-editor__item-text">
                <span className="sub-editor__item-title">
                  {other?.name ?? "Unknown attraction"}
                </span>
                <span className="sub-editor__item-detail">
                  {RELATION_LABELS[relation.relationType]}
                </span>
              </div>
              <RemoveButton
                label={`Remove link to ${other?.name ?? "unknown attraction"}`}
                onRemove={() => void onRemove(relation.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="sub-editor__form">
        <div className="sub-editor__field">
          <label htmlFor="relation-attraction" className="sub-editor__label">
            Attraction
          </label>
          <select
            id="relation-attraction"
            className="sub-editor__select"
            value={relatedAttractionId}
            onChange={(event) => setRelatedAttractionId(event.target.value)}
          >
            <option value="">Select an attraction…</option>
            {otherAttractions.map((attraction) => (
              <option key={attraction.id} value={attraction.id}>
                {attraction.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sub-editor__field">
          <label htmlFor="relation-type" className="sub-editor__label">
            Relationship
          </label>
          <select
            id="relation-type"
            className="sub-editor__select"
            value={relationType}
            onChange={(event) => setRelationType(event.target.value as RelationType)}
          >
            {Object.entries(RELATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Button
          variant="secondary"
          leadingIcon={<Plus size={14} />}
          onClick={() => void add()}
          disabled={relatedAttractionId === ""}
        >
          Link attraction
        </Button>
      </div>
    </Section>
  );
}
