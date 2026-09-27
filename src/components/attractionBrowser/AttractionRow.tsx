import { Star } from "lucide-react";
import { Link } from "react-router-dom";
import { RATING_TOTAL_MAX } from "../../models/rating";
import { useHauntScope } from "../../hooks/useHauntScope";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { formatScore } from "../../utils/formatScore";
import { attractionDateLabel } from "../../utils/hauntDisplay";
import { ParkBadgeRow } from "../archive";
import { attractionTypeIcon } from "../archive/typeIcons";
import { Badge } from "../ui";
import type { AttractionBrowserRow } from "../../utils/attractionBrowser";
import "./AttractionRow.css";

const IP_LABEL: Record<"original" | "licensed", string> = {
  original: "Original",
  licensed: "Licensed IP",
};

export interface AttractionRowProps {
  row: AttractionBrowserRow;
}

/** A dense, scannable list row — the "Compact view" alternative to `ArchiveCard`'s poster grid. */
export function AttractionRow({ row }: AttractionRowProps) {
  const { attraction, eventYear, rating } = row;
  const { isAllHaunts } = useHauntScope();
  const registry = useHauntRegistry();
  const hauntId = eventYear?.hauntId ?? null;

  return (
    <Link to={`/attractions/${attraction.id}`} className="attraction-row">
      <span className="attraction-row__icon" aria-hidden="true">
        {attractionTypeIcon(attraction.attractionType, { size: 16, strokeWidth: 1.5 })}
      </span>
      <span className="attraction-row__name">
        {attraction.name}
        {isAllHaunts && hauntId && (
          <span className="attraction-row__haunt">
            {registry.haunt(hauntId)?.shortName ?? registry.hauntName(hauntId)}
          </span>
        )}
      </span>
      <span className="attraction-row__year">
        {attractionDateLabel(attraction, eventYear) ?? "—"}
      </span>
      <span className="attraction-row__ip">
        {attraction.ipType && <Badge variant="neutral">{IP_LABEL[attraction.ipType]}</Badge>}
      </span>
      <ParkBadgeRow parkIds={attraction.parkIds} className="attraction-row__parks" />
      <span className="attraction-row__rating">
        {rating ? (
          <Badge variant="positive">
            <Star size={11} strokeWidth={2} />
            {formatScore(rating.total)} / {RATING_TOTAL_MAX}
          </Badge>
        ) : (
          <Badge variant="neutral">Not Rated</Badge>
        )}
      </span>
    </Link>
  );
}
