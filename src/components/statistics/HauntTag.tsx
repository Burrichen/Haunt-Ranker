import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import { hauntSeriesColor } from "./chartTheme";
import "./HauntTag.css";

export interface HauntTagProps {
  hauntId: string | null | undefined;
}

/**
 * Which haunt a cross-haunt result came from: the haunt's short name beside a
 * short stroke of its series colour, the same key the charts use. The name
 * carries the meaning; the colour only ties it to the charts.
 */
export function HauntTag({ hauntId }: HauntTagProps) {
  const registry = useHauntRegistry();
  if (!hauntId) {
    return null;
  }
  return (
    <span className="haunt-tag">
      <span
        aria-hidden="true"
        className="haunt-tag__key"
        style={{ backgroundColor: hauntSeriesColor(hauntId) }}
      />
      {registry.scopeLabel(hauntId, "short")}
    </span>
  );
}
