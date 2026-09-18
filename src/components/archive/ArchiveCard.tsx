import { useState } from "react";
import { DoorOpen, Star, TreePine } from "lucide-react";
import { Link } from "react-router-dom";
import type { Attraction, AttractionType } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import type { Rating } from "../../models/rating";
import { RATING_TOTAL_MAX } from "../../models/rating";
import { cn } from "../../utils/cn";
import { formatScore } from "../../utils/formatScore";
import { Badge, Panel } from "../ui";
import { ParkBadgeRow } from "./ParkBadge";
import "./ArchiveCard.css";

export interface ArchiveCardProps {
  attraction: Attraction;
  eventYear: EventYear | null;
  /** A poster (or other) artwork URL, or null to show the generated fallback. */
  posterUrl: string | null;
  /** `null`/omitted means genuinely unrated — renders a "Not Rated" badge, never a 0. */
  rating?: Rating | null;
}

const TYPE_LABEL: Record<AttractionType, string> = {
  house: "House",
  scare_zone: "Scare Zone",
};

const TYPE_ICON: Record<AttractionType, typeof DoorOpen> = {
  house: DoorOpen,
  scare_zone: TreePine,
};

const IP_LABEL: Record<NonNullable<Attraction["ipType"]>, string> = {
  original: "Original",
  licensed: "Licensed IP",
};

/**
 * A poster-style card for one attraction. Shows real artwork when it's
 * available and loads successfully; otherwise renders a UI-only fallback
 * (name, year, type, park icons) — never a generated fake poster. Always
 * links through to that attraction's wiki page.
 */
export function ArchiveCard({ attraction, eventYear, posterUrl, rating }: ArchiveCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(posterUrl) && !imageFailed;
  const TypeIcon = TYPE_ICON[attraction.attractionType];

  return (
    <Link to={`/attractions/${attraction.id}`} className="archive-card-link">
      <Panel elevated padding="none" className="archive-card">
        <div className="archive-card__art">
          {showImage ? (
            <img
              src={posterUrl ?? undefined}
              alt={`${attraction.name} artwork`}
              className="archive-card__image"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="archive-card__fallback" aria-hidden="true">
              <div
                className={cn(
                  "archive-card__fallback-icon",
                  `archive-card__fallback-icon--${attraction.attractionType}`,
                )}
              >
                <TypeIcon size={28} strokeWidth={1.5} />
              </div>
            </div>
          )}
        </div>
        <div className="archive-card__body">
          <div className="archive-card__meta">
            {eventYear && <span className="archive-card__year">{eventYear.calendarYear}</span>}
            <Badge variant={attraction.attractionType === "house" ? "orange" : "purple"}>
              {TYPE_LABEL[attraction.attractionType]}
            </Badge>
          </div>
          <h3 className="archive-card__name">{attraction.name}</h3>
          <div className="archive-card__badges">
            {attraction.ipType && <Badge variant="neutral">{IP_LABEL[attraction.ipType]}</Badge>}
            {rating ? (
              <Badge variant="positive">
                <Star size={11} strokeWidth={2} />
                {formatScore(rating.total)} / {RATING_TOTAL_MAX}
              </Badge>
            ) : (
              <Badge variant="neutral">Not Rated</Badge>
            )}
          </div>
          <ParkBadgeRow parkIds={attraction.parkIds} className="archive-card__parks" />
        </div>
      </Panel>
    </Link>
  );
}
