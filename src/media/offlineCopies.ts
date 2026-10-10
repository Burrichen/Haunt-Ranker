import type { SqlExecutor } from "../database/types";
import { buildStoredFileName, fileNameOf, toStoredPath } from "./storedFiles";

/**
 * Saving offline copies of the archive's recorded artwork — the logic shared
 * by the app (which does it in the background after an archive update) and
 * `npm run media:download`. Each supplies its own networking: the app goes
 * through a Rust command, the script through Node.
 *
 * Haunt Ranker shows only images it holds. Datasets record where official
 * artwork lives (`reference` for the owner's original, `unclear` for a copy
 * elsewhere); this downloads each into the app's media folder under a safe
 * generated name and marks the row `local`. The row keeps its original URL,
 * credit and licence note. Maps (PDF guides) are never downloaded, and
 * nothing over the size limit is.
 */

export interface MediaRow {
  id: string;
  url: string;
  media_type: string;
  distribution: string;
  local_path: string | null;
}

/** A downloaded image, held somewhere temporary until it's kept or discarded. */
export interface FetchedImage {
  status: number;
  /** The response's content type, lowercased, without parameters. */
  contentType: string;
  /** Size in bytes of what was received. */
  size: number;
  /** Stores it under `media/<file>` for good. */
  keep(storedPath: string): Promise<void>;
  /** Throws it away. */
  discard(): Promise<void>;
}

export interface OfflineCopyNetwork {
  /** A small text resource (a host's media API). Never throws: a failure is a non-200 status. */
  getText(url: string): Promise<{ status: number; body: string }>;
  getImage(url: string): Promise<FetchedImage>;
}

export type CopyOutcome =
  | { kind: "saved"; row: MediaRow; storedPath: string; bytes: number; rendition: boolean }
  | { kind: "skipped"; row: MediaRow; reason: string };

export const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;

const EXTENSION_FOR_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Every recorded image with no offline copy yet. */
export async function pendingArtwork(db: SqlExecutor): Promise<MediaRow[]> {
  return db.select<MediaRow[]>(
    `SELECT id, url, media_type, distribution, local_path FROM media
     WHERE local_path IS NULL AND url IS NOT NULL
       AND distribution IN ('reference', 'unclear') AND media_type != 'map'
     ORDER BY id`,
  );
}

/** Longest edge of an offline copy, where the host can serve a rendition that size. */
export const RENDITION_WIDTH = 1024;
const WORDPRESS_HOSTS = [
  "media.universalparksusa.com",
  "blog.discoveruniversal.com",
  "themeparkduo.com",
];

interface WordPressMedia {
  source_url?: string;
  media_details?: { sizes?: Record<string, { source_url: string; width: number }> };
}

/**
 * A smaller copy of the same image, served by its own host, or the original
 * URL when there isn't one. Never a resize we do ourselves. Cards show
 * artwork a few hundred pixels wide, so a full press photo is mostly waste.
 */
export async function renditionUrl(url: string, network: OfflineCopyNetwork): Promise<string> {
  const parsed = new URL(url);

  if (parsed.hostname === "cdn.sanity.io") {
    parsed.searchParams.set("w", String(RENDITION_WIDTH));
    parsed.searchParams.set("fit", "max");
    return parsed.toString();
  }

  if (
    !WORDPRESS_HOSTS.includes(parsed.hostname) ||
    !parsed.pathname.includes("/wp-content/uploads/")
  ) {
    return url;
  }
  // WordPress names an upload's media record after its file: lowercase,
  // extension dropped, and any "-scaled" or "-e<edit stamp>" suffix it added.
  const file = decodeURIComponent(fileNameOf(parsed.pathname));
  const stem = file
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/-e\d{9,}$/, "")
    .replace(/-scaled$/, "");
  try {
    const api = `${parsed.origin}/wp-json/wp/v2/media?search=${encodeURIComponent(stem)}&per_page=20`;
    const response = await network.getText(api);
    if (response.status !== 200) {
      return url;
    }
    const items = JSON.parse(response.body) as WordPressMedia[];
    const original = url.replace(/-e\d{9,}(\.[a-z0-9]+)$/i, "$1");
    const match = items.find(
      (item) =>
        item.source_url === url ||
        item.source_url === original ||
        item.source_url?.replace(/-scaled(\.[a-z0-9]+)$/i, "$1") ===
          original.replace(/-scaled(\.[a-z0-9]+)$/i, "$1"),
    );
    const sizes = match?.media_details?.sizes ?? {};
    const fitting = Object.values(sizes)
      .filter((size) => size.width >= RENDITION_WIDTH * 0.75 && size.width <= RENDITION_WIDTH * 1.5)
      .sort((a, b) => Math.abs(a.width - RENDITION_WIDTH) - Math.abs(b.width - RENDITION_WIDTH));
    return fitting[0]?.source_url ?? url;
  } catch {
    return url;
  }
}

/** The readable part of a URL's filename, before our own extension goes on. */
export function baseNameOf(url: string): string {
  // Fandom serves a file at ".../File_Name.png/revision/latest"; the name is
  // the segment before "/revision".
  const path = new URL(url).pathname.replace(/\/revision\/.*$/, "");
  const name = decodeURIComponent(fileNameOf(path)) || "image";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

const megabytes = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/** Downloads one image and stores it, or says why not. Writes nothing to the database. */
export async function saveOfflineCopy(
  row: MediaRow,
  network: OfflineCopyNetwork,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<CopyOutcome> {
  const from = await renditionUrl(row.url, network);
  let image: FetchedImage;
  try {
    image = await network.getImage(from);
  } catch (error) {
    return { kind: "skipped", row, reason: `couldn't fetch: ${(error as Error).message}` };
  }

  const reject = async (reason: string): Promise<CopyOutcome> => {
    await image.discard();
    return { kind: "skipped", row, reason };
  };
  if (image.status !== 200) {
    return reject(`HTTP ${image.status}`);
  }
  const extension = EXTENSION_FOR_TYPE[image.contentType];
  if (!extension) {
    return reject(`not an image (${image.contentType || "no content type"})`);
  }
  if (image.size > maxBytes) {
    return reject(`too big (${megabytes(image.size)})`);
  }

  const storedPath = toStoredPath(buildStoredFileName(`${baseNameOf(row.url)}.${extension}`));
  await image.keep(storedPath);
  return { kind: "saved", row, storedPath, bytes: image.size, rendition: from !== row.url };
}

/** Marks saved copies as held on this machine. Only ever touches `media`. */
export async function recordOfflineCopies(
  db: SqlExecutor,
  saved: Array<Extract<CopyOutcome, { kind: "saved" }>>,
): Promise<void> {
  for (const outcome of saved) {
    await db.execute(
      `UPDATE media SET local_path = ?, distribution = 'local',
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE id = ?`,
      [outcome.storedPath, outcome.row.id],
    );
  }
}

export interface SaveArtworkOptions {
  maxBytes?: number;
  concurrency?: number;
  /** Called after each batch with how many of the pending images are done. */
  onProgress?: (done: number, total: number) => void;
}

/**
 * Saves every pending image, a few at a time, recording each batch as it
 * lands so an interrupted run keeps what it finished.
 */
export async function saveMissingArtwork(
  db: SqlExecutor,
  network: OfflineCopyNetwork,
  { maxBytes = DEFAULT_MAX_BYTES, concurrency = 4, onProgress }: SaveArtworkOptions = {},
): Promise<CopyOutcome[]> {
  const rows = await pendingArtwork(db);
  const outcomes: CopyOutcome[] = [];
  for (let start = 0; start < rows.length; start += concurrency) {
    const batch = await Promise.all(
      rows.slice(start, start + concurrency).map((row) => saveOfflineCopy(row, network, maxBytes)),
    );
    await recordOfflineCopies(
      db,
      batch.filter((o): o is Extract<CopyOutcome, { kind: "saved" }> => o.kind === "saved"),
    );
    outcomes.push(...batch);
    onProgress?.(Math.min(start + concurrency, rows.length), rows.length);
  }
  return outcomes;
}
