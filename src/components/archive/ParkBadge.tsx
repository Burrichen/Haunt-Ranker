import type { ParkId } from "../../models/park";
import { cn } from "../../utils/cn";
import { PARK_ICONS, PARK_NAMES } from "./parkConstants";
import "./ParkBadge.css";

export interface ParkBadgeRowProps {
  parkIds: ParkId[];
  className?: string;
}

/**
 * A compact row of park icons. Uses the native `title` attribute rather
 * than our richer `Tooltip` primitive deliberately — this renders inside
 * every attraction card/row, potentially hundreds at once, and `title`
 * needs no extra state or event listeners per instance while still
 * explaining each icon on hover and to assistive tech (it becomes the
 * element's accessible name).
 */
export function ParkBadgeRow({ parkIds, className }: ParkBadgeRowProps) {
  if (parkIds.length === 0) {
    return null;
  }

  return (
    <span className={cn("park-badge-row", className)}>
      {parkIds.map((parkId) => {
        const Icon = PARK_ICONS[parkId];
        return (
          <span key={parkId} className="park-badge" title={PARK_NAMES[parkId]}>
            <Icon size={13} strokeWidth={1.75} />
          </span>
        );
      })}
    </span>
  );
}
