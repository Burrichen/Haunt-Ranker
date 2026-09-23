import { CircleAlert, DoorOpen, LayoutGrid, Rows3, TreePine } from "lucide-react";
import { useAttractionBrowser } from "../../hooks/useAttractionBrowser";
import { useHauntScope } from "../../hooks/useHauntScope";
import { useAttractionViewMode } from "../../hooks/useAttractionViewMode";
import type { AttractionType } from "../../models/attraction";
import { attractionTypeLabel } from "../../models/haunt";
import { ArchiveCard } from "../archive";
import { EmptyState, LoadingState, SearchInput, SegmentedControl } from "../ui";
import { AttractionRow } from "./AttractionRow";
import { FilterBar } from "./FilterBar";
import { SortMenu } from "./SortMenu";
import "./AttractionBrowser.css";

export interface AttractionBrowserProps {
  attractionType: AttractionType;
}

const TYPE_ICON: Record<AttractionType, typeof DoorOpen> = {
  house: DoorOpen,
  scare_zone: TreePine,
};

/**
 * Shared browsing UI for both Houses and Scare Zones: search, filters,
 * sort, a saved view mode, and either a poster grid or a compact list —
 * driven by `useAttractionBrowser`, which owns the data and keeps
 * filter/sort state in the URL.
 */
export function AttractionBrowser({ attractionType }: AttractionBrowserProps) {
  const {
    isLoading,
    error,
    rows,
    availableYears,
    hasManualRanking,
    filters,
    setFilters,
    sort,
    setSort,
    clearFilters,
    areFiltersActive,
  } = useAttractionBrowser(attractionType);
  const [viewMode, setViewMode] = useAttractionViewMode();
  const { hauntId } = useHauntScope();

  // Whatever the haunt in view calls them: houses, mazes, or both.
  const nounPlural = attractionTypeLabel(attractionType, hauntId, "many").toLowerCase();
  const TypeIcon = TYPE_ICON[attractionType];

  if (error) {
    return (
      <EmptyState
        icon={<CircleAlert size={24} />}
        title="Couldn't load the archive"
        description={error}
      />
    );
  }

  return (
    <div className="attraction-browser">
      <div className="attraction-browser__toolbar">
        <SearchInput
          placeholder="Search by name or franchise…"
          value={filters.query}
          onChange={(event) => setFilters({ ...filters, query: event.target.value })}
          onClear={() => setFilters({ ...filters, query: "" })}
          className="attraction-browser__search"
        />
        <div className="attraction-browser__toolbar-actions">
          <SortMenu sort={sort} onChange={setSort} hasManualRanking={hasManualRanking} />
          <SegmentedControl
            aria-label="View mode"
            value={viewMode}
            onChange={setViewMode}
            options={[
              { value: "card", label: "Card", icon: <LayoutGrid size={15} strokeWidth={1.75} /> },
              { value: "compact", label: "Compact", icon: <Rows3 size={15} strokeWidth={1.75} /> },
            ]}
          />
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        availableYears={availableYears}
        isActive={areFiltersActive}
        onClear={clearFilters}
      />

      {isLoading ? (
        <LoadingState label={`Loading ${nounPlural}…`} />
      ) : rows.length === 0 ? (
        // No separate "clear filters" action here when filtered empty — the
        // filter bar above already has one visible, so a second identical
        // button right below it would just be noise.
        <EmptyState
          icon={<TypeIcon size={24} />}
          title={areFiltersActive ? "No matches" : `No ${nounPlural} yet`}
          description={
            areFiltersActive
              ? "Try adjusting or clearing your filters."
              : `${nounPlural.charAt(0).toUpperCase()}${nounPlural.slice(1)} will appear here once they've been added.`
          }
        />
      ) : (
        <>
          <p className="attraction-browser__count">
            {rows.length} {rows.length === 1 ? "result" : "results"}
          </p>
          {viewMode === "card" ? (
            <div className="attraction-browser__grid">
              {rows.map((row) => (
                <ArchiveCard
                  key={row.attraction.id}
                  attraction={row.attraction}
                  eventYear={row.eventYear}
                  posterUrl={row.posterUrl}
                  rating={row.rating}
                />
              ))}
            </div>
          ) : (
            <div className="attraction-browser__list">
              {rows.map((row) => (
                <AttractionRow key={row.attraction.id} row={row} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
