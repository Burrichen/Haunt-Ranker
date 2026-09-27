import { Link } from "react-router-dom";
import type { Attraction } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import type { Rating } from "../../models/rating";
import { cn } from "../../utils/cn";
import { formatScore } from "../../utils/formatScore";
import { attractionDateLabel } from "../../utils/hauntDisplay";
import { useHauntScope } from "../../hooks/useHauntScope";
import { Badge, Panel } from "../ui";
import { ParkBadgeRow } from "./ParkBadge";
import { attractionTypeIcon, attractionTypeVariant } from "./typeIcons";
import "./AttractionPreviewCard.css";

export interface AttractionPreviewCardProps {
  attraction: Attraction;
  eventYear: EventYear | null;
  /** `null` means genuinely unrated — renders "Not Rated", never a 0. */
  rating: Rating | null;
  className?: string;
}

const IP_LABEL: Record<NonNullable<Attraction["ipType"]>, string> = {
  original: "Original",
  licensed: "Licensed IP",
};

/**
 * A compact, self-contained summary of one attraction — name, year,
 * park(s), type, Theme/Fun/Fear/Total (or "Not Rated"), and Original/IP.
 * Reused two ways: as a clickable card in the "Related Attractions"
 * section, and as the content shown by `AttractionHoverPreview`. Always
 * links to the attraction's wiki page.
 */
export function AttractionPreviewCard({
  attraction,
  eventYear,
  rating,
  className,
}: AttractionPreviewCardProps) {
  const { isAllHaunts } = useHauntScope();
  const registry = useHauntRegistry();
  const hauntName = registry.hauntName(eventYear?.hauntId);
  const dateLabel = attractionDateLabel(attraction, eventYear);

  return (
    <Link
      to={`/attractions/${attraction.id}`}
      className={cn("attraction-preview-card-link", className)}
    >
      <Panel elevated padding="sm" className="attraction-preview-card">
        <div className="attraction-preview-card__header">
          <span className="attraction-preview-card__icon" aria-hidden="true">
            {attractionTypeIcon(attraction.attractionType, { size: 15, strokeWidth: 1.5 })}
          </span>
          <h4 className="attraction-preview-card__name">{attraction.name}</h4>
        </div>

        <div className="attraction-preview-card__meta">
          {dateLabel && <span className="attraction-preview-card__year">{dateLabel}</span>}
          {isAllHaunts && hauntName && (
            <span className="attraction-preview-card__haunt">{hauntName}</span>
          )}
          <Badge variant={attractionTypeVariant(attraction.attractionType)}>
            {registry.label(attraction.attractionType, eventYear?.hauntId)}
          </Badge>
          {attraction.ipType && <Badge variant="neutral">{IP_LABEL[attraction.ipType]}</Badge>}
        </div>

        <ParkBadgeRow parkIds={attraction.parkIds} className="attraction-preview-card__parks" />

        {rating ? (
          <dl className="attraction-preview-card__scores">
            <div className="attraction-preview-card__score">
              <dt>Theme</dt>
              <dd>{formatScore(rating.theme)}</dd>
            </div>
            <div className="attraction-preview-card__score">
              <dt>Fun</dt>
              <dd>{formatScore(rating.fun)}</dd>
            </div>
            <div className="attraction-preview-card__score">
              <dt>Fear</dt>
              <dd>{formatScore(rating.fear)}</dd>
            </div>
            <div className="attraction-preview-card__score attraction-preview-card__score--total">
              <dt>Total</dt>
              <dd>{formatScore(rating.total)}</dd>
            </div>
          </dl>
        ) : (
          <Badge variant="neutral" className="attraction-preview-card__not-rated">
            Not Rated
          </Badge>
        )}
      </Panel>
    </Link>
  );
}
