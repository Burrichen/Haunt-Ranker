import { useState } from "react";
import type { Media, MediaType } from "../../models/media";
import { Badge } from "../ui";
import "./MediaGallery.css";

export interface MediaGalleryProps {
  media: Media[];
}

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  poster: "Poster",
  promotional_image: "Promotional Image",
  logo: "Logo",
  event_artwork: "Event Artwork",
  local_image: "Photo",
};

function MediaGalleryItem({ item }: { item: Media }) {
  const [failed, setFailed] = useState(false);
  const src = item.url ?? item.localPath;

  if (!src || failed) {
    return null;
  }

  return (
    <figure className="media-gallery__item">
      <img
        src={src}
        alt={MEDIA_TYPE_LABEL[item.mediaType]}
        className="media-gallery__image"
        onError={() => setFailed(true)}
      />
      <figcaption className="media-gallery__caption">
        <Badge variant="neutral">{MEDIA_TYPE_LABEL[item.mediaType]}</Badge>
        {item.attribution && <span className="media-gallery__attribution">{item.attribution}</span>}
      </figcaption>
    </figure>
  );
}

/** Every piece of media on file for this attraction besides the one already shown in the header. */
export function MediaGallery({ media }: MediaGalleryProps) {
  return (
    <div className="media-gallery">
      {media.map((item) => (
        <MediaGalleryItem key={item.id} item={item} />
      ))}
    </div>
  );
}
