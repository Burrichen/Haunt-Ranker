import {
  RANKING_DIRECTIONS,
  RANKING_METRICS,
  type RankingDirection,
  type RankingMetric,
} from "./rankings";
import { DEFAULT_YEAR_SORT, type YearRankingSort } from "./years";

/** The Years page shows either the archive of year cards or the year ranking. */
export type YearsView = "overview" | "rankings";

const VIEWS: readonly YearsView[] = ["overview", "rankings"];

export const DEFAULT_YEARS_VIEW: YearsView = "overview";

export interface YearsParams {
  view: YearsView;
  sort: YearRankingSort;
}

export const DEFAULT_YEARS_PARAMS: YearsParams = {
  view: DEFAULT_YEARS_VIEW,
  sort: DEFAULT_YEAR_SORT,
};

function parseOne<T extends string>(raw: string | null, allowed: readonly T[]): T | null {
  return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

export function parseYearsParams(params: URLSearchParams): YearsParams {
  return {
    view: parseOne<YearsView>(params.get("view"), VIEWS) ?? DEFAULT_YEARS_VIEW,
    sort: {
      metric:
        parseOne<RankingMetric>(params.get("metric"), RANKING_METRICS) ?? DEFAULT_YEAR_SORT.metric,
      direction:
        parseOne<RankingDirection>(params.get("dir"), RANKING_DIRECTIONS) ??
        DEFAULT_YEAR_SORT.direction,
    },
  };
}

/** The inverse — only writes what differs from the defaults, for tidy URLs. */
export function yearsParamsToSearchParams({ view, sort }: YearsParams): URLSearchParams {
  const params = new URLSearchParams();

  if (view !== DEFAULT_YEARS_VIEW) {
    params.set("view", view);
  }
  if (sort.metric !== DEFAULT_YEAR_SORT.metric) {
    params.set("metric", sort.metric);
  }
  if (sort.direction !== DEFAULT_YEAR_SORT.direction) {
    params.set("dir", sort.direction);
  }

  return params;
}
