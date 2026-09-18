import type { AttractionType, IpType } from "../../models/attraction";
import type { ParkId } from "../../models/park";
import type { StatisticsFilters } from "../../utils/statistics";
import { Button, Dropdown, SegmentedControl, type DropdownItem } from "../ui";

export interface StatisticsFacetsProps {
  filters: StatisticsFilters;
  onChange: (filters: StatisticsFilters) => void;
  availableYears: number[];
}

/** "all" stands in for null in the segmented controls, which need a string value. */
const ALL = "all";

const TYPE_OPTIONS = [
  { value: ALL, label: "All" },
  { value: "house", label: "Houses" },
  { value: "scare_zone", label: "Scare Zones" },
];

const PARK_OPTIONS = [
  { value: ALL, label: "All" },
  { value: "hollywood", label: "Hollywood" },
  { value: "orlando", label: "Orlando" },
];

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
          options={TYPE_OPTIONS}
          value={filters.type ?? ALL}
          onChange={(value) => onChange({ ...filters, type: toNullable<AttractionType>(value) })}
          aria-label="Attraction type"
        />
      </div>

      <div className="statistics-filters__group">
        <span className="statistics-filters__label">Park</span>
        <SegmentedControl
          options={PARK_OPTIONS}
          value={filters.park ?? ALL}
          onChange={(value) => onChange({ ...filters, park: toNullable<ParkId>(value) })}
          aria-label="Park"
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
