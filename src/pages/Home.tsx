import { BarChart3, Calendar, CircleAlert, DoorOpen, Search, Trophy } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { ArchiveCard } from "../components/archive";
import { EmptyState, LoadingState, Panel } from "../components/ui";
import { useArchiveOverview, type HauntArchiveSummary } from "../hooks/useArchiveOverview";
import { useHauntScope } from "../hooks/useHauntScope";
import { attractionTypeLabel, HAUNT_IDS, HAUNT_NAMES, type HauntId } from "../models/haunt";
import "./Home.css";

interface NavTile {
  to: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

/**
 * What each haunt's entry point says about itself, beyond its figures.
 *
 * Written rather than generated, and deliberately the same weight for both:
 * one archive is not the subject with the other appended to it.
 */
const HAUNT_ENTRIES: Record<HauntId, { tagline: string; accent: "orange" | "purple" }> = {
  [HAUNT_IDS.hhn]: {
    tagline: "Universal's Halloween event, at Hollywood and Orlando.",
    accent: "orange",
  },
  [HAUNT_IDS.knotts]: {
    tagline: "The Halloween event at Knott's Berry Farm, Buena Park.",
    accent: "purple",
  },
};

const NAV_TILES: NavTile[] = [
  {
    to: "/years",
    label: "Years",
    description: "Every season, haunt by haunt.",
    icon: Calendar,
  },
  {
    to: "/rankings",
    label: "Rankings",
    description: "See how your favorites stack up.",
    icon: Trophy,
  },
  {
    to: "/statistics",
    label: "Statistics",
    description: "Insights across your ratings.",
    icon: BarChart3,
  },
];

function ProgressStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="home__stat">
      <span className="home__stat-value">{value}</span>
      <span className="home__stat-label">{label}</span>
    </div>
  );
}

/**
 * One haunt's way in. Choosing it sets the haunt the rest of the app is
 * looking at, so the archive it opens keeps its own vocabulary — Houses at
 * HHN, Mazes at Knott's — rather than the reader having to set that twice.
 */
function HauntEntry({ summary }: { summary: HauntArchiveSummary }) {
  const { setScope } = useHauntScope();
  const { hauntId, attractions, seasons, reviewed, firstYear, lastYear } = summary;
  const { tagline, accent } = HAUNT_ENTRIES[hauntId];
  const isEmpty = attractions === 0;

  return (
    <Link
      to="/houses"
      className="home__haunt-link"
      onClick={() => setScope(hauntId)}
      aria-label={`Open the ${HAUNT_NAMES[hauntId].name} archive`}
    >
      <Panel elevated padding="lg" glow={accent} className={`home__haunt home__haunt--${accent}`}>
        <span className="home__haunt-eyebrow">Archive</span>
        <h2 className="home__haunt-name">{HAUNT_NAMES[hauntId].name}</h2>
        <p className="home__haunt-tagline">{tagline}</p>

        {isEmpty ? (
          // Said plainly rather than dressed up: an archive nobody has
          // entered yet is a fact about the data, not a smaller haunt.
          <p className="home__haunt-empty">Archive not yet entered.</p>
        ) : (
          <dl className="home__haunt-figures">
            <div>
              <dt>Attractions</dt>
              <dd>{attractions}</dd>
            </div>
            <div>
              <dt>Seasons</dt>
              <dd>{seasons}</dd>
            </div>
            <div>
              <dt>Reviewed</dt>
              <dd>{reviewed}</dd>
            </div>
          </dl>
        )}

        {firstYear !== null && lastYear !== null && (
          <p className="home__haunt-span">
            {firstYear === lastYear ? firstYear : `${firstYear}–${lastYear}`}
          </p>
        )}
      </Panel>
    </Link>
  );
}

export function Home() {
  const { isLoading, error, summary, haunts, spotlight } = useArchiveOverview();
  const { setScope, hauntId } = useHauntScope();

  return (
    <div className="home">
      <Panel elevated glow="orange" padding="lg" className="home__hero">
        <h1 className="home__hero-title">Haunt Ranker</h1>
        <p className="home__hero-subtitle">
          Two Halloween archives — Halloween Horror Nights and Knott's Scary Farm — to browse,
          review and rank.
        </p>
      </Panel>

      <section className="home__haunts" aria-label="Haunts">
        {haunts.map((haunt) => (
          <HauntEntry key={haunt.hauntId} summary={haunt} />
        ))}
      </section>

      <nav className="home__nav-grid" aria-label="Primary sections">
        <Link
          to="/houses"
          className="home__nav-tile-link"
          onClick={() => setScope("all")}
          key="all-haunts"
        >
          <Panel elevated padding="md" className="home__nav-tile">
            <div className="home__nav-tile-icon">
              <Search size={26} strokeWidth={1.5} />
            </div>
            <h2 className="home__nav-tile-title">Search the whole archive</h2>
            <p className="home__nav-tile-description">
              {attractionTypeLabel("house", null, "many")} and{" "}
              {attractionTypeLabel("scare_zone", null, "many").toLowerCase()} from both haunts.
            </p>
          </Panel>
        </Link>
        {NAV_TILES.map((tile) => {
          const Icon = tile.icon;
          return (
            <Link key={tile.to} to={tile.to} className="home__nav-tile-link">
              <Panel elevated padding="md" className="home__nav-tile">
                <div className="home__nav-tile-icon">
                  <Icon size={26} strokeWidth={1.5} />
                </div>
                <h2 className="home__nav-tile-title">{tile.label}</h2>
                <p className="home__nav-tile-description">{tile.description}</p>
              </Panel>
            </Link>
          );
        })}
      </nav>

      <ArchiveBody
        isLoading={isLoading}
        error={error}
        summary={summary}
        hauntId={hauntId}
        spotlight={spotlight}
      />
    </div>
  );
}

function ArchiveBody({
  isLoading,
  error,
  summary,
  hauntId,
  spotlight,
}: Pick<ReturnType<typeof useArchiveOverview>, "isLoading" | "error" | "summary" | "spotlight"> & {
  hauntId: HauntId | null;
}) {
  if (error) {
    return (
      <EmptyState
        icon={<CircleAlert size={24} />}
        title="Couldn't load the archive"
        description={error}
      />
    );
  }

  if (isLoading) {
    return <LoadingState label="Loading the archive…" />;
  }

  return (
    <>
      <section className="home__section" aria-labelledby="home-spotlight-heading">
        <h2 id="home-spotlight-heading" className="home__section-title">
          From the Archive
        </h2>
        {spotlight.length === 0 ? (
          <EmptyState
            icon={<DoorOpen size={24} />}
            title="Nothing in the archive yet"
            description="Attractions will appear here once they've been added."
          />
        ) : (
          <div className="home__spotlight-grid">
            {spotlight.map((item) => (
              <ArchiveCard
                key={item.attraction.id}
                attraction={item.attraction}
                eventYear={item.eventYear}
                posterUrl={item.posterUrl}
                rating={item.rating}
              />
            ))}
          </div>
        )}
      </section>

      <section className="home__progress" aria-label="Archive progress">
        <ProgressStat value={summary.totalAttractions} label="Attractions" />
        <ProgressStat
          value={summary.houses}
          label={attractionTypeLabel("house", hauntId, "many")}
        />
        <ProgressStat
          value={summary.scareZones}
          label={attractionTypeLabel("scare_zone", hauntId, "many")}
        />
        <ProgressStat value={summary.reviewed} label="Reviewed" />
      </section>
    </>
  );
}
