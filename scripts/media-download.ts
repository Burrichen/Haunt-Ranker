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
import { execFile } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { DATABASE_URL } from "../src/database/client";
import { NodeSqliteExecutor } from "../src/database/nodeSqliteExecutor";
import { SCHEMA_VERSION } from "../src/database/schemaVersion";
import type { SqlExecutor } from "../src/database/types";
import {
  DEFAULT_MAX_BYTES,
  pendingArtwork,
  RENDITION_WIDTH,
  recordOfflineCopies,
  saveOfflineCopy,
  type CopyOutcome,
  type MediaRow,
  type OfflineCopyNetwork,
} from "../src/media/offlineCopies";
import { fileNameOf, MEDIA_DIRECTORY } from "../src/media/storedFiles";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CHECK = args.includes("--check");
const maxMbArg = args.indexOf("--max-mb");
const MAX_BYTES = maxMbArg >= 0 ? Number(args[maxMbArg + 1]) * 1024 * 1024 : DEFAULT_MAX_BYTES;
const CONCURRENCY = 4;
const PERSONAL_TABLES = ["user_ratings", "user_notes", "user_rankings", "user_settings"] as const;

/** A stored path the app itself would have written: `media/<safe name>`, nothing more. */
const SAFE_STORED_PATH = new RegExp(
  `^${MEDIA_DIRECTORY}/[a-z0-9-]+\\.(png|jpg|jpeg|gif|webp|avif|bmp|img)$`,
);

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

const USER_AGENT = "HauntRanker/offline-copy (personal archive)";

/**
 * Some image hosts (Fandom's static.wikia.nocookie.net, which holds the HHN
 * Wiki's copies of the official posters) sit behind a Cloudflare challenge
 * that refuses Node's own HTTP client by its fingerprint, whatever user agent
 * it sends. The honest agent is tried first; a 403 retries with a browser
 * user agent, and a Cloudflare challenge then goes through curl (built into
 * Windows 10 and later), which the challenge lets through.
 */
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) " +
  "Chrome/126.0.0.0 Safari/537.36";

/** Fetches through curl, returned as a Response so the caller can't tell the difference. */
function fetchWithCurl(url: string): Promise<Response> {
  const MARKER = "\n__HAUNT_RANKER_CURL__";
  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      [
        "-sSL",
        "-A",
        BROWSER_USER_AGENT,
        "-H",
        "Accept: image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "-H",
        "Accept-Language: en-GB,en;q=0.9",
        "-w",
        `${MARKER}%{http_code} %{content_type}`,
        url,
      ],
      { encoding: "buffer", maxBuffer: 64 * 1024 * 1024 },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        const at = stdout.lastIndexOf(Buffer.from(MARKER));
        const [status, type] = stdout
          .subarray(at + MARKER.length)
          .toString()
          .split(" ");
        resolve(
          new Response(stdout.subarray(0, at), {
            status: Number(status) || 502,
            headers: { "content-type": type ?? "" },
          }),
        );
      },
    );
  });
}

async function fetchImage(url: string): Promise<Response> {
  let response = await fetch(url, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
  for (let attempt = 0; response.status === 403 && attempt < 2; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    response = await fetch(url, {
      headers: { "User-Agent": BROWSER_USER_AGENT, Accept: "image/*" },
      redirect: "follow",
    });
    if (response.headers.get("cf-mitigated") === "challenge") {
      return fetchWithCurl(url);
    }
  }
  return response;
}

/** Node's networking for the shared offline-copy logic: images are held in memory. */
function nodeNetwork(mediaDir: string): OfflineCopyNetwork {
  return {
    async getText(url) {
      try {
        const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
        return { status: response.status, body: await response.text() };
      } catch {
        return { status: 0, body: "" };
      }
    },
    async getImage(url) {
      const response = await fetchImage(url);
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {
        status: response.status,
        contentType: (response.headers.get("content-type") ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase(),
        size: bytes.byteLength,
        async keep(storedPath) {
          if (!DRY_RUN) {
            writeFileSync(join(mediaDir, fileNameOf(storedPath)), bytes);
          }
        },
        async discard() {},
      };
    },
  };
}

async function check(db: SqlExecutor, dataDir: string): Promise<void> {
  const rows = await db.select<MediaRow[]>(
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

    const rows = await pendingArtwork(db);
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

    const network = nodeNetwork(mediaDir);
    const outcomes: CopyOutcome[] = [];
    for (let start = 0; start < rows.length; start += CONCURRENCY) {
      const batch = rows.slice(start, start + CONCURRENCY);
      outcomes.push(
        ...(await Promise.all(batch.map((row) => saveOfflineCopy(row, network, MAX_BYTES)))),
      );
      process.stdout.write(`\r  ${Math.min(start + CONCURRENCY, rows.length)} / ${rows.length}`);
    }
    process.stdout.write("\n");

    const saved = outcomes.filter(
      (o): o is Extract<CopyOutcome, { kind: "saved" }> => o.kind === "saved",
    );
    if (!DRY_RUN) {
      await recordOfflineCopies(db, saved);
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
