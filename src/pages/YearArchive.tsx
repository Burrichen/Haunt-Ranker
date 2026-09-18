import { Calendar, DoorOpen, TreePine } from "lucide-react";
import { useParams } from "react-router-dom";
import { ArchiveCard } from "../components/archive";
import { EmptyState, LoadingState, PageHeader } from "../components/ui";
import { YearHeader, YearStatsPanel } from "../components/years";
import { useYearArchive } from "../hooks/useYearArchive";
import type { EventYear } from "../models/eventYear";
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
              rating={item.rating}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function YearArchive() {
  const { eventYearId } = useParams<{ eventYearId: string }>();
  const { isLoading, error, notFound, eventYear, artworkUrl, houses, scareZones, stats } =
    useYearArchive(eventYearId);

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
        houseCount={houses.length}
        scareZoneCount={scareZones.length}
      />

      <YearStatsPanel stats={stats} eventYear={eventYear} />

      <AttractionSection
        title="Houses"
        icon={<DoorOpen size={18} strokeWidth={1.5} />}
        items={houses}
        eventYear={eventYear}
        emptyLabel="No houses on file for this year yet."
      />

      <AttractionSection
        title="Scare Zones"
        icon={<TreePine size={18} strokeWidth={1.5} />}
        items={scareZones}
        eventYear={eventYear}
        emptyLabel="No scare zones on file for this year yet."
      />
    </div>
  );
}
