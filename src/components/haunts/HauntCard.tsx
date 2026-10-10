import { CalendarDays, DoorOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { useHauntScope } from "../../hooks/useHauntScope";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import type { HauntId } from "../../models/haunt";
import { hauntTheme } from "../../models/hauntTheme";
import { formatScore } from "../../utils/formatScore";
import {
  reviewCoveragePercent,
  seasonSpanLabel,
  type HauntArchiveSummary,
} from "../../utils/haunts";
import { Badge, Panel } from "../ui";
import "./HauntCard.css";

export interface HauntCardProps {
  summary: HauntArchiveSummary;
}

function Figure({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="haunt-card__figure">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * One haunt, as a way into its archive.
 *
 * Clicking it makes that haunt the one the app is looking at and opens its
 * overview, so everything downstream already speaks its vocabulary. The
 * figures are counts of what the archive holds, and a haunt with nothing in
 * it yet says so rather than showing zeroes dressed as data.
 */
export function HauntCard({ summary }: HauntCardProps) {
  const { setScope } = useHauntScope();
  const registry = useHauntRegistry();
  const hauntId: HauntId = summary.hauntId;
  const haunt = registry.haunt(hauntId);
  const name = haunt?.name ?? hauntId;
  const tagline = haunt?.tagline ?? null;
  const venuesLabel = haunt?.venuesLabel ?? null;
  const span = seasonSpanLabel(summary);
  const isEmpty = summary.attractions === 0;
  const coverage = reviewCoveragePercent(summary);

  return (
    <Link
      to={`/haunts/${hauntId}`}
      onClick={() => setScope(hauntId)}
      className="haunt-card-link"
      // Each collection wears its own haunt's identity, wherever it's shown.
      data-haunt-theme={hauntTheme(hauntId)}
      aria-label={`Open the ${name} archive`}
    >
      <Panel elevated glow="accent" padding="lg" className="haunt-card">
        <div className="haunt-card__head">
          <span className="haunt-card__eyebrow">Collection</span>
          <h2 className="haunt-card__name">{name}</h2>
          {tagline && <p className="haunt-card__tagline">{tagline}</p>}
        </div>

        {isEmpty ? (
          <p className="haunt-card__empty">Archive not yet entered.</p>
        ) : (
          <>
            <dl className="haunt-card__figures">
              <Figure label="Seasons" value={summary.seasons} />
              <Figure
                label={registry.label("house", hauntId, "many")}
                value={summary.walkthroughs}
              />
            </dl>

            <div className="haunt-card__coverage">
              <div
                className="haunt-card__coverage-bar"
                role="progressbar"
                aria-label={`${name} reviewed`}
                aria-valuemin={0}
                aria-valuemax={summary.attractions}
                aria-valuenow={summary.reviewed}
                aria-valuetext={`${summary.reviewed} of ${summary.attractions} reviewed`}
              >
                <span
                  className="haunt-card__coverage-fill"
                  style={{ width: `${coverage}%` }}
                  aria-hidden="true"
                />
              </div>
              <span className="haunt-card__coverage-label">
                {summary.reviewed} of {summary.attractions} reviewed
                {summary.attractions > 0 && ` · ${formatScore(coverage)}%`}
              </span>
            </div>
          </>
        )}

        <div className="haunt-card__footer">
          <Badge variant="neutral">
            <CalendarDays size={11} strokeWidth={2} />
            {span ?? "No seasons yet"}
          </Badge>
          {venuesLabel && <Badge variant="accent">{venuesLabel}</Badge>}
        </div>

        <span className="haunt-card__types" aria-hidden="true">
          <DoorOpen size={15} strokeWidth={1.5} />
        </span>
      </Panel>
    </Link>
  );
}
