import { Palmtree, Star, X } from "lucide-react";
import type { AttractionType, IpType } from "../../models/attraction";
import type { ParkFacet } from "../../utils/attractionBrowser";
import type { RankingFilters } from "../../utils/rankings";
import { Button, FilterChip } from "../ui";
import "./RankingFilterBar.css";

export interface RankingFilterBarProps {
  filters: RankingFilters;
  onChange: (filters: RankingFilters) => void;
  availableYears: number[];
  /** The type filter only appears for the All Attractions group, where the list actually mixes types. */
  showTypeFilter: boolean;
  isActive: boolean;
  onClear: () => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function RankingFilterBar({
  filters,
  onChange,
  availableYears,
  showTypeFilter,
  isActive,
  onClear,
}: RankingFilterBarProps) {
  const toggleYear = (year: number) => onChange({ ...filters, years: toggle(filters.years, year) });
  const toggleType = (type: AttractionType) =>
    onChange({ ...filters, types: toggle(filters.types, type) });
  const togglePark = (facet: ParkFacet) =>
    onChange({ ...filters, parks: toggle(filters.parks, facet) });
  const toggleIp = (ipType: IpType) =>
    onChange({ ...filters, ipTypes: toggle(filters.ipTypes, ipType) });

  return (
    <div className="ranking-filter-bar">
      {availableYears.length > 0 && (
        <div className="ranking-filter-bar__group">
          <span className="ranking-filter-bar__label">Year</span>
          <div className="ranking-filter-bar__chips">
            {availableYears.map((year) => (
              <FilterChip
                key={year}
                active={filters.years.includes(year)}
                onClick={() => toggleYear(year)}
              >
                {year}
              </FilterChip>
            ))}
          </div>
        </div>
      )}

      {showTypeFilter && (
        <div className="ranking-filter-bar__group">
          <span className="ranking-filter-bar__label">Type</span>
          <div className="ranking-filter-bar__chips">
            <FilterChip
              active={filters.types.includes("house")}
              onClick={() => toggleType("house")}
            >
              Houses
            </FilterChip>
            <FilterChip
              active={filters.types.includes("scare_zone")}
              onClick={() => toggleType("scare_zone")}
            >
              Scare Zones
            </FilterChip>
          </div>
        </div>
      )}

      <div className="ranking-filter-bar__group">
        <span className="ranking-filter-bar__label">Park</span>
        <div className="ranking-filter-bar__chips">
          <FilterChip
            active={filters.parks.includes("hollywood")}
            onClick={() => togglePark("hollywood")}
            icon={<Star size={12} strokeWidth={1.75} />}
          >
            Hollywood
          </FilterChip>
          <FilterChip
            active={filters.parks.includes("orlando")}
            onClick={() => togglePark("orlando")}
            icon={<Palmtree size={12} strokeWidth={1.75} />}
          >
            Orlando
          </FilterChip>
          <FilterChip active={filters.parks.includes("both")} onClick={() => togglePark("both")}>
            Both Parks
          </FilterChip>
        </div>
      </div>

      <div className="ranking-filter-bar__group">
        <span className="ranking-filter-bar__label">IP</span>
        <div className="ranking-filter-bar__chips">
          <FilterChip
            active={filters.ipTypes.includes("original")}
            onClick={() => toggleIp("original")}
          >
            Original
          </FilterChip>
          <FilterChip
            active={filters.ipTypes.includes("licensed")}
            onClick={() => toggleIp("licensed")}
          >
            Licensed IP
          </FilterChip>
        </div>
      </div>

      {isActive && (
        <Button variant="ghost" size="sm" leadingIcon={<X size={14} />} onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
