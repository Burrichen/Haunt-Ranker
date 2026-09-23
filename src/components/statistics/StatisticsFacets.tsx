import type { AttractionType, IpType } from "../../models/attraction";
import { useHauntScope } from "../../hooks/useHauntScope";
import {
  attractionTypeLabel,
  HAUNT_SCOPES,
  hauntScopeLabel,
  type HauntScope,
} from "../../models/haunt";
import { HAUNT_VENUES, PARK_IDS, type ParkId } from "../../models/park";
import type { StatisticsFilters } from "../../utils/statistics";
import { PARK_NAMES } from "../archive";
import { Button, Dropdown, SegmentedControl, type DropdownItem } from "../ui";

export interface StatisticsFacetsProps {
  filters: StatisticsFilters;
  onChange: (filters: StatisticsFilters) => void;
  availableYears: number[];
}

/** "all" stands in for null in the segmented controls, which need a string value. */
const ALL = "all";

const HAUNT_OPTIONS = HAUNT_SCOPES.map((option: HauntScope) => ({
  value: option,
  label: hauntScopeLabel(option, option === "all" ? "full" : "short"),
}));

/** Only the venues the haunt in view actually runs at. */
function venueOptions(scope: HauntScope) {
  const venues =
    scope === "all"
      ? [PARK_IDS.hollywood, PARK_IDS.orlando, PARK_IDS.knottsBerryFarm]
      : HAUNT_VENUES[scope];
  return [
    { value: ALL, label: "All" },
    ...venues.map((venue) => ({ value: venue, label: PARK_NAMES[venue] })),
  ];
}

const IP_OPTIONS = [
  { value: ALL, label: "All" },
  { value: "original", label: "Original" },
  { value: "licensed", label: "Licensed" },
];

function toNullable<T extends string>(value: string): T | null {
  return value === ALL ? null : (value as T);
}

/**
 * The four facets the dashboard and the explorer both slice by. Shared so the
 * two control bars can't drift into offering different filters or meaning
 * different things by them.
 */
export function StatisticsFacets({ filters, onChange, availableYears }: StatisticsFacetsProps) {
  const { scope, setScope, hauntId } = useHauntScope();

  const typeOptions = [
    { value: ALL, label: "All" },
    { value: "house", label: attractionTypeLabel("house", hauntId, "many") },
    { value: "scare_zone", label: attractionTypeLabel("scare_zone", hauntId, "many") },
  ];

  const yearItems: DropdownItem[] = [
    { label: "All years", onSelect: () => onChange({ ...filters, year: null }) },
    ...availableYears.map((year) => ({
      label: String(year),
      onSelect: () => onChange({ ...filters, year }),
    })),
  ];

  return (
    <>
      <div className="statistics-filters__group">
        <span className="statistics-filters__label">Haunt</span>
        <SegmentedControl
          options={HAUNT_OPTIONS}
          value={scope}
          onChange={(value: HauntScope) => {
            // Venues belong to a haunt, so a venue filter from the other one
            // would leave the dashboard showing nothing at all.
            setScope(value);
            onChange({ ...filters, park: null });
          }}
          aria-label="Haunt"
        />
      </div>

      <div className="statistics-filters__group">
        <span className="statistics-filters__label">Year</span>
        <Dropdown
          items={yearItems}
          trigger={
            <Button variant="secondary" size="sm">
              {filters.year === null ? "All years" : String(filters.year)}
            </Button>
          }
        />
      </div>

      <div className="statistics-filters__group">
        <span className="statistics-filters__label">Type</span>
        <SegmentedControl
          options={typeOptions}
          value={filters.type ?? ALL}
          onChange={(value) => onChange({ ...filters, type: toNullable<AttractionType>(value) })}
          aria-label="Attraction type"
        />
      </div>

      <div className="statistics-filters__group">
        <span className="statistics-filters__label">Venue</span>
        <SegmentedControl
          options={venueOptions(scope)}
          value={filters.park ?? ALL}
          onChange={(value) => onChange({ ...filters, park: toNullable<ParkId>(value) })}
          aria-label="Venue"
        />
      </div>

      <div className="statistics-filters__group">
        <span className="statistics-filters__label">IP</span>
        <SegmentedControl
          options={IP_OPTIONS}
          value={filters.ipType ?? ALL}
          onChange={(value) => onChange({ ...filters, ipType: toNullable<IpType>(value) })}
          aria-label="IP classification"
        />
      </div>
    </>
  );
}
