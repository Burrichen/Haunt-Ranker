import { ArrowUpDown } from "lucide-react";
import {
  RANKING_DIRECTIONS,
  RANKING_METRICS,
  rankingSortLabel,
  type RankingSort,
} from "../../utils/rankings";
import { Button, Dropdown, type DropdownItem } from "../ui";

export interface RankingSortMenuProps {
  sort: RankingSort;
  onChange: (sort: RankingSort) => void;
  /** Manual order is the user's own; a metric sort would have nothing to apply to. */
  disabled: boolean;
}

const SORT_OPTIONS: RankingSort[] = RANKING_METRICS.flatMap((metric) =>
  RANKING_DIRECTIONS.map((direction) => ({ metric, direction })),
);

export function RankingSortMenu({ sort, onChange, disabled }: RankingSortMenuProps) {
  const trigger = (
    <Button
      variant="secondary"
      disabled={disabled}
      leadingIcon={<ArrowUpDown size={15} strokeWidth={1.75} />}
    >
      {disabled ? "My Ranking order" : rankingSortLabel(sort)}
    </Button>
  );

  if (disabled) {
    return trigger;
  }

  const items: DropdownItem[] = SORT_OPTIONS.map((option) => ({
    label: rankingSortLabel(option),
    onSelect: () => onChange(option),
  }));

  return <Dropdown align="end" items={items} trigger={trigger} />;
}
