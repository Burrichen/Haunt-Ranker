import { BarChart3, Calendar, CircleAlert, DoorOpen, Search, Trophy } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { ArchiveCard } from "../components/archive";
import { HauntCard } from "../components/haunts";
import { EmptyState, LoadingState, Panel } from "../components/ui";
import { useArchiveOverview } from "../hooks/useArchiveOverview";
import { useHauntScope } from "../hooks/useHauntScope";
import { useHauntRegistry } from "../hooks/useHauntRegistry";
import type { HauntId } from "../models/haunt";
import "./Home.css";

interface NavTile {
  to: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

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

export function Home() {
  const { isLoading, error, summary, haunts, spotlight } = useArchiveOverview();
  const { setScope, hauntId } = useHauntScope();
  const registry = useHauntRegistry();

  const names = registry.haunts.map((haunt) => haunt.name);

  return (
    <div className="home">
      <header className="home__intro">
        <h1 className="home__title">Haunt Ranker</h1>
        {names.length > 0 && (
          <p className="home__subtitle">
            {names.join(" and ")} — every walk-through, rated and ranked.
          </p>
        )}
      </header>

      {/* The collections side by side, as equals, each in its own haunt's
          colours. Order follows the registry; neither is "the other one". */}
      {haunts.length > 0 && (
        <section className="home__collections" aria-label="Collections">
          {haunts.map((haunt) => (
            <HauntCard key={haunt.hauntId} summary={haunt} />
          ))}
        </section>
      )}

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
            <h2 className="home__nav-tile-title">Search every haunt</h2>
            <p className="home__nav-tile-description">
              {registry.label("house", null, "many")} from every collection.
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
  const registry = useHauntRegistry();

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
                posterFit={item.posterFit}
                rating={item.rating}
              />
            ))}
          </div>
        )}
      </section>

      <section className="home__progress" aria-label="Archive progress">
        <ProgressStat value={summary.houses} label={registry.label("house", hauntId, "many")} />
        <ProgressStat value={summary.seasons} label="Seasons" />
        <ProgressStat value={summary.reviewed} label="Reviewed" />
      </section>
    </>
  );
}
