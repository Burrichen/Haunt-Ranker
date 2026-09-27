import { X } from "lucide-react";
import { useHauntScope } from "../../hooks/useHauntScope";
import { useHauntRegistry } from "../../hooks/useHauntRegistry";
import type { HauntScope } from "../../models/haunt";
import type { IpType } from "../../models/attraction";
import { RATING_RANGE_MAX, RATING_RANGE_MIN } from "../../utils/attractionBrowser";
import type {
  AttractionBrowserFilters,
  ParkFacet,
  RatedFacet,
} from "../../utils/attractionBrowser";
import { venueIconComponent } from "../archive";
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
  const { scope, setScope } = useHauntScope();
  const registry = useHauntRegistry();
  // The venues on offer are the ones the haunt in view actually runs at.
  const venues = registry.venuesFor(scope === "all" ? null : scope);
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
      {/* Haunt is a filter like any other here, but it is the app-wide
          choice underneath: narrowing the archive to one haunt is the same
          act as looking at that haunt, so there is only ever one of it. */}
      <div className="filter-bar__group">
        <span className="filter-bar__label">Haunt</span>
        <div className="filter-bar__chips">
          {registry.scopes().map((option: HauntScope) => (
            <FilterChip key={option} active={scope === option} onClick={() => setScope(option)}>
              {registry.scopeLabel(option, option === "all" ? "full" : "short")}
            </FilterChip>
          ))}
        </div>
      </div>

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
        <span className="filter-bar__label">Venue</span>
        <div className="filter-bar__chips">
          {/* One chip per venue the haunt in view actually runs at — read
              from the venues themselves, so an imported haunt's venues
              appear here without this file knowing their names. */}
          {venues.map((venue) => {
            const Icon = venueIconComponent(venue.icon);
            return (
              <FilterChip
                key={venue.id}
                active={filters.parks.includes(venue.id)}
                onClick={() => toggleParkFacet(venue.id)}
                icon={<Icon size={12} strokeWidth={1.75} />}
              >
                {venue.name}
              </FilterChip>
            );
          })}
          {/* "Both" only means something where there are two to be at. */}
          {venues.length > 1 && (
            <FilterChip
              active={filters.parks.includes("both")}
              onClick={() => toggleParkFacet("both")}
            >
              More than one
            </FilterChip>
          )}
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
