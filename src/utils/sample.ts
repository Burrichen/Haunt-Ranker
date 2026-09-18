/** Returns up to `count` random, non-repeating items from `items`, in random order. */
export function pickRandomSample<T>(items: readonly T[], count: number): T[] {
  const pool = items.slice();
  const take = Math.min(count, pool.length);
  const result: T[] = [];

  for (let i = 0; i < take; i++) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }

  return result;
}
