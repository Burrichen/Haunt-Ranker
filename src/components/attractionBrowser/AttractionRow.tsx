import { DoorOpen, Star, TreePine } from "lucide-react";
import { Link } from "react-router-dom";
import type { AttractionType } from "../../models/attraction";
import { RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import { ParkBadgeRow } from "../archive";
import { Badge } from "../ui";
import type { AttractionBrowserRow } from "../../utils/attractionBrowser";
import "./AttractionRow.css";

const TYPE_ICON: Record<AttractionType, typeof DoorOpen> = {
  house: DoorOpen,
  scare_zone: TreePine,
};

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
  const TypeIcon = TYPE_ICON[attraction.attractionType];

  return (
    <Link to={`/attractions/${attraction.id}`} className="attraction-row">
      <span className="attraction-row__icon" aria-hidden="true">
        <TypeIcon size={16} strokeWidth={1.5} />
      </span>
      <span className="attraction-row__name">{attraction.name}</span>
      <span className="attraction-row__year">{eventYear?.calendarYear ?? "—"}</span>
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
