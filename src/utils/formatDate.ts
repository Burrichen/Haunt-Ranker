/**
 * Formats an ISO-ish date string for display (e.g. "Sep 12, 2024"). Falls
 * back to the raw string for partial/non-standard values (a bare year, an
 * approximate date) rather than hiding data that doesn't parse cleanly.
 */
export function formatDisplayDate(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
