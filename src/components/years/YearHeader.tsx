import { useState } from "react";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { EventYear } from "../../models/eventYear";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { Badge, IconButton } from "../ui";
import "./YearHeader.css";

export interface YearHeaderProps {
  eventYear: EventYear;
  /** Real event artwork, or null to show the plain fallback. */
  artworkUrl: string | null;
  houseCount: number;
  scareZoneCount: number;
  /**
   * Any other kinds this season held, already counted and named by the
   * haunt — a show, or something no shipped haunt has. Shown only when a
   * season actually has some.
   */
  otherCounts?: Array<{ label: string; count: number }>;
}

/** The year page's identity block: artwork if the archive has any, name, counts and description. */
export function YearHeader({
  eventYear,
  artworkUrl,
  houseCount,
  scareZoneCount,
  otherCounts = [],
}: YearHeaderProps) {
  const registry = useHauntRegistry();
  const [imageFailed, setImageFailed] = useState(false);
  const navigate = useNavigate();
  const showImage = Boolean(artworkUrl) && !imageFailed;

  return (
    <header className="year-header">
      <IconButton
        icon={<ChevronLeft size={18} />}
        label="Back"
        size="sm"
        className="year-header__back"
        onClick={() => navigate("/years")}
      />

      <div className="year-header__layout">
        <div className="year-header__art">
          {showImage ? (
            <img
              src={artworkUrl ?? undefined}
              alt={`${eventYear.name} artwork`}
              className="year-header__image"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="year-header__fallback" aria-hidden="true">
              <CalendarDays size={30} strokeWidth={1.5} />
              <span className="year-header__fallback-year">{eventYear.calendarYear}</span>
            </div>
          )}
        </div>

        <div className="year-header__info">
          <span className="year-header__year">{eventYear.calendarYear}</span>
          <h1 className="year-header__name">{eventYear.name}</h1>
          <div className="year-header__badges">
            <Badge variant="orange">
              {houseCount}{" "}
              {registry.label("house", eventYear.hauntId, houseCount === 1 ? "one" : "many")}
            </Badge>
            <Badge variant="purple">
              {scareZoneCount}{" "}
              {registry.label(
                "scare_zone",
                eventYear.hauntId,
                scareZoneCount === 1 ? "one" : "many",
              )}
            </Badge>
            {otherCounts.map((entry) => (
              <Badge key={entry.label} variant="neutral">
                {entry.count} {entry.label}
              </Badge>
            ))}
          </div>
          {eventYear.description && (
            <p className="year-header__description">{eventYear.description}</p>
          )}
        </div>
      </div>
    </header>
  );
}
