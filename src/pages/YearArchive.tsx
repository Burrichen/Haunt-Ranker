import { Calendar, DoorOpen } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ArchiveCard } from "../components/archive";
import { EmptyState, LoadingState, PageHeader } from "../components/ui";
import { YearHeader, YearStatsPanel } from "../components/years";
import { useYearArchive } from "../hooks/useYearArchive";
import type { EventYear } from "../models/eventYear";
import { useHauntRegistry } from "../hooks/useHauntRegistry";
import type { SeasonLineage } from "../utils/seasonLineage";
import type { YearAttraction } from "../utils/years";
import "./YearArchive.css";

function AttractionSection({
  title,
  icon,
  items,
  eventYear,
  emptyLabel,
}: {
  title: string;
  icon: React.ReactNode;
  items: YearAttraction[];
  eventYear: EventYear;
  emptyLabel: string;
}) {
  return (
    <section className="year-archive__section" aria-label={title}>
      <h2 className="year-archive__section-title">
        <span aria-hidden="true" className="year-archive__section-icon">
          {icon}
        </span>
        {title}
        <span className="year-archive__section-count">{items.length}</span>
      </h2>
      {items.length === 0 ? (
        <p className="year-archive__section-empty">{emptyLabel}</p>
      ) : (
        <div className="year-archive__grid">
          {items.map((item) => (
            <ArchiveCard
              key={item.attraction.id}
              attraction={item.attraction}
              eventYear={eventYear}
              posterUrl={item.posterUrl}
              posterFit={item.posterFit}
              rating={item.rating}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * What was new in a season and what came back.
 *
 * Only shown for a haunt whose attractions return — at HHN a house belongs
 * to its year and the question doesn't arise. A compact list rather than
 * another grid of cards: the season's full line-up is below, and this is a
 * different question about the same records, not a second copy of them.
 */
function SeasonLineageSections({ lineage }: { lineage: SeasonLineage<YearAttraction> }) {
  const { newThisYear, returning, isIncomplete } = lineage;

  if (newThisYear.length === 0 && returning.length === 0 && !isIncomplete) {
    return null;
  }

  return (
    <section className="year-archive__lineage" aria-label="New and returning">
      <div>
        <h2 className="year-archive__lineage-title">New This Year</h2>
        {newThisYear.length > 0 ? (
          <ul className="year-archive__lineage-list">
            {newThisYear.map((item) => (
              <li key={item.attraction.id}>
                <Link to={`/attractions/${item.attraction.id}`}>{item.attraction.name}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="year-archive__lineage-note">
            Debut years for this season have not been recorded yet.
          </p>
        )}
      </div>

      <div>
        <h2 className="year-archive__lineage-title">Returning</h2>
        {returning.length > 0 ? (
          <ul className="year-archive__lineage-list">
            {returning.map((item) => (
              <li key={item.attraction.id}>
                <Link to={`/attractions/${item.attraction.id}`}>{item.attraction.name}</Link>
              </li>
            ))}
          </ul>
        ) : null}
        {/* Said rather than filled in. An attraction the archive can't place
            is not evidence that it was new. */}
        {isIncomplete && (
          <p className="year-archive__lineage-note">
            Returning attraction archive not yet complete
          </p>
        )}
      </div>
    </section>
  );
}

export function YearArchive() {
  const { eventYearId } = useParams<{ eventYearId: string }>();
  const { isLoading, error, notFound, eventYear, artworkUrl, artworkFit, houses, lineage, stats } =
    useYearArchive(eventYearId);
  const registry = useHauntRegistry();

  if (isLoading) {
    return <LoadingState label="Loading year…" />;
  }

  if (error || notFound || !eventYear || !stats) {
    return (
      <>
        <PageHeader title="Year" backTo="/years" />
        <EmptyState
          icon={<Calendar size={24} />}
          title="Year not found"
          description={error ?? "This event year may have been removed."}
        />
      </>
    );
  }

  return (
    <div className="year-archive">
      <YearHeader
        eventYear={eventYear}
        artworkUrl={artworkUrl}
        artworkFit={artworkFit}
        houseCount={houses.length}
      />

      <YearStatsPanel stats={stats} eventYear={eventYear} />

      {/* Knott's attractions return year after year, so a season is read as
          what was new and what came back. */}
      {lineage.tracksReturning && <SeasonLineageSections lineage={lineage} />}

      <AttractionSection
        title={registry.label("house", eventYear.hauntId, "many")}
        icon={<DoorOpen size={18} strokeWidth={1.5} />}
        items={houses}
        eventYear={eventYear}
        emptyLabel={`No ${registry.label("house", eventYear.hauntId, "many").toLowerCase()} on file for this year yet.`}
      />
    </div>
  );
}
