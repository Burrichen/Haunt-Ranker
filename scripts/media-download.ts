/**
 * Saves offline copies of the archive's recorded artwork, for personal use.
 *
 * Haunt Ranker is offline first: it shows an image from a copy it holds and
 * never fetches one from someone else's server as a page draws. Packs and
 * datasets record where official artwork lives — `reference` for the
 * owner's original, `unclear` for a copy elsewhere. This command downloads
 * each one into the app's own media folder (`<app data>/media/`), under a
 * safe generated name, and marks the row `local`: a copy on this machine,
 * shown here, never shipped. The row keeps its original URL, credit and
 * licence note, so where the copy came from is never lost, and a later
 * re-import of the pack or dataset leaves the copy in place.
 *
 * Nothing is bundled with the app and nothing is committed: the copies
 * belong to this installation. Run it again on another machine to fill that
 * one. Maps (PDF guides) aren't downloaded, and nothing over the size limit
 * is.
 *
 * Cards show artwork a few hundred pixels wide, so a full-resolution press
 * photo is mostly waste. Where the owner's server offers its own smaller
 * rendition — WordPress keeps resized copies of every upload, and Sanity's
 * image CDN resizes on request — the copy is that (about 1,024 pixels wide)
 * rather than the original. The row's URL is still the original.
 *
 * Usage:
 *   npm run media:download                  download what's missing
 *   npm run media:download -- --dry-run     list it, write nothing
 *   npm run media:download -- --max-mb 5    a lower per-image limit (default 8)
 *   npm run media:download -- --check       verify every held copy is where it should be
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { DATABASE_URL } from "../src/database/client";
import { NodeSqliteExecutor } from "../src/database/nodeSqliteExecutor";
import { SCHEMA_VERSION } from "../src/database/schemaVersion";
import type { SqlExecutor } from "../src/database/types";
import {
  buildStoredFileName,
  fileNameOf,
  MEDIA_DIRECTORY,
  toStoredPath,
} from "../src/media/storedFiles";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CHECK = args.includes("--check");
const maxMbArg = args.indexOf("--max-mb");
const MAX_BYTES = (maxMbArg >= 0 ? Number(args[maxMbArg + 1]) : 8) * 1024 * 1024;
const CONCURRENCY = 4;
const PERSONAL_TABLES = ["user_ratings", "user_notes", "user_rankings", "user_settings"] as const;

/** A stored path the app itself would have written: `media/<safe name>`, nothing more. */
const SAFE_STORED_PATH = new RegExp(
  `^${MEDIA_DIRECTORY}/[a-z0-9-]+\\.(png|jpg|jpeg|gif|webp|avif|bmp|img)$`,
);

const EXTENSION_FOR_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

function resolveDatabasePath(): string {
  if (process.env.HAUNT_RANKER_DB_PATH) {
    return process.env.HAUNT_RANKER_DB_PATH;
  }
  const appData = process.env.APPDATA;
  if (!appData) {
    throw new Error("APPDATA is not set. Set HAUNT_RANKER_DB_PATH to the database file instead.");
  }
  const { identifier } = JSON.parse(
    readFileSync(join(ROOT, "src-tauri", "tauri.conf.json"), "utf8"),
  ) as { identifier: string };
  return join(appData, identifier, DATABASE_URL.replace(/^sqlite:/, ""));
}

async function personalCounts(db: SqlExecutor): Promise<string> {
  const parts: string[] = [];
  for (const table of PERSONAL_TABLES) {
    const [{ count }] = await db.select<Array<{ count: number }>>(
      `SELECT COUNT(*) AS count FROM ${table}`,
    );
    parts.push(`${table} ${count}`);
  }
  return parts.join(", ");
}

interface Row {
  id: string;
  url: string;
  media_type: string;
  distribution: string;
  local_path: string | null;
}

type Outcome =
  | { kind: "saved"; row: Row; storedPath: string; bytes: number; rendition: boolean }
  | { kind: "skipped"; row: Row; reason: string };

/** Longest edge of an offline copy, where the host can serve a rendition that size. */
const RENDITION_WIDTH = 1024;
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
 * URL when there isn't one. Never a resize we do ourselves.
 */
async function renditionUrl(url: string): Promise<string> {
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
    const response = await fetch(api, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) {
      return url;
    }
    const items = (await response.json()) as WordPressMedia[];
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

const USER_AGENT = "HauntRanker/offline-copy (personal archive)";

/** The readable part of a URL's filename, before our own extension goes on. */
function baseNameOf(url: string): string {
  const name = decodeURIComponent(fileNameOf(new URL(url).pathname)) || "image";
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

async function download(row: Row, mediaDir: string): Promise<Outcome> {
  const from = await renditionUrl(row.url);
  let response: Response;
  try {
    response = await fetch(from, {
      headers: { "User-Agent": USER_AGENT },
      redirect: "follow",
    });
  } catch (error) {
    return { kind: "skipped", row, reason: `couldn't fetch: ${(error as Error).message}` };
  }
  if (!response.ok) {
    return { kind: "skipped", row, reason: `HTTP ${response.status}` };
  }
  const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const extension = EXTENSION_FOR_TYPE[type];
  if (!extension) {
    return { kind: "skipped", row, reason: `not an image (${type || "no content type"})` };
  }
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) {
    return { kind: "skipped", row, reason: `too big (${(declared / 1048576).toFixed(1)} MB)` };
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) {
    return {
      kind: "skipped",
      row,
      reason: `too big (${(bytes.byteLength / 1048576).toFixed(1)} MB)`,
    };
  }

  const storedPath = toStoredPath(buildStoredFileName(`${baseNameOf(row.url)}.${extension}`));
  if (!DRY_RUN) {
    writeFileSync(join(mediaDir, fileNameOf(storedPath)), bytes);
  }
  return { kind: "saved", row, storedPath, bytes: bytes.byteLength, rendition: from !== row.url };
}

async function check(db: SqlExecutor, dataDir: string): Promise<void> {
  const rows = await db.select<Row[]>(
    "SELECT id, url, media_type, distribution, local_path FROM media WHERE local_path IS NOT NULL",
  );
  let problems = 0;
  let total = 0;
  for (const row of rows) {
    const path = row.local_path!;
    if (!SAFE_STORED_PATH.test(path)) {
      problems += 1;
      console.log(`  unsafe stored path: ${row.id} → ${path}`);
      continue;
    }
    const file = join(dataDir, path);
    if (!existsSync(file)) {
      problems += 1;
      console.log(`  missing file: ${row.id} → ${path}`);
      continue;
    }
    total += statSync(file).size;
  }
  console.log(
    `${rows.length} held copies, ${(total / 1048576).toFixed(1)} MB, ${problems} problem${problems === 1 ? "" : "s"}.`,
  );
  if (problems > 0) {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const dbPath = resolveDatabasePath();
  if (!existsSync(dbPath)) {
    console.error(
      `No database at:\n  ${dbPath}\n\nLaunch Haunt Ranker once so its migrations create it.`,
    );
    process.exit(1);
  }
  const sqlite = new DatabaseSync(dbPath);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const db = new NodeSqliteExecutor(sqlite);
  const dataDir = dirname(dbPath);
  const mediaDir = join(dataDir, MEDIA_DIRECTORY);

  try {
    const [{ version }] = await db
      .select<Array<{ version: number | null }>>(
        "SELECT MAX(version) AS version FROM _sqlx_migrations",
      )
      .catch(() => [{ version: null }]);
    if (version === null || version < SCHEMA_VERSION) {
      console.error(
        `The database is at schema ${version ?? "unknown"}; this build expects ${SCHEMA_VERSION}.`,
      );
      console.error("Launch Haunt Ranker once to run its migrations, then try again.");
      process.exit(1);
    }

    if (CHECK) {
      await check(db, dataDir);
      return;
    }

    const rows = await db.select<Row[]>(
      `SELECT id, url, media_type, distribution, local_path FROM media
       WHERE local_path IS NULL AND url IS NOT NULL
         AND distribution IN ('reference', 'unclear') AND media_type != 'map'
       ORDER BY id`,
    );
    console.log(`${rows.length} recorded images with no offline copy yet.`);
    if (rows.length === 0) {
      return;
    }

    const before = await personalCounts(db);
    if (!DRY_RUN) {
      mkdirSync(mediaDir, { recursive: true });
      const copy = `${dbPath}.before-media-download-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
      copyFileSync(dbPath, copy);
      console.log(`Database copied to:\n  ${copy}`);
    }

    const outcomes: Outcome[] = [];
    for (let start = 0; start < rows.length; start += CONCURRENCY) {
      const batch = rows.slice(start, start + CONCURRENCY);
      outcomes.push(...(await Promise.all(batch.map((row) => download(row, mediaDir)))));
      process.stdout.write(`\r  ${Math.min(start + CONCURRENCY, rows.length)} / ${rows.length}`);
    }
    process.stdout.write("\n");

    const saved = outcomes.filter(
      (o): o is Extract<Outcome, { kind: "saved" }> => o.kind === "saved",
    );
    if (!DRY_RUN) {
      for (const outcome of saved) {
        await db.execute(
          `UPDATE media SET local_path = ?, distribution = 'local',
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
           WHERE id = ?`,
          [outcome.storedPath, outcome.row.id],
        );
      }
    }

    const bytes = saved.reduce((sum, o) => sum + o.bytes, 0);
    const renditions = saved.filter((o) => o.rendition).length;
    console.log(
      `${DRY_RUN ? "Would save" : "Saved"} ${saved.length} copies, ${(bytes / 1048576).toFixed(1)} MB, into ${mediaDir}` +
        ` (${renditions} of them the host's own ~${RENDITION_WIDTH}px rendition).`,
    );
    for (const outcome of outcomes) {
      if (outcome.kind === "skipped") {
        console.log(`  skipped ${outcome.row.id}: ${outcome.reason}`);
      }
    }

    const after = await personalCounts(db);
    if (after !== before) {
      console.error(`Personal data changed, which this must never do: ${before} → ${after}`);
      process.exit(1);
    }
    console.log(`Personal data untouched: ${after}`);
  } finally {
    sqlite.close();
  }
}

await main();
