import { CircleAlert } from "lucide-react";
import { HauntCard } from "../components/haunts";
import { EmptyState, LoadingState, PageHeader } from "../components/ui";
import { useHaunts } from "../hooks/useHaunts";
import { HAUNT_IDS } from "../models/haunt";
import "./Haunts.css";

/**
 * The collections Haunt Ranker holds.
 *
 * Halloween Horror Nights leads, because it is the collection the app was
 * built around and the one it opens on. What follows is not a lesser tier:
 * the same card, the same figures, the same way in — set out below the
 * home collection rather than beside it.
 */
export function Haunts() {
  const { isLoading, error, haunts } = useHaunts();

  const featured = haunts.find((haunt) => haunt.hauntId === HAUNT_IDS.hhn);
  const others = haunts.filter((haunt) => haunt.hauntId !== HAUNT_IDS.hhn);

  return (
    <div className="haunts">
      <PageHeader
        title="Haunts"
        subtitle="The collections in the archive, and what each one holds."
      />

      {isLoading ? (
        <LoadingState label="Loading haunts…" />
      ) : error ? (
        <EmptyState
          icon={<CircleAlert size={24} />}
          title="Couldn't load the haunts"
          description={error}
        />
      ) : (
        <>
          {featured && <HauntCard summary={featured} featured />}

          {others.length > 0 && (
            <section className="haunts__others" aria-label="Other haunts">
              <h2 className="haunts__section-title">Other Haunts</h2>
              <div className="haunts__grid">
                {others.map((haunt) => (
                  <HauntCard key={haunt.hauntId} summary={haunt} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
