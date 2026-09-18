import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import type { DragEvent, ReactNode } from "react";
import { Link } from "react-router-dom";
import { RATING_TOTAL_MAX } from "../../models/rating";
import { cn } from "../../utils/cn";
import { formatScore } from "../../utils/formatScore";
import type { RankingRow as RankingRowData } from "../../utils/rankings";
import { AttractionHoverPreview, ParkBadgeRow } from "../archive";
import { Badge, IconButton } from "../ui";
import "./RankingRow.css";

export interface RankingRowReorder {
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export interface RankingRowDrag {
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onDragEnd: () => void;
}

export interface RankingRowProps {
  row: RankingRowData;
  /** 1-based rank. Omitted for the side lists, which aren't ranked. */
  position?: number;
  /** Marks the row as manually placed — shows the grip and enables reordering. */
  reorder?: RankingRowReorder;
  drag?: RankingRowDrag;
  /** Trailing control, e.g. "Add to ranking" on an unplaced row. */
  action?: ReactNode;
}

/**
 * One compact ranking entry. Hovering anywhere on it shows the shared
 * `AttractionPreviewCard`; the body is a link through to the wiki article,
 * with any reorder controls kept outside that link so they stay usable.
 */
export function RankingRow({ row, position, reorder, drag, action }: RankingRowProps) {
  const { attraction, eventYear, rating } = row;

  return (
    <li
      className={cn(
        "ranking-row",
        drag?.isDragging && "ranking-row--dragging",
        drag?.isDropTarget && "ranking-row--drop-target",
      )}
    >
      <AttractionHoverPreview attraction={attraction} eventYear={eventYear} rating={rating}>
        <span
          className="ranking-row__inner"
          draggable={drag ? true : undefined}
          onDragStart={drag?.onDragStart}
          onDragOver={drag?.onDragOver}
          onDrop={drag?.onDrop}
          onDragEnd={drag?.onDragEnd}
        >
          {position !== undefined && <span className="ranking-row__position">{position}</span>}

          {reorder && (
            <span
              className="ranking-row__grip"
              title="Manually ranked — drag to reorder"
              aria-hidden="true"
            >
              <GripVertical size={14} strokeWidth={1.75} />
            </span>
          )}

          <Link to={`/attractions/${attraction.id}`} className="ranking-row__main">
            <span className="ranking-row__name">{attraction.name}</span>
            <span className="ranking-row__meta">
              <span className="ranking-row__year">{eventYear?.calendarYear ?? "—"}</span>
              <ParkBadgeRow parkIds={attraction.parkIds} />
            </span>

            {rating ? (
              <>
                <span className="ranking-row__scores">
                  <span className="ranking-row__score">
                    <em>Theme</em> {formatScore(rating.theme)}
                  </span>
                  <span className="ranking-row__score">
                    <em>Fun</em> {formatScore(rating.fun)}
                  </span>
                  <span className="ranking-row__score">
                    <em>Fear</em> {formatScore(rating.fear)}
                  </span>
                </span>
                <span className="ranking-row__total">
                  {formatScore(rating.total)}
                  <span className="ranking-row__total-max"> / {RATING_TOTAL_MAX}</span>
                </span>
              </>
            ) : (
              <Badge variant="neutral">Not Rated</Badge>
            )}
          </Link>

          {reorder && (
            <span className="ranking-row__controls">
              <IconButton
                icon={<ChevronUp size={15} />}
                label={`Move ${attraction.name} up`}
                size="sm"
                disabled={!reorder.canMoveUp}
                onClick={reorder.onMoveUp}
              />
              <IconButton
                icon={<ChevronDown size={15} />}
                label={`Move ${attraction.name} down`}
                size="sm"
                disabled={!reorder.canMoveDown}
                onClick={reorder.onMoveDown}
              />
            </span>
          )}

          {action && <span className="ranking-row__action">{action}</span>}
        </span>
      </AttractionHoverPreview>
    </li>
  );
}
