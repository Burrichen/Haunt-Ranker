import type { MediaDistribution, MediaType } from "../../models/media";
import type { SourceType } from "../../models/source";

/** The five the archive actually leans on come first; the rest stay available. */
export const SOURCE_TYPES: SourceType[] = [
  "official_site",
  "youtube",
  "article",
  "promotional",
  "book",
  "podcast",
  "interview",
  "social_media",
  "other",
];

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  official_site: "Universal / Official",
  youtube: "YouTube",
  article: "Website / Article",
  promotional: "Promotional Material",
  book: "Book",
  podcast: "Podcast",
  interview: "Interview",
  social_media: "Social Media",
  other: "Other",
};

export const MEDIA_TYPES: MediaType[] = [
  "poster",
  "promotional_image",
  "logo",
  "event_artwork",
  "map",
  "local_image",
];

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  poster: "Poster",
  promotional_image: "Promotional Image",
  logo: "Logo",
  event_artwork: "Event Artwork",
  map: "Event Map",
  local_image: "Photo",
};

export const DISTRIBUTION_OPTIONS = [
  { value: "reference", label: "External reference only" },
  { value: "unclear", label: "Redistribution unclear" },
  { value: "local", label: "User-provided file" },
  { value: "bundled", label: "Approved asset" },
];

export const DISTRIBUTION_LABELS: Record<MediaDistribution, string> = {
  reference: "External reference",
  unclear: "Redistribution unclear",
  local: "User-provided",
  bundled: "Approved asset",
};

/** Said in full at the point of choosing, because this is the decision that matters. */
export const DISTRIBUTION_HELP: Record<MediaDistribution, string> = {
  reference:
    "The official original, hosted by its owner. Recorded and linked to, never loaded from their server. Save an offline copy with npm run media:download to show it. The safe default.",
  unclear:
    "Recorded so someone can decide — typically a copy on another site, or rights nobody has established. Never loaded, never shipped.",
  local:
    "A copy in the app's own folder — a file of yours, or artwork saved for personal offline use. Stays on this machine, and is shown.",
  bundled:
    "Only for artwork we have positively decided we may distribute. Finding an image online is not that decision. Shown in the app.",
};
