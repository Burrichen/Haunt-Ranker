import { BarChart3, Calendar, CircleAlert, DoorOpen, TreePine, Trophy } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { ArchiveCard } from "../components/archive";
import { EmptyState, LoadingState, Panel } from "../components/ui";
import { useArchiveOverview } from "../hooks/useArchiveOverview";
import "./Home.css";

interface NavTile {
  to: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}

const NAV_TILES: NavTile[] = [
  {
    to: "/houses",
    label: "Explore Houses",
    description: "Every haunted house, ready to explore.",
    icon: DoorOpen,
  },
  {
    to: "/scare-zones",
    label: "Scare Zones",
    description: "Outdoor scares across every event.",
    icon: TreePine,
  },
  {
    to: "/years",
    label: "Years",
    description: "Browse by Halloween Horror Nights year.",
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
  const { isLoading, error, summary, spotlight } = useArchiveOverview();

  return (
    <div className="home">
      <Panel elevated glow="orange" padding="lg" className="home__hero">
        <h1 className="home__hero-title">Haunt Ranker</h1>
        <p className="home__hero-subtitle">Your Halloween Horror Nights archive.</p>
      </Panel>

      <nav className="home__nav-grid" aria-label="Primary sections">
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

      <ArchiveBody isLoading={isLoading} error={error} summary={summary} spotlight={spotlight} />
    </div>
  );
}

function ArchiveBody({
  isLoading,
  error,
  summary,
  spotlight,
}: ReturnType<typeof useArchiveOverview>) {
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
            description="Houses and scare zones will appear here once they've been added."
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
        <ProgressStat value={summary.houses} label="Houses" />
        <ProgressStat value={summary.scareZones} label="Scare Zones" />
        <ProgressStat value={summary.reviewed} label="Reviewed" />
      </section>
    </>
  );
}
