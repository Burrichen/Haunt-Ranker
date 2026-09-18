import { Link } from "react-router-dom";
import { RATING_MAX, RATING_TOTAL_MAX } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import type { Highlight, HighlightMode } from "../../utils/statistics";
import { AttractionHoverPreview } from "../archive";
import { Panel, SegmentedControl } from "../ui";
import "./HighlightCards.css";

export interface HighlightCardsProps {
  highlights: Highlight[];
  mode: HighlightMode;
  onModeChange: (mode: HighlightMode) => void;
}

const MODE_OPTIONS = [
  { value: "best" as const, label: "Best" },
  { value: "lowest" as const, label: "Lowest" },
];

/**
 * A restrained row of four stat tiles rather than a wall of cards: the same
 * four metrics flip between their best and lowest ends behind one toggle,
 * instead of eight tiles competing at once. Reviewed entries only — an
 * unrated attraction isn't the least scary thing in the archive, it's
 * unknown.
 */
export function HighlightCards({ highlights, mode, onModeChange }: HighlightCardsProps) {
  return (
    <section className="highlights" aria-label="Highlights">
      <div className="highlights__header">
        <h2 className="highlights__title">Highlights</h2>
        <SegmentedControl
          options={MODE_OPTIONS}
          value={mode}
          onChange={onModeChange}
          aria-label="Highlight mode"
        />
      </div>

      {highlights.length === 0 ? (
        <Panel padding="lg" className="highlights__empty">
          <p>Nothing reviewed in this slice yet, so there are no highlights to show.</p>
        </Panel>
      ) : (
        <div className="highlights__grid">
          {highlights.map((highlight) => (
            <Panel key={highlight.metric} elevated padding="md" className="highlight-card">
              <span className="highlight-card__label">{highlight.label}</span>
              <span className="highlight-card__value">
                {formatScore(highlight.value)}
                <span className="highlight-card__out-of">
                  {" "}
                  / {highlight.metric === "total" ? RATING_TOTAL_MAX : RATING_MAX}
                </span>
              </span>
              <AttractionHoverPreview
                attraction={highlight.attraction}
                eventYear={null}
                rating={highlight.rating}
              >
                <Link
                  to={`/attractions/${highlight.attraction.id}`}
                  className="highlight-card__name"
                >
                  {highlight.attraction.name}
                </Link>
              </AttractionHoverPreview>
            </Panel>
          ))}
        </div>
      )}
    </section>
  );
}
