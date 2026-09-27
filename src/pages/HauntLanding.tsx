import { useEffect } from "react";
import { BarChart3, CalendarDays, CircleAlert, DoorOpen, Trophy, TreePine } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, EmptyState, LoadingState, PageHeader, Panel } from "../components/ui";
import { useHauntLanding } from "../hooks/useHaunts";
import { useHauntScope } from "../hooks/useHauntScope";
import { useHauntRegistry } from "../hooks/useHauntRegistry";
import type { HauntId } from "../models/haunt";
import { RATING_MAX, RATING_TOTAL_MAX } from "../models/rating";
import { formatScore } from "../utils/formatScore";
import { reviewCoveragePercent, seasonSpanLabel } from "../utils/haunts";
import { MIN_REVIEWED_FOR_STATS, type YearStats } from "../utils/years";
import "./HauntLanding.css";

function Figure({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="haunt-landing__figure">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * A haunt's ratings, on the same terms as a season's: averages only once
 * enough of it has been reviewed to mean anything, and the sample size
 * always next to them.
 */
function HauntAverages({ stats }: { stats: YearStats }) {
  const { averages, reviewedCount, attractionCount } = stats;

  if (!averages) {
    return (
      <p className="haunt-landing__insufficient">
        Not enough reviewed attractions to average yet — {reviewedCount} of {attractionCount}{" "}
        reviewed. Rate at least {MIN_REVIEWED_FOR_STATS} and this haunt&rsquo;s averages appear
        here.
      </p>
    );
  }

  const metrics = [
    { label: "Total", value: averages.total, outOf: RATING_TOTAL_MAX },
    { label: "Theme", value: averages.theme, outOf: RATING_MAX },
    { label: "Fun", value: averages.fun, outOf: RATING_MAX },
    { label: "Fear", value: averages.fear, outOf: RATING_MAX },
  ];

  return (
    <>
      <dl className="haunt-landing__metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className="haunt-landing__metric">
            <dt>{metric.label}</dt>
            <dd>
              {formatScore(metric.value)}
              <span className="haunt-landing__out-of"> / {metric.outOf}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="haunt-landing__sample">
        Averaged over {reviewedCount} reviewed of {attractionCount} on file.
      </p>
    </>
  );
}

/**
 * One haunt's own page: what it is, what the archive holds of it, and how
 * it has been reviewed.
 *
 * Its accent follows the haunt; everything else — the panels, the type
 * scale, the spacing — is the app's, so a second collection reads as part
 * of Haunt Ranker rather than as a different site behind the same window.
 */
export function HauntLanding() {
  const { hauntId } = useParams<{ hauntId: string }>();
  const { setScope } = useHauntScope();
  const registry = useHauntRegistry();
  const navigate = useNavigate();

  // A haunt is known because it is in the registry — which is how an
  // imported one gets a page without this file being changed.
  const known = Boolean(hauntId) && registry.haunt(hauntId) !== null;
  const resolved = (hauntId ?? "") as HauntId;
  const { isLoading, error, summary, seasons, stats } = useHauntLanding(resolved);

  // Opening a haunt's page is choosing that haunt, so the nav, the archive
  // and the vocabulary follow without the reader setting it twice.
  //
  // Deliberately keyed on the haunt this page is for, and not on the
  // current scope: re-asserting it whenever the two differ would mean the
  // selector could never be moved while standing on a haunt's page.
  useEffect(() => {
    if (known) {
      setScope(resolved);
    }
  }, [known, resolved, setScope]);

  if (!known) {
    return (
      <>
        <PageHeader title="Haunt" backTo="/haunts" />
        <EmptyState
          icon={<CircleAlert size={24} />}
          title="Haunt not found"
          description="Haunt Ranker doesn't have a collection with that name."
        />
      </>
    );
  }

  const haunt = registry.haunt(resolved);
  const accent = haunt?.accent ?? "orange";
  const description = haunt?.description ?? haunt?.tagline ?? null;
  const venuesLabel = haunt?.venuesLabel ?? null;
  const name = haunt?.name ?? resolved;
  const span = seasonSpanLabel(summary);
  const coverage = reviewCoveragePercent(summary);

  return (
    <div className={`haunt-landing haunt-landing--${accent}`}>
      <PageHeader title={name} subtitle={venuesLabel ?? undefined} backTo="/haunts" />

      {isLoading ? (
        <LoadingState label={`Loading ${name}…`} />
      ) : error ? (
        <EmptyState
          icon={<CircleAlert size={24} />}
          title="Couldn't load this haunt"
          description={error}
        />
      ) : (
        <>
          <Panel elevated glow={accent} padding="lg" className="haunt-landing__intro">
            {description && <p className="haunt-landing__description">{description}</p>}
            <div className="haunt-landing__badges">
              <Badge variant="neutral">
                <CalendarDays size={11} strokeWidth={2} />
                {span ?? "No seasons yet"}
              </Badge>
              {venuesLabel && (
                <Badge variant={accent === "orange" ? "orange" : "purple"}>{venuesLabel}</Badge>
              )}
            </div>
          </Panel>

          <Panel elevated padding="lg" className="haunt-landing__panel">
            <h2 className="haunt-landing__title">Archive coverage</h2>
            <dl className="haunt-landing__figures">
              <Figure label="Seasons" value={summary.seasons} />
              <Figure
                label={registry.label("house", resolved, "many")}
                value={summary.walkthroughs}
              />
              <Figure
                label={registry.label("scare_zone", resolved, "many")}
                value={summary.scareZones}
              />
              <Figure label="Attractions" value={summary.attractions} />
            </dl>

            <div
              className="haunt-landing__coverage"
              role="progressbar"
              aria-label="Review coverage"
              aria-valuemin={0}
              aria-valuemax={summary.attractions}
              aria-valuenow={summary.reviewed}
              aria-valuetext={`${summary.reviewed} of ${summary.attractions} reviewed`}
            >
              <span
                className="haunt-landing__coverage-fill"
                style={{ width: `${coverage}%` }}
                aria-hidden="true"
              />
            </div>
            <p className="haunt-landing__sample">
              {summary.reviewed} of {summary.attractions} reviewed.
            </p>

            <div className="haunt-landing__actions">
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<DoorOpen size={15} strokeWidth={1.75} />}
                onClick={() => navigate("/houses")}
              >
                {registry.label("house", resolved, "many")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<TreePine size={15} strokeWidth={1.75} />}
                onClick={() => navigate("/scare-zones")}
              >
                {registry.label("scare_zone", resolved, "many")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={<Trophy size={15} strokeWidth={1.75} />}
                onClick={() => navigate("/rankings")}
              >
                Rankings
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate("/statistics")}
                leadingIcon={<BarChart3 size={15} strokeWidth={1.75} />}
              >
                Statistics
              </Button>
            </div>
          </Panel>

          <Panel elevated padding="lg" className="haunt-landing__panel">
            <h2 className="haunt-landing__title">Ratings</h2>
            {stats ? (
              <HauntAverages stats={stats} />
            ) : (
              <p className="haunt-landing__insufficient">
                Nothing from this haunt is in the archive yet.
              </p>
            )}
          </Panel>

          <Panel elevated padding="lg" className="haunt-landing__panel">
            <h2 className="haunt-landing__title">Seasons</h2>
            {seasons.length === 0 ? (
              <p className="haunt-landing__insufficient">No seasons on file for this haunt yet.</p>
            ) : (
              <ul className="haunt-landing__seasons">
                {seasons.map((season) => (
                  <li key={season.id}>
                    <Link to={`/years/${season.id}`}>
                      <span className="haunt-landing__season-year">{season.calendarYear}</span>
                      <span className="haunt-landing__season-name">{season.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
