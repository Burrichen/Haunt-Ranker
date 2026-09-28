import { generateId } from "../repositories/id";

/**
 * Where the app keeps the image files it holds, and what they're called.
 *
 * Pure, so the app and the `media:download` command name and place files the
 * same way — and so it can be tested without Tauri.
 */

/** Everything the app manages itself lives under one directory inside the app data dir. */
export const MEDIA_DIRECTORY = "media";

export const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp"];

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
