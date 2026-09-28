import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, ImageOff } from "lucide-react";
import { artworkFit } from "../../media/mediaPolicy";
import type { Media, MediaDistribution, MediaType } from "../../models/media";
import type { Source } from "../../models/source";
import { cn } from "../../utils/cn";
import { Badge } from "../ui";
import "./MediaGallery.css";

export interface MediaGalleryProps {
  media: Media[];
  /** What each row displays as; `null` for anything the app may not show. */
  mediaSrc: Map<string, string | null>;
  /** The page's sources, so a reference can link to the page it was found on. */
  sources?: Source[];
}

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  poster: "Poster",
  promotional_image: "Promotional Image",
  logo: "Logo",
  event_artwork: "Event Artwork",
  map: "Event Map",
  local_image: "Photo",
};

const DISTRIBUTION_NOTE: Record<Exclude<MediaDistribution, "local" | "bundled">, string> = {
  reference:
    "Official original, hosted by its owner. Recorded by reference; no offline copy on this machine yet.",
  unclear:
    "A copy on another site, or reuse rights not established. Recorded for reference; never loaded into the app.",
};

/** Hands a link to the system browser; this window never navigates away. */
async function openExternally(url: string) {
  try {
    await openUrl(url);
  } catch {
    // Opener unavailable (outside a Tauri window). Never navigate this window.
  }
}

function ShownItem({ item, src }: { item: Media; src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  return (
    <figure className="media-gallery__item">
      <img
        src={src}
        alt={MEDIA_TYPE_LABEL[item.mediaType]}
        className={cn(
          "media-gallery__image",
          artworkFit(item) === "contain" && "media-gallery__image--contain",
        )}
        onError={() => setFailed(true)}
      />
      <figcaption className="media-gallery__caption">
        <Badge variant="neutral">{MEDIA_TYPE_LABEL[item.mediaType]}</Badge>
        {item.attribution && <span className="media-gallery__attribution">{item.attribution}</span>}
        {item.distribution === "local" && item.url && (
          <span className="media-gallery__attribution">Offline copy, for personal viewing</span>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Media the app records but doesn't hold a copy of: an official original,
 * or a copy on another site. It's listed with its provenance and a link the reader can
 * choose to open — never loaded here, never hotlinked.
 */
function ReferenceItem({ item, source }: { item: Media; source: Source | null }) {
  const link = source?.url ?? item.url;
  const note =
    item.distribution === "reference" || item.distribution === "unclear"
      ? DISTRIBUTION_NOTE[item.distribution]
      : null;

  return (
    <li className="media-gallery__reference">
      <span className="media-gallery__reference-icon" aria-hidden="true">
        <ImageOff size={16} strokeWidth={1.5} />
      </span>
      <div className="media-gallery__reference-body">
        <div className="media-gallery__reference-head">
          <Badge variant="neutral">{MEDIA_TYPE_LABEL[item.mediaType]}</Badge>
          {item.attribution && (
            <span className="media-gallery__attribution">{item.attribution}</span>
          )}
        </div>
        {note && <p className="media-gallery__reference-note">{note}</p>}
        {item.licenseNotes && <p className="media-gallery__reference-note">{item.licenseNotes}</p>}
        {link && (
          <button
            type="button"
            className="media-gallery__reference-link"
            onClick={() => void openExternally(link)}
          >
            {source ? `View at ${source.publisher ?? "source"}` : "View at source"}
            <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * Every piece of media on file for this attraction besides the one already
 * shown in the header: the images the app may display, then the ones it
 * only records.
 */
export function MediaGallery({ media, mediaSrc, sources = [] }: MediaGalleryProps) {
  const shown = media.filter((item) => mediaSrc.get(item.id));
  const referenced = media.filter((item) => !mediaSrc.get(item.id));
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  return (
    <div className="media-gallery-wrap">
      {shown.length > 0 && (
        <div className="media-gallery">
          {shown.map((item) => (
            <ShownItem key={item.id} item={item} src={mediaSrc.get(item.id)!} />
          ))}
        </div>
      )}
      {referenced.length > 0 && (
        <ul className="media-gallery__references" aria-label="Recorded artwork">
          {referenced.map((item) => (
            <ReferenceItem
              key={item.id}
              item={item}
              source={item.sourceId ? (sourceById.get(item.sourceId) ?? null) : null}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
