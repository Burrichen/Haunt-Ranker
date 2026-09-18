import { Palmtree, Star, X } from "lucide-react";
import type { IpType } from "../../models/attraction";
import { RATING_RANGE_MAX, RATING_RANGE_MIN } from "../../utils/attractionBrowser";
import type {
  AttractionBrowserFilters,
  ParkFacet,
  RatedFacet,
} from "../../utils/attractionBrowser";
import { Button, FilterChip, Input } from "../ui";
import "./FilterBar.css";

export interface FilterBarProps {
  filters: AttractionBrowserFilters;
  onChange: (filters: AttractionBrowserFilters) => void;
  availableYears: number[];
  isActive: boolean;
  onClear: () => void;
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function FilterBar({
  filters,
  onChange,
  availableYears,
  isActive,
  onClear,
}: FilterBarProps) {
  const toggleYear = (year: number) => onChange({ ...filters, years: toggle(filters.years, year) });
  const toggleParkFacet = (facet: ParkFacet) =>
    onChange({ ...filters, parks: toggle(filters.parks, facet) });
  const toggleIpType = (ipType: IpType) =>
    onChange({ ...filters, ipTypes: toggle(filters.ipTypes, ipType) });
  const toggleRated = (state: RatedFacet) =>
    onChange({ ...filters, rated: toggle(filters.rated, state) });

  const handleMinChange = (value: string) => {
    const parsed = Number(value);
    onChange({ ...filters, ratingMin: Number.isFinite(parsed) ? parsed : RATING_RANGE_MIN });
  };
  const handleMaxChange = (value: string) => {
    const parsed = Number(value);
    onChange({ ...filters, ratingMax: Number.isFinite(parsed) ? parsed : RATING_RANGE_MAX });
  };

  return (
    <div className="filter-bar">
      {availableYears.length > 0 && (
        <div className="filter-bar__group">
          <span className="filter-bar__label">Year</span>
          <div className="filter-bar__chips">
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

      <div className="filter-bar__group">
        <span className="filter-bar__label">Park</span>
        <div className="filter-bar__chips">
          <FilterChip
            active={filters.parks.includes("hollywood")}
            onClick={() => toggleParkFacet("hollywood")}
            icon={<Star size={12} strokeWidth={1.75} />}
          >
            Hollywood
          </FilterChip>
          <FilterChip
            active={filters.parks.includes("orlando")}
            onClick={() => toggleParkFacet("orlando")}
            icon={<Palmtree size={12} strokeWidth={1.75} />}
          >
            Orlando
          </FilterChip>
          <FilterChip
            active={filters.parks.includes("both")}
            onClick={() => toggleParkFacet("both")}
          >
            Both Parks
          </FilterChip>
        </div>
      </div>

      <div className="filter-bar__group">
        <span className="filter-bar__label">IP</span>
        <div className="filter-bar__chips">
          <FilterChip
            active={filters.ipTypes.includes("original")}
            onClick={() => toggleIpType("original")}
          >
            Original
          </FilterChip>
          <FilterChip
            active={filters.ipTypes.includes("licensed")}
            onClick={() => toggleIpType("licensed")}
          >
            Licensed IP
          </FilterChip>
        </div>
      </div>

      <div className="filter-bar__group">
        <span className="filter-bar__label">Status</span>
        <div className="filter-bar__chips">
          <FilterChip active={filters.rated.includes("rated")} onClick={() => toggleRated("rated")}>
            Rated
          </FilterChip>
          <FilterChip
            active={filters.rated.includes("unrated")}
            onClick={() => toggleRated("unrated")}
          >
            Unrated
          </FilterChip>
        </div>
      </div>

      <div className="filter-bar__group">
        <span className="filter-bar__label">Rating</span>
        <div className="filter-bar__range">
          <Input
            type="number"
            aria-label="Minimum rating"
            min={RATING_RANGE_MIN}
            max={RATING_RANGE_MAX}
            step={0.5}
            size="sm"
            value={filters.ratingMin}
            onChange={(event) => handleMinChange(event.target.value)}
            className="filter-bar__range-input"
          />
          <span className="filter-bar__range-sep" aria-hidden="true">
            –
          </span>
          <Input
            type="number"
            aria-label="Maximum rating"
            min={RATING_RANGE_MIN}
            max={RATING_RANGE_MAX}
            step={0.5}
            size="sm"
            value={filters.ratingMax}
            onChange={(event) => handleMaxChange(event.target.value)}
            className="filter-bar__range-input"
          />
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
