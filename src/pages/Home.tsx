import { BarChart3, Calendar, CircleAlert, DoorOpen, Search, Trophy } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { ArchiveCard } from "../components/archive";
import { EmptyState, LoadingState, Panel } from "../components/ui";
import { useArchiveOverview } from "../hooks/useArchiveOverview";
import { useHauntScope } from "../hooks/useHauntScope";
import { useHauntRegistry } from "../hooks/useHauntRegistry";
import type { HauntId } from "../models/haunt";
import { seasonSpanLabel, type HauntArchiveSummary } from "../utils/haunts";
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

/**
 * A secondary collection, offered without ceremony.
 *
 * Small, factual and in the app's own language — not a brand tile. Opening
 * it makes that haunt the one in view, so the archive it leads to already
 * calls its attractions what that haunt calls them.
 */
function OtherHauntRow({ summary }: { summary: HauntArchiveSummary }) {
  const { setScope } = useHauntScope();
  const registry = useHauntRegistry();
  const hauntId: HauntId = summary.hauntId;
  const haunt = registry.haunt(hauntId);
  const tagline = haunt?.tagline ?? null;
  const accent = haunt?.accent ?? "purple";
  const name = haunt?.name ?? hauntId;
  const span = seasonSpanLabel(summary);

  return (
    <Link
      to={`/haunts/${hauntId}`}
      className="home__other-link"
      onClick={() => setScope(hauntId)}
      aria-label={`Open the ${name} archive`}
    >
      <Panel elevated padding="md" className={`home__other home__other--${accent}`}>
        <h3 className="home__other-name">{name}</h3>
        {tagline && <p className="home__other-tagline">{tagline}</p>}
        <p className="home__other-figures">
          {summary.attractions === 0
            ? "Archive not yet entered."
            : `${summary.attractions} attractions · ${summary.seasons} seasons${span ? ` · ${span}` : ""}`}
        </p>
      </Panel>
    </Link>
  );
}

export function Home() {
  const { isLoading, error, summary, haunts, spotlight } = useArchiveOverview();
  const { setScope, hauntId } = useHauntScope();
  const registry = useHauntRegistry();

  // The home collection is whichever haunt sorts first — the app's own
  // by default, and still a data decision rather than a hard-coded one.
  const homeHauntId = registry.haunts[0]?.id ?? haunts[0]?.hauntId ?? null;
  const home = haunts.find((haunt) => haunt.hauntId === homeHauntId);
  const others = haunts.filter((haunt) => haunt.hauntId !== homeHauntId);
  const homeName = registry.hauntName(homeHauntId) ?? "Haunt Ranker";
  const homeSpan = home ? seasonSpanLabel(home) : null;

  return (
    <div className="home">
      {/* Halloween Horror Nights leads, because it is what Haunt Ranker is
          for. The other collections follow it rather than crowding it. */}
      <Link
        to={homeHauntId ? `/haunts/${homeHauntId}` : "/haunts"}
        className="home__hero-link"
        onClick={() => homeHauntId && setScope(homeHauntId)}
        aria-label={`Open the ${homeName} archive`}
      >
        <Panel elevated glow="orange" padding="lg" className="home__hero">
          <span className="home__hero-eyebrow">Haunt Ranker</span>
          <h1 className="home__hero-title">{homeName}</h1>
          <p className="home__hero-subtitle">
            {registry.haunt(homeHauntId)?.tagline}
            {home && home.attractions > 0 && (
              <>
                {" "}
                {home.attractions} attractions across {home.seasons} seasons
                {homeSpan ? `, ${homeSpan}` : ""}.
              </>
            )}
          </p>
        </Panel>
      </Link>

      {others.length > 0 && (
        <section className="home__others" aria-label="Other haunts">
          <div className="home__others-head">
            <h2 className="home__section-title">Other Haunts</h2>
            <Link to="/haunts" className="home__others-all">
              All haunts
            </Link>
          </div>
          <div className="home__others-grid">
            {others.map((haunt) => (
              <OtherHauntRow key={haunt.hauntId} summary={haunt} />
            ))}
          </div>
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
              {registry.label("house", null, "many")} and{" "}
              {registry.label("scare_zone", null, "many").toLowerCase()} from every collection.
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
                rating={item.rating}
              />
            ))}
          </div>
        )}
      </section>

      <section className="home__progress" aria-label="Archive progress">
        <ProgressStat value={summary.totalAttractions} label="Attractions" />
        <ProgressStat value={summary.houses} label={registry.label("house", hauntId, "many")} />
        <ProgressStat
          value={summary.scareZones}
          label={registry.label("scare_zone", hauntId, "many")}
        />
        <ProgressStat value={summary.reviewed} label="Reviewed" />
      </section>
    </>
  );
}
