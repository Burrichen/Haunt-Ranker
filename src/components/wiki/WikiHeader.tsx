import { useState } from "react";
import { ChevronLeft, DoorOpen, TreePine } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ParkBadgeRow } from "../archive";
import type { Attraction, AttractionType } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import { attractionTypeLabel, HAUNT_NAMES } from "../../models/haunt";
import { attractionDateLabel } from "../../utils/hauntDisplay";
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
  const hauntId = eventYear?.hauntId ?? null;
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
          {/* Which archive this record belongs to comes first: on a page
              reached from search or a link, it is the thing a reader most
              needs to know. */}
          {hauntId && <p className="wiki-header__haunt">{HAUNT_NAMES[hauntId].name}</p>}

          <div className="wiki-header__badges">
            {attractionDateLabel(attraction, eventYear) && (
              <Badge variant="neutral">{attractionDateLabel(attraction, eventYear)}</Badge>
            )}
            <Badge variant={attraction.attractionType === "house" ? "orange" : "purple"}>
              {attractionTypeLabel(attraction.attractionType, hauntId)}
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
