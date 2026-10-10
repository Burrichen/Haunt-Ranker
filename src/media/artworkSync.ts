import { useSyncExternalStore } from "react";
import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, writeFile } from "@tauri-apps/plugin-fs";
import type { SqlExecutor } from "../database/types";
import { saveMissingArtwork, type OfflineCopyNetwork } from "./offlineCopies";
import { MEDIA_DIRECTORY } from "./storedFiles";

/**
 * The app's networking for offline copies: the webview's own fetch. It is a
 * real browser engine, so it gets past the Cloudflare challenge in front of
 * the HHN Wiki's image host, which refuses curl and HTTP libraries alike;
 * both image hosts send `Access-Control-Allow-Origin: *`, so the bytes can be
 * read. An image is held in memory and written into the media folder only
 * once it's known to be a keeper.
 */
export function appNetwork(): OfflineCopyNetwork {
  return {
    async getText(url) {
      try {
        const response = await fetch(url);
        return { status: response.status, body: await response.text() };
      } catch {
        return { status: 0, body: "" };
      }
    },
    async getImage(url) {
      const response = await fetch(url);
      const bytes = new Uint8Array(await response.arrayBuffer());
      return {
        status: response.status,
        contentType: (response.headers.get("content-type") ?? "")
          .split(";")[0]
          .trim()
          .toLowerCase(),
        size: bytes.byteLength,
        async keep(storedPath) {
          const dataDir = await appDataDir();
          await mkdir(await join(dataDir, MEDIA_DIRECTORY), { recursive: true });
          await writeFile(await join(dataDir, storedPath), bytes);
        },
        async discard() {},
      };
    },
  };
}

export interface ArtworkSyncStatus {
  state: "idle" | "running" | "done" | "failed";
  done: number;
  total: number;
  saved: number;
  skipped: number;
  message: string | null;
}

let status: ArtworkSyncStatus = {
  state: "idle",
  done: 0,
  total: 0,
  saved: 0,
  skipped: 0,
  message: null,
};
const listeners = new Set<() => void>();

function setStatus(next: Partial<ArtworkSyncStatus>): void {
  status = { ...status, ...next };
  for (const listener of listeners) {
    listener();
  }
}

export function getArtworkSyncStatus(): ArtworkSyncStatus {
  return status;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The current background download, for Settings. */
export function useArtworkSyncStatus(): ArtworkSyncStatus {
  return useSyncExternalStore(subscribe, getArtworkSyncStatus, getArtworkSyncStatus);
}

/**
 * Saves offline copies of every recorded image this installation doesn't
 * hold yet. Runs in the background; a second call while one is running does
 * nothing. Images the app already holds are never fetched again.
 */
export async function syncArtwork(
  db: SqlExecutor,
  network: OfflineCopyNetwork = appNetwork(),
): Promise<void> {
  if (status.state === "running") {
    return;
  }
  setStatus({ state: "running", done: 0, total: 0, saved: 0, skipped: 0, message: null });
  try {
    const outcomes = await saveMissingArtwork(db, network, {
      onProgress: (done, total) => setStatus({ done, total }),
    });
    setStatus({
      state: "done",
      saved: outcomes.filter((outcome) => outcome.kind === "saved").length,
      skipped: outcomes.filter((outcome) => outcome.kind === "skipped").length,
    });
  } catch (error) {
    setStatus({
      state: "failed",
      message: error instanceof Error ? error.message : "The artwork download stopped.",
    });
  }
}
