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
  "local_image",
];

export const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  poster: "Poster",
  promotional_image: "Promotional Image",
  logo: "Logo",
  event_artwork: "Event Artwork",
  local_image: "Photo",
};

export const DISTRIBUTION_OPTIONS = [
  { value: "reference", label: "Reference only" },
  { value: "local", label: "My local file" },
  { value: "bundled", label: "Cleared to bundle" },
];

export const DISTRIBUTION_LABELS: Record<MediaDistribution, string> = {
  reference: "Reference only",
  local: "Local file",
  bundled: "Cleared to bundle",
};

/** Said in full at the point of choosing, because this is the decision that matters. */
export const DISTRIBUTION_HELP: Record<MediaDistribution, string> = {
  reference:
    "A link we store and nothing more. Never copied, never shipped with the app. The safe default.",
  local: "A file of yours, copied into the app's own folder. Stays on this machine.",
  bundled:
    "Only for artwork we have positively decided we may distribute. Finding an image online is not that decision.",
};
