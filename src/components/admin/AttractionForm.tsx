import { useState } from "react";
import type { FormEvent } from "react";
import type { Attraction, AttractionInput, AttractionType, IpType } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import type { ParkId } from "../../models/park";
import { Button, FilterChip, Input, Panel, SegmentedControl, Textarea } from "../ui";
import "./AttractionForm.css";

export interface AttractionFormProps {
  /** `null` when creating. */
  attraction: Attraction | null;
  attractionType: AttractionType;
  years: EventYear[];
  onSave: (input: AttractionInput) => Promise<void>;
  onCancel: () => void;
}

const TYPE_OPTIONS = [
  { value: "house", label: "House" },
  { value: "scare_zone", label: "Scare Zone" },
];

const IP_OPTIONS = [
  { value: "unknown", label: "Unknown" },
  { value: "original", label: "Original" },
  { value: "licensed", label: "Licensed IP" },
];

/** Mirrors the repository's rule; the repository is still the one that enforces it. */
function validate(
  name: string,
  eventYearId: string,
  parkIds: ParkId[],
): Partial<Record<"name" | "eventYearId" | "parkIds", string>> {
  const errors: Partial<Record<"name" | "eventYearId" | "parkIds", string>> = {};
  if (name.trim() === "") {
    errors.name = "A name is required.";
  }
  if (eventYearId === "") {
    errors.eventYearId = "An event year is required.";
  }
  if (parkIds.length === 0) {
    errors.parkIds = "Pick at least one park.";
  }
  return errors;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "attraction"
  );
}

/** Trims a field, turning an empty one into `null` — unknown, rather than blank. */
function optional(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * The core attraction record. Only name, event year and at least one park are
 * required — everything else is knowledge the archive may simply not have
 * yet, and a half-documented attraction is still worth recording.
 */
export function AttractionForm({
  attraction,
  attractionType: initialType,
  years,
  onSave,
  onCancel,
}: AttractionFormProps) {
  const [type, setType] = useState<AttractionType>(attraction?.attractionType ?? initialType);
  const [name, setName] = useState(attraction?.name ?? "");
  const [variantName, setVariantName] = useState(attraction?.variantName ?? "");
  const [eventYearId, setEventYearId] = useState(attraction?.eventYearId ?? years[0]?.id ?? "");
  const [parkIds, setParkIds] = useState<ParkId[]>(attraction?.parkIds ?? []);
  const [ipType, setIpType] = useState<IpType | "unknown">(attraction?.ipType ?? "unknown");
  const [franchiseName, setFranchiseName] = useState(attraction?.franchiseName ?? "");
  const [shortSummary, setShortSummary] = useState(attraction?.shortSummary ?? "");
  const [fullOverview, setFullOverview] = useState(attraction?.fullOverview ?? "");
  const [storyLore, setStoryLore] = useState(attraction?.storyLore ?? "");
  const [experienceDescription, setExperienceDescription] = useState(
    attraction?.experienceDescription ?? "",
  );
  const [developmentNotes, setDevelopmentNotes] = useState(attraction?.developmentNotes ?? "");
  const [locationNotes, setLocationNotes] = useState(attraction?.locationNotes ?? "");
  const [openingDate, setOpeningDate] = useState(attraction?.openingDate ?? "");
  const [closingDate, setClosingDate] = useState(attraction?.closingDate ?? "");

  const [errors, setErrors] = useState<ReturnType<typeof validate>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const togglePark = (park: ParkId) =>
    setParkIds((current) =>
      current.includes(park) ? current.filter((item) => item !== park) : [...current, park],
    );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const found = validate(name, eventYearId, parkIds);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await onSave({
        eventYearId,
        attractionType: type,
        name: name.trim(),
        slug: attraction?.slug ?? slugify(name),
        parkIds,
        variantName: optional(variantName),
        ipType: ipType === "unknown" ? null : ipType,
        franchiseName: optional(franchiseName),
        shortSummary: optional(shortSummary),
        fullOverview: optional(fullOverview),
        storyLore: optional(storyLore),
        experienceDescription: optional(experienceDescription),
        developmentNotes: optional(developmentNotes),
        locationNotes: optional(locationNotes),
        openingDate: optional(openingDate),
        closingDate: optional(closingDate),
      });
    } catch (caught) {
      // Includes anything the repository rejected that the form didn't catch
      // first — a duplicate slug, a vanished event year.
      setSaveError(caught instanceof Error ? caught.message : "Couldn't save this attraction.");
      setIsSaving(false);
      return;
    }
    setIsSaving(false);
  };

  return (
    <form
      aria-label="Attraction details"
      className="attraction-form"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <Panel elevated padding="lg" className="attraction-form__section">
        <h2 className="attraction-form__section-title">The basics</h2>

        <div className="attraction-form__row">
          <div className="attraction-form__field">
            <span className="attraction-form__label">Type</span>
            <SegmentedControl
              options={TYPE_OPTIONS}
              value={type}
              onChange={(value) => setType(value as AttractionType)}
              aria-label="Attraction type"
            />
          </div>

          <div className="attraction-form__field">
            <label htmlFor="attraction-year" className="attraction-form__label">
              Event year
            </label>
            <select
              id="attraction-year"
              className="attraction-form__select"
              value={eventYearId}
              onChange={(event) => setEventYearId(event.target.value)}
            >
              <option value="">Select a year…</option>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.calendarYear} — {year.name}
                </option>
              ))}
            </select>
            {errors.eventYearId && (
              <p className="attraction-form__error" role="alert">
                {errors.eventYearId}
              </p>
            )}
          </div>
        </div>

        <Input
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
        />

        <Input
          label="Variant name (optional)"
          hint="Use this when a second record is a substantially different version of the same concept, rather than the same attraction at two parks."
          value={variantName}
          onChange={(event) => setVariantName(event.target.value)}
        />

        <div className="attraction-form__field">
          <span className="attraction-form__label">Parks</span>
          <div className="attraction-form__chips">
            <FilterChip
              active={parkIds.includes("hollywood")}
              onClick={() => togglePark("hollywood")}
            >
              Hollywood
            </FilterChip>
            <FilterChip active={parkIds.includes("orlando")} onClick={() => togglePark("orlando")}>
              Orlando
            </FilterChip>
          </div>
          <p className="attraction-form__hint">
            Pick both when one attraction ran at both parks as essentially the same thing. If the
            two versions differed substantially, make a second record instead — nothing is merged
            automatically.
          </p>
          {errors.parkIds && (
            <p className="attraction-form__error" role="alert">
              {errors.parkIds}
            </p>
          )}
        </div>

        <div className="attraction-form__row">
          <div className="attraction-form__field">
            <span className="attraction-form__label">Classification</span>
            <SegmentedControl
              options={IP_OPTIONS}
              value={ipType}
              onChange={(value) => setIpType(value as IpType | "unknown")}
              aria-label="IP classification"
            />
          </div>

          <Input
            label="Franchise (optional)"
            value={franchiseName}
            onChange={(event) => setFranchiseName(event.target.value)}
            className="attraction-form__grow"
          />
        </div>
      </Panel>

      <Panel elevated padding="lg" className="attraction-form__section">
        <h2 className="attraction-form__section-title">Wiki content</h2>
        <p className="attraction-form__section-hint">
          All optional. Empty sections simply don&rsquo;t appear on the wiki page.
        </p>

        <Input
          label="Short summary"
          value={shortSummary}
          onChange={(event) => setShortSummary(event.target.value)}
        />
        <Textarea
          label="Overview"
          rows={4}
          value={fullOverview}
          onChange={(event) => setFullOverview(event.target.value)}
        />
        <Textarea
          label="Story / lore"
          rows={4}
          value={storyLore}
          onChange={(event) => setStoryLore(event.target.value)}
        />
        <Textarea
          label="Experience"
          rows={3}
          value={experienceDescription}
          onChange={(event) => setExperienceDescription(event.target.value)}
        />
        <Textarea
          label="Development notes"
          rows={3}
          value={developmentNotes}
          onChange={(event) => setDevelopmentNotes(event.target.value)}
        />
      </Panel>

      <Panel elevated padding="lg" className="attraction-form__section">
        <h2 className="attraction-form__section-title">Run details</h2>

        <Input
          label="Location notes"
          value={locationNotes}
          onChange={(event) => setLocationNotes(event.target.value)}
        />
        <div className="attraction-form__row">
          <Input
            label="Opening"
            hint="A date, or however precisely it's known."
            value={openingDate}
            onChange={(event) => setOpeningDate(event.target.value)}
            className="attraction-form__grow"
          />
          <Input
            label="Closing"
            value={closingDate}
            onChange={(event) => setClosingDate(event.target.value)}
            className="attraction-form__grow"
          />
        </div>
      </Panel>

      {saveError && (
        <p className="attraction-form__error" role="alert">
          {saveError}
        </p>
      )}

      <div className="attraction-form__actions">
        <Button variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isSaving}>
          {attraction ? "Save changes" : "Create attraction"}
        </Button>
      </div>
    </form>
  );
}
