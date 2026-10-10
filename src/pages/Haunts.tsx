import { CircleAlert } from "lucide-react";
import { HauntCard } from "../components/haunts";
import { EmptyState, LoadingState, PageHeader } from "../components/ui";
import { useHaunts } from "../hooks/useHaunts";
import "./Haunts.css";

/**
 * The collections Haunt Ranker holds.
 *
 * Halloween Horror Nights and Knott's Scary Farm side by side, as equals: the
 * same card, the same figures, the same way in, each in its own haunt's
 * colours. Order follows the registry.
 */
export function Haunts() {
  const { isLoading, error, haunts } = useHaunts();

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
        <div className="haunts__grid">
          {haunts.map((haunt) => (
            <HauntCard key={haunt.hauntId} summary={haunt} />
          ))}
        </div>
      )}
    </div>
  );
}
