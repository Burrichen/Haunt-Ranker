import { ArrowUpDown } from "lucide-react";
import { SORT_OPTIONS, type SortOption } from "../../utils/attractionBrowser";
import { Button, Dropdown, type DropdownItem } from "../ui";

export interface SortMenuProps {
  sort: SortOption;
  onChange: (sort: SortOption) => void;
  /** "Personal Ranking" only appears once a manual ranking actually exists. */
  hasManualRanking: boolean;
}

export function SortMenu({ sort, onChange, hasManualRanking }: SortMenuProps) {
  const options = hasManualRanking
    ? SORT_OPTIONS
    : SORT_OPTIONS.filter((option) => option.value !== "manual");
  const currentLabel = SORT_OPTIONS.find((option) => option.value === sort)?.label ?? "Sort";

  const items: DropdownItem[] = options.map((option) => ({
    label: option.label,
    onSelect: () => onChange(option.value),
  }));

  return (
    <Dropdown
      align="end"
      items={items}
      trigger={
        <Button variant="secondary" leadingIcon={<ArrowUpDown size={15} strokeWidth={1.75} />}>
          {currentLabel}
        </Button>
      }
    />
  );
}
