import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AttractionHoverPreview, PARK_ICONS, PARK_NAMES } from "../archive";
import type { Attraction, AttractionType } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import { formatDisplayDate } from "../../utils/formatDate";
import type { RelatedAttractionItem } from "../../hooks/useAttractionWiki";
import { Panel } from "../ui";
import "./DetailsPanel.css";

export interface DetailsPanelProps {
  attraction: Attraction;
  eventYear: EventYear | null;
  relatedItems: RelatedAttractionItem[];
}

const TYPE_LABEL: Record<AttractionType, string> = {
  house: "House",
  scare_zone: "Scare Zone",
};

const IP_LABEL: Record<NonNullable<Attraction["ipType"]>, string> = {
  original: "Original",
  licensed: "Licensed IP",
};

function DetailsRow({ label, children }: { label: string; children: ReactNode }) {
  if (children === null || children === undefined || children === "") {
    return null;
  }
  return (
    <div className="details-panel__row">
      <dt className="details-panel__label">{label}</dt>
      <dd className="details-panel__value">{children}</dd>
    </div>
  );
}

/** A compact factual summary — an infobox, not prose. Fields with no data simply don't appear. */
export function DetailsPanel({ attraction, eventYear, relatedItems }: DetailsPanelProps) {
  return (
    <Panel elevated padding="md" className="details-panel" aria-label="Details">
      <h2 className="details-panel__title">Details</h2>
      <dl className="details-panel__list">
        <DetailsRow label="Event">{eventYear?.name ?? null}</DetailsRow>
        <DetailsRow label="Year">{eventYear?.calendarYear ?? null}</DetailsRow>
        <DetailsRow label="Type">{TYPE_LABEL[attraction.attractionType]}</DetailsRow>
        <DetailsRow label="Park(s)">
          {attraction.parkIds.length > 0 ? (
            <span className="details-panel__parks">
              {attraction.parkIds.map((parkId) => {
                const Icon = PARK_ICONS[parkId];
                return (
                  <span key={parkId} className="details-panel__park">
                    <Icon size={13} strokeWidth={1.75} />
                    {PARK_NAMES[parkId]}
                  </span>
                );
              })}
            </span>
          ) : null}
        </DetailsRow>
        <DetailsRow label="Classification">
          {attraction.ipType ? IP_LABEL[attraction.ipType] : null}
        </DetailsRow>
        <DetailsRow label="Franchise">{attraction.franchiseName}</DetailsRow>
        <DetailsRow label="Location">{attraction.locationNotes}</DetailsRow>
        <DetailsRow label="Opening">{formatDisplayDate(attraction.openingDate)}</DetailsRow>
        <DetailsRow label="Closing">{formatDisplayDate(attraction.closingDate)}</DetailsRow>
        <DetailsRow label="Related attractions">
          {relatedItems.length > 0 ? (
            <ul className="details-panel__related-list">
              {relatedItems.map((item) => (
                <li key={item.relation.id}>
                  <AttractionHoverPreview
                    attraction={item.attraction}
                    eventYear={item.eventYear}
                    rating={item.rating}
                  >
                    <Link
                      to={`/attractions/${item.attraction.id}`}
                      className="details-panel__related-link"
                    >
                      {item.attraction.name}
                    </Link>
                  </AttractionHoverPreview>
                </li>
              ))}
            </ul>
          ) : null}
        </DetailsRow>
      </dl>
    </Panel>
  );
}
