/**
 * Formats a rating value or total for display, always to one decimal place
 * ("13.0 / 15", "3.5", "4.0"). The fixed decimal is deliberate: scores move
 * in half-points, so "4" and "4.5" sitting in the same column read
 * inconsistently, and a lone "4" invites the question of whether halves
 * were even possible.
 */
export function formatScore(value: number): string {
  return value.toFixed(1);
}
