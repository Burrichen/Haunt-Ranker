import { useState } from "react";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ArtworkFit } from "../../media/mediaPolicy";
import type { EventYear } from "../../models/eventYear";
import { cn } from "../../utils/cn";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { Badge, IconButton } from "../ui";
import "./YearHeader.css";

export interface YearHeaderProps {
  eventYear: EventYear;
  /** Real event artwork, or null to show the plain fallback. */
  artworkUrl: string | null;
  /** How the artwork sits in its frame; a logo is shown whole. */
  artworkFit?: ArtworkFit;
  houseCount: number;
}

/** The year page's identity block: artwork if the archive has any, name, counts and description. */
export function YearHeader({
  eventYear,
  artworkUrl,
  artworkFit = "cover",
  houseCount,
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
              className={cn(
                "year-header__image",
                artworkFit === "contain" && "year-header__image--contain",
              )}
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
          </div>
          {eventYear.description && (
            <p className="year-header__description">{eventYear.description}</p>
          )}
        </div>
      </div>
    </header>
  );
}
