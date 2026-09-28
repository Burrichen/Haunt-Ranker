import type { Media, MediaType } from "../models/media";

/**
 * What the app may show, and where.
 *
 * Haunt Ranker is offline first, so an image is shown from a copy the app
 * holds, never fetched from someone else's server as a page draws. Two rules,
 * and everything that puts an image on screen goes through them:
 *
 *  1. **Only images the app holds are loaded.** A `local` image is a copy in
 *     the app's own media folder — one the user added, or one saved for
 *     personal offline use by `npm run media:download` — and a `bundled` one
 *     is an asset approved to ship. A `reference` (an official original) or
 *     an `unclear` copy (anywhere else) is recorded with its provenance and
 *     linked to, but never loaded: that would hotlink the owner's server, or
 *     a third party's.
 *  2. **Each slot takes the kind of image that belongs in it.** A card or a
 *     page header prefers key art, falls back to other promotional imagery,
 *     and shows a logo only when there is nothing else, uncropped. A map is
 *     never card artwork. With nothing suitable, the slot is empty and the
 *     designed fallback card is what shows — which is not a failure state.
 *
 * Kept free of Tauri so it can be tested, and reasoned about, on its own.
 */

export function mayDisplayInline(media: Pick<Media, "distribution">): boolean {
  return media.distribution === "local" || media.distribution === "bundled";
}

/** Where an image is going: an attraction's card or header, or a season's. */
export type ArtworkSlot = "attraction" | "season";

/**
 * How an image sits in its frame. Key art and photos fill it; a logo is
 * shown whole on the card's own background, because cropping a logo to a
 * poster shape makes it look like a broken poster.
 */
export type ArtworkFit = "cover" | "contain";

const PREFERENCE: Record<ArtworkSlot, readonly MediaType[]> = {
  attraction: ["poster", "promotional_image", "event_artwork", "local_image", "logo"],
  season: ["event_artwork", "poster", "promotional_image", "local_image", "logo"],
};

/** The best image for a slot among those the app may show, or `null`. Maps never qualify. */
export function chooseArtwork<T extends Pick<Media, "mediaType" | "distribution">>(
  media: readonly T[],
  slot: ArtworkSlot,
): T | null {
  for (const kind of PREFERENCE[slot]) {
    const match = media.find((item) => item.mediaType === kind && mayDisplayInline(item));
    if (match) {
      return match;
    }
  }
  return null;
}

export function artworkFit(media: Pick<Media, "mediaType">): ArtworkFit {
  return media.mediaType === "logo" ? "contain" : "cover";
}

/**
 * Whether a record is safe to point at from a page — as a link the person
 * chooses to open in their browser, never as an embedded image.
 */
export function referenceLink(media: Pick<Media, "url" | "distribution">): string | null {
  return !mayDisplayInline(media) && media.url ? media.url : null;
}
