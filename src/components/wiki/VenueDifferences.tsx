import type { AttractionVenueWiki } from "../../models/attractionVenueWiki";
import { PARK_NAMES } from "../archive/parkConstants";
import "./VenueDifferences.css";

export interface VenueDifferencesProps {
  sections: AttractionVenueWiki[];
}

const FIELD_LABELS: Array<{ key: keyof AttractionVenueWiki; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "storyLore", label: "Story / Lore" },
  { key: "experienceDescription", label: "Experience" },
  { key: "developmentNotes", label: "Development" },
  { key: "locationNotes", label: "Location" },
];

/**
 * What differed between one venue's build and another's, under the one
 * canonical record they share.
 *
 * The same house at Hollywood and Orlando is one attraction here — one
 * rating, one note, one place in a ranking — but the two builds were often
 * not the same thing to walk through. Those differences are shown, not
 * flattened; a venue with nothing recorded gets no heading at all, and a
 * field with nothing in it is simply absent.
 */
export function VenueDifferences({ sections }: VenueDifferencesProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="venue-differences">
      {sections.map((section) => {
        const written = FIELD_LABELS.filter(({ key }) => section[key]);
        if (written.length === 0) {
          return null;
        }

        return (
          <div key={section.venueId} className="venue-differences__venue">
            <h3 className="venue-differences__name">{PARK_NAMES[section.venueId]}</h3>
            <dl className="venue-differences__fields">
              {written.map(({ key, label }) => (
                <div key={key} className="venue-differences__field">
                  <dt>{label}</dt>
                  <dd>{String(section[key])}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
