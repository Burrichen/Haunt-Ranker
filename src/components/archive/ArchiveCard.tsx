import { useState } from "react";
import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { ArtworkFit } from "../../media/mediaPolicy";
import { isRankedCategory } from "../../models/haunt";
import type { Attraction } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { useHauntScope } from "../../hooks/useHauntScope";
import type { Rating } from "../../models/rating";
import { RATING_TOTAL_MAX } from "../../models/rating";
import { cn } from "../../utils/cn";
import { formatScore } from "../../utils/formatScore";
import { attractionDateLabel } from "../../utils/hauntDisplay";
import { Badge, Panel } from "../ui";
import { ParkBadgeRow } from "./ParkBadge";
import { attractionTypeIcon, attractionTypeVariant } from "./typeIcons";
import "./ArchiveCard.css";

export interface ArchiveCardProps {
  attraction: Attraction;
  eventYear: EventYear | null;
  /** A poster (or other) artwork URL, or null to show the generated fallback. */
  posterUrl: string | null;
  /** How the artwork sits in its frame; a logo is shown whole. */
  posterFit?: ArtworkFit;
  /** `null`/omitted means genuinely unrated — renders a "Not Rated" badge, never a 0. */
  rating?: Rating | null;
}

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
export function ArchiveCard({
  attraction,
  eventYear,
  posterUrl,
  posterFit = "cover",
  rating,
}: ArchiveCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { isAllHaunts } = useHauntScope();
  const registry = useHauntRegistry();
  const showImage = Boolean(posterUrl) && !imageFailed;
  const hauntName = registry.hauntName(eventYear?.hauntId);
  const dateLabel = attractionDateLabel(attraction, eventYear);

  return (
    <Link to={`/attractions/${attraction.id}`} className="archive-card-link">
      <Panel elevated padding="none" className="archive-card">
        <div className="archive-card__art">
          {showImage ? (
            <img
              src={posterUrl ?? undefined}
              alt={`${attraction.name} artwork`}
              className={cn(
                "archive-card__image",
                posterFit === "contain" && "archive-card__image--contain",
              )}
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
                {attractionTypeIcon(attraction.attractionType, { size: 28, strokeWidth: 1.5 })}
              </div>
            </div>
          )}
        </div>
        <div className="archive-card__body">
          <div className="archive-card__meta">
            <Badge variant={attractionTypeVariant(attraction.attractionType)}>
              {registry.label(attraction.attractionType, eventYear?.hauntId)}
            </Badge>
          </div>
          <h3 className="archive-card__name">{attraction.name}</h3>
          {/* Where a record is from, on one line under its name. With every
              haunt on screen the year alone would be ambiguous — two of them
              hold a 2024 — so the haunt is named first. Inside one haunt
              that would repeat on every card, so the date stands alone. */}
          {(hauntName || dateLabel) && (
            <p className="archive-card__source">
              {isAllHaunts && hauntName && <span className="archive-card__haunt">{hauntName}</span>}
              {isAllHaunts && hauntName && dateLabel && (
                <span className="archive-card__source-dot" aria-hidden="true">
                  •
                </span>
              )}
              {dateLabel && <span className="archive-card__year">{dateLabel}</span>}
            </p>
          )}
          <div className="archive-card__badges">
            {attraction.ipType && <Badge variant="neutral">{IP_LABEL[attraction.ipType]}</Badge>}
            {/* Shows and special experiences aren't rated, so they say nothing about it. */}
            {!isRankedCategory(attraction.attractionType) ? null : rating ? (
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
