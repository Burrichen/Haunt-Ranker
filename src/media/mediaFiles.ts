import { convertFileSrc } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, readFile, remove, writeFile } from "@tauri-apps/plugin-fs";
import type { Media } from "../models/media";
import { generateId } from "../repositories/id";

/** Everything the app manages itself lives under one directory inside the app data dir. */
export const MEDIA_DIRECTORY = "media";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp"];

/** The last path segment, whichever separator the platform used. */
export function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/**
 * A filename that can't collide and can't smuggle anything.
 *
 * The random id is what actually guarantees uniqueness — two files called
 * `poster.jpg` from different folders both keep their readable name and still
 * land on disk separately. The original name is reduced to plain characters
 * so nothing in it can escape the media directory.
 */
export function buildStoredFileName(originalName: string, id: string = generateId()): string {
  const name = fileNameOf(originalName);
  const lastDot = name.lastIndexOf(".");
  const rawExtension = lastDot > 0 ? name.slice(lastDot + 1).toLowerCase() : "";
  const extension = IMAGE_EXTENSIONS.includes(rawExtension) ? rawExtension : "img";

  const base = (lastDot > 0 ? name.slice(0, lastDot) : name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${base || "image"}-${id}.${extension}`;
}

/** The value stored in `media.local_path` — relative to the app data dir, never the user's path. */
export function toStoredPath(fileName: string): string {
  return `${MEDIA_DIRECTORY}/${fileName}`;
}

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
 * What an `<img src>` should point at: a remote URL as-is, or an asset-protocol
 * URL for a managed local file. `null` when there's nothing to show, which is a
 * normal state — the UI's fallback card covers it.
 */
export async function resolveMediaSrc(
  media: Pick<Media, "url" | "localPath">,
): Promise<string | null> {
  if (media.url) {
    return media.url;
  }
  if (!media.localPath) {
    return null;
  }
  return convertFileSrc(await join(await dataDir(), media.localPath));
}

/**
 * The display source for the most representative item in a list — the
 * preferred kind if it's there, otherwise the first. `null` when the list is
 * empty, which is not an error: the UI's fallback card is the answer.
 */
export async function pickMediaSrc(
  mediaList: Media[],
  preferredType?: Media["mediaType"],
): Promise<string | null> {
  const preferred =
    (preferredType && mediaList.find((item) => item.mediaType === preferredType)) ?? mediaList[0];
  return preferred ? resolveMediaSrc(preferred) : null;
}

/** Display sources for a whole list, keyed by media id. */
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
