import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { useHauntScope } from "../../hooks/useHauntScope";
import { RATING_TOTAL_MAX } from "../../models/rating";
import { cn } from "../../utils/cn";
import { formatScore } from "../../utils/formatScore";
import type { YearSummary } from "../../utils/years";
import { Badge, Panel } from "../ui";
import "./YearCard.css";

export interface YearCardProps {
  summary: YearSummary;
  /**
   * Whether the card names its haunt. False where the list is already
   * grouped under a haunt heading, so it isn't said twice.
   */
  showHaunt?: boolean;
}

/**
 * One event year on the overview. Shows real artwork when the year has some
 * on file and an elegant fallback otherwise — never a generated stand-in —
 * and states its average only when enough of the year has been reviewed to
 * mean anything.
 */
export function YearCard({ summary, showHaunt = true }: YearCardProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const { isAllHaunts } = useHauntScope();
  const registry = useHauntRegistry();
  const { eventYear, artworkUrl, artworkFit, houseCount, scareZoneCount, reviewedCount, averages } =
    summary;
  const showImage = Boolean(artworkUrl) && !imageFailed;

  return (
    <Link to={`/years/${eventYear.id}`} className="year-card-link">
      <Panel elevated padding="none" className="year-card">
        <div className="year-card__art">
          {showImage ? (
            <img
              src={artworkUrl ?? undefined}
              alt={`${eventYear.name} artwork`}
              className={cn(
                "year-card__image",
                artworkFit === "contain" && "year-card__image--contain",
              )}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="year-card__fallback" aria-hidden="true">
              <CalendarDays size={26} strokeWidth={1.5} />
              <span className="year-card__fallback-year">{eventYear.calendarYear}</span>
            </div>
          )}
        </div>

        <div className="year-card__body">
          {/* Two haunts both hold a 2024, so a mixed list names the haunt
              before the year. */}
          {isAllHaunts && showHaunt && (
            <span className="year-card__haunt">{registry.hauntName(eventYear.hauntId)}</span>
          )}
          <span className="year-card__year">{eventYear.calendarYear}</span>
          <h3 className="year-card__name">{eventYear.name}</h3>

          <dl className="year-card__counts">
            <div className="year-card__count">
              <dt>{registry.label("house", eventYear.hauntId, "many")}</dt>
              <dd>{houseCount}</dd>
            </div>
            <div className="year-card__count">
              <dt>{registry.label("scare_zone", eventYear.hauntId, "many")}</dt>
              <dd>{scareZoneCount}</dd>
            </div>
            <div className="year-card__count">
              <dt>Reviewed</dt>
              <dd>{reviewedCount}</dd>
            </div>
          </dl>

          <div className="year-card__average">
            {averages ? (
              <Badge variant="positive">
                Avg {formatScore(averages.total)} / {RATING_TOTAL_MAX}
              </Badge>
            ) : (
              <Badge variant="neutral">Not enough reviews</Badge>
            )}
          </div>
        </div>
      </Panel>
    </Link>
  );
}
