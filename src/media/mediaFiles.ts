import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import type { Media } from "../models/media";
import {
  artworkFit,
  chooseArtwork,
  mayDisplayInline,
  type ArtworkFit,
  type ArtworkSlot,
} from "./mediaPolicy";
import {
  buildStoredFileName,
  fileNameOf,
  IMAGE_EXTENSIONS,
  MEDIA_DIRECTORY,
  toStoredPath,
} from "./storedFiles";

export { buildStoredFileName, fileNameOf, IMAGE_EXTENSIONS, MEDIA_DIRECTORY, toStoredPath };

let appDataDirPromise: Promise<string> | null = null;

function dataDir(): Promise<string> {
  appDataDirPromise ??= appDataDir();
  return appDataDirPromise;
}

export interface ImportedMediaFile {
  /** What to store in the database. */
  storedPath: string;
  /** The name the user's file had, worth keeping as attribution context. */
  originalFileName: string;
}

/**
 * Asks for an image, copies it into the app's own media directory, and
 * returns the relative path to store.
 *
 * The copy is the point: the archive must not depend on a file staying put
 * in the user's Downloads folder. Returns `null` if the picker is dismissed.
 */
export async function importLocalMediaFile(): Promise<ImportedMediaFile | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
  });

  if (typeof selected !== "string") {
    return null;
  }

  const originalFileName = fileNameOf(selected);
  const fileName = buildStoredFileName(originalFileName);
  const base = await dataDir();
  const directory = await join(base, MEDIA_DIRECTORY);

  await mkdir(directory, { recursive: true });
  await writeFile(await join(directory, fileName), await readFile(selected));

  return { storedPath: toStoredPath(fileName), originalFileName };
}

/**
 * What an `<img src>` should point at, or `null` when the app may not show
 * this image at all.
 *
 * Only an image the app holds is displayed: a copy in its own media folder,
 * or an approved asset. A reference or an unclear copy returns `null`
 * whatever its URL, so the webview never fetches artwork from someone else's
 * server — the app works offline, and hotlinks nothing.
 * A managed local file is served through the asset protocol from the app's
 * own data directory — never from wherever the user originally picked it.
 * `null` is a normal answer: the designed fallback covers it.
 */
export async function resolveMediaSrc(
  media: Pick<Media, "url" | "localPath" | "distribution">,
): Promise<string | null> {
  if (!mayDisplayInline(media)) {
    return null;
  }
  if (media.localPath) {
    return convertFileSrc(await join(await dataDir(), media.localPath));
  }
  return media.url ?? null;
}

/** An image the app may show in a slot, and how it sits in the frame. */
export interface Artwork {
  src: string;
  fit: ArtworkFit;
}

/**
 * The image for a card or a header: the best kind for the slot among those
 * the app may display. `null` when there isn't one, which is not an error —
 * the fallback card is the answer.
 */
export async function pickArtwork(
  mediaList: readonly Media[],
  slot: ArtworkSlot,
): Promise<Artwork | null> {
  const chosen = chooseArtwork(mediaList, slot);
  if (!chosen) {
    return null;
  }
  const src = await resolveMediaSrc(chosen);
  return src ? { src, fit: artworkFit(chosen) } : null;
}

/** An attraction's card fields: its artwork, if any, and how it sits in the frame. */
export async function posterFields(
  mediaList: readonly Media[],
): Promise<{ posterUrl: string | null; posterFit?: ArtworkFit }> {
  const artwork = await pickArtwork(mediaList, "attraction");
  return artwork ? { posterUrl: artwork.src, posterFit: artwork.fit } : { posterUrl: null };
}

/** A season's card fields, likewise. */
export async function seasonArtworkFields(
  mediaList: readonly Media[],
): Promise<{ artworkUrl: string | null; artworkFit?: ArtworkFit }> {
  const artwork = await pickArtwork(mediaList, "season");
  return artwork ? { artworkUrl: artwork.src, artworkFit: artwork.fit } : { artworkUrl: null };
}

/**
 * Just the src, for callers that don't lay out logos. `event_artwork` asks
 * for a season's image; anything else, an attraction's.
 */
export async function pickMediaSrc(
  mediaList: Media[],
  preferredType?: Media["mediaType"],
): Promise<string | null> {
  const artwork = await pickArtwork(
    mediaList,
    preferredType === "event_artwork" ? "season" : "attraction",
  );
  return artwork?.src ?? null;
}

/** Display sources for a whole list, keyed by media id — `null` for anything not shown. */
export async function resolveMediaSrcMap(mediaList: Media[]): Promise<Map<string, string | null>> {
  const entries = await Promise.all(
    mediaList.map(async (item) => [item.id, await resolveMediaSrc(item)] as const),
  );
  return new Map(entries);
}

/** Removes a managed file. Missing files are fine — the record is what matters. */
export async function deleteLocalMediaFile(storedPath: string): Promise<void> {
  try {
    await remove(await join(await dataDir(), storedPath));
  } catch {
    // Already gone, or never written. Nothing to clean up.
  }
}
