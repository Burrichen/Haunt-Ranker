import { useState } from "react";
import { ChevronLeft, DoorOpen, TreePine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ParkBadgeRow } from "../archive";
import type { Attraction, AttractionType } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import { cn } from "../../utils/cn";
import { Badge, IconButton } from "../ui";
import "./WikiHeader.css";

export interface WikiHeaderProps {
  attraction: Attraction;
  eventYear: EventYear | null;
  /** A poster (or other) artwork URL, or null to show the generated fallback. */
  posterUrl: string | null;
  backTo: string;
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
 * The wiki page's identity block: real artwork when available, or a
 * deliberately plain fallback (never a generated fake poster) — name,
 * event year, type, IP classification, franchise and park icons.
 */
export function WikiHeader({ attraction, eventYear, posterUrl, backTo }: WikiHeaderProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const navigate = useNavigate();
  const showImage = Boolean(posterUrl) && !imageFailed;
  const TypeIcon = TYPE_ICON[attraction.attractionType];

  return (
    <header className="wiki-header">
      <IconButton
        icon={<ChevronLeft size={18} />}
        label="Back"
        size="sm"
        className="wiki-header__back"
        onClick={() => navigate(backTo)}
      />
      <div className="wiki-header__layout">
        <div className="wiki-header__art">
          {showImage ? (
            <img
              src={posterUrl ?? undefined}
              alt={`${attraction.name} artwork`}
              className="wiki-header__image"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="wiki-header__fallback" aria-hidden="true">
              <div
                className={cn(
                  "wiki-header__fallback-icon",
                  `wiki-header__fallback-icon--${attraction.attractionType}`,
                )}
              >
                <TypeIcon size={36} strokeWidth={1.5} />
              </div>
            </div>
          )}
        </div>

        <div className="wiki-header__info">
          <div className="wiki-header__badges">
            {eventYear && <Badge variant="neutral">{eventYear.calendarYear}</Badge>}
            <Badge variant={attraction.attractionType === "house" ? "orange" : "purple"}>
              {TYPE_LABEL[attraction.attractionType]}
            </Badge>
            {attraction.ipType && <Badge variant="neutral">{IP_LABEL[attraction.ipType]}</Badge>}
          </div>

          <h1 className="wiki-header__name">{attraction.name}</h1>
          {attraction.variantName && (
            <p className="wiki-header__variant">{attraction.variantName}</p>
          )}
          {attraction.shortSummary && (
            <p className="wiki-header__tagline">{attraction.shortSummary}</p>
          )}

          <div className="wiki-header__footer">
            {attraction.franchiseName && (
              <span className="wiki-header__franchise">{attraction.franchiseName}</span>
            )}
            <ParkBadgeRow parkIds={attraction.parkIds} className="wiki-header__parks" />
          </div>
        </div>
      </div>
    </header>
  );
}
