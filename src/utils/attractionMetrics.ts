import type { Attraction } from "../models/attraction";
import type { Rating } from "../models/rating";
import type { RankingDirection, RankingMetric } from "./rankings";

/** An attraction paired with the review it definitely has. */
export interface RatedAttraction {
  attraction: Attraction;
  rating: Rating;
}

/** The winner of a "most/least X" comparison, with the value that won it. */
export interface AttractionExtreme extends RatedAttraction {
  value: number;
}

/** Narrows a list of possibly-unrated rows to the reviewed ones only. */
export function ratedOnly<T extends { attraction: Attraction; rating: Rating | null }>(
  items: T[],
): RatedAttraction[] {
  return items
    .filter((item): item is T & { rating: Rating } => item.rating !== null)
    .map((item) => ({ attraction: item.attraction, rating: item.rating }));
}

/**
 * The extreme of one metric across reviewed attractions, with ties broken by
 * name so the same attraction is named on every render rather than whichever
 * row happened to load first.
 *
 * Shared by the year archive's superlatives and the dashboard's highlight
 * cards so the two can't disagree about who won.
 */
export function pickExtreme(
  rated: RatedAttraction[],
  metric: RankingMetric,
  direction: RankingDirection,
): AttractionExtreme {
  const best = rated.reduce((winner, candidate) => {
    const candidateValue = candidate.rating[metric];
    const winnerValue = winner.rating[metric];
    if (candidateValue === winnerValue) {
      return candidate.attraction.name.localeCompare(winner.attraction.name) < 0
        ? candidate
        : winner;
    }
    const candidateWins =
      direction === "desc" ? candidateValue > winnerValue : candidateValue < winnerValue;
    return candidateWins ? candidate : winner;
  });

  return { attraction: best.attraction, rating: best.rating, value: best.rating[metric] };
}
