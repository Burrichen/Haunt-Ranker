import { join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { mkdir, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { describe, expect, it, vi } from "vitest";
import type { Media } from "../models/media";
import {
  buildStoredFileName,
  fileNameOf,
  importLocalMediaFile,
  pickArtwork,
  resolveMediaSrc,
  toStoredPath,
} from "./mediaFiles";

// The module reaches for Tauri APIs at import time; the pure helpers under
// test here don't call them, but the imports still have to resolve.
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://localhost${path}`,
}));
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn(() => Promise.resolve("/app-data")),
  join: vi.fn((...parts: string[]) => Promise.resolve(parts.join("/"))),
}));
vi.mock("@tauri-apps/plugin-dialog", () => ({ open: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn(),
  remove: vi.fn(),
  writeFile: vi.fn(),
}));

describe("fileNameOf", () => {
  it("takes the last segment of either platform's path", () => {
    expect(fileNameOf("C:\\Users\\isaac\\Pictures\\poster.jpg")).toBe("poster.jpg");
    expect(fileNameOf("/home/isaac/pictures/poster.jpg")).toBe("poster.jpg");
    expect(fileNameOf("poster.jpg")).toBe("poster.jpg");
  });
});

describe("buildStoredFileName", () => {
  it("keeps a readable name and its extension", () => {
    expect(buildStoredFileName("Moonlight Manor.jpg", "abc123")).toBe("moonlight-manor-abc123.jpg");
  });

  it("gives two files of the same name different stored names", () => {
    const first = buildStoredFileName("poster.png", "id-one");
    const second = buildStoredFileName("poster.png", "id-two");

    expect(first).not.toBe(second);
    expect(first).toBe("poster-id-one.png");
    expect(second).toBe("poster-id-two.png");
  });

  it("is unique even without being told an id", () => {
    const names = new Set(Array.from({ length: 50 }, () => buildStoredFileName("poster.png")));
    expect(names.size).toBe(50);
  });

  it("strips anything that could escape the media directory", () => {
    const name = buildStoredFileName("../../../etc/passwd.png", "id");

    expect(name).toBe("passwd-id.png");
    expect(name).not.toContain("/");
    expect(name).not.toContain("\\");
    expect(name).not.toContain("..");
  });

  it("normalises awkward characters rather than trusting them", () => {
    expect(buildStoredFileName("Póster (2024) #1!.JPEG", "id")).toBe("p-ster-2024-1-id.jpeg");
  });

  it("falls back to a safe extension for anything that isn't a known image", () => {
    expect(buildStoredFileName("sneaky.exe", "id")).toBe("sneaky-id.img");
    expect(buildStoredFileName("no-extension", "id")).toBe("no-extension-id.img");
  });

  it("keeps a name that is only an extension usable", () => {
    expect(buildStoredFileName(".jpg", "id")).toBe("jpg-id.img");
  });

  it("caps a very long name", () => {
    const name = buildStoredFileName(`${"a".repeat(300)}.png`, "id");
    expect(name).toBe(`${"a".repeat(48)}-id.png`);
  });
});

describe("toStoredPath", () => {
  it("stores a path relative to the app's own data directory", () => {
    const stored = toStoredPath("poster-abc.png");

    expect(stored).toBe("media/poster-abc.png");
    // Never an absolute path into wherever the user happened to keep the file.
    expect(stored.startsWith("/")).toBe(false);
    expect(stored).not.toMatch(/^[A-Za-z]:/);
  });
});

function media(overrides: Partial<Media>): Media {
  return {
    id: "m1",
    attractionId: "a1",
    eventYearId: null,
    mediaType: "poster",
    url: null,
    localPath: null,
    sourceId: null,
    attribution: null,
    licenseNotes: null,
    distribution: "reference",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("importLocalMediaFile", () => {
  it("copies the picked file into the app's own media folder under a safe name", async () => {
    vi.mocked(open).mockResolvedValue("/Users/someone/Downloads/My Poster!!.JPG");
    vi.mocked(readFile).mockResolvedValue(new Uint8Array([1, 2, 3]));

    const imported = await importLocalMediaFile();

    expect(imported?.originalFileName).toBe("My Poster!!.JPG");
    expect(imported?.storedPath).toMatch(/^media\/my-poster-[a-z0-9-]+\.jpg$/);
    expect(vi.mocked(mkdir)).toHaveBeenCalledWith("/app-data/media", { recursive: true });
    const [written] = vi.mocked(writeFile).mock.calls[0];
    expect(written).toBe(`/app-data/${imported!.storedPath}`);
    // What's stored never mentions where the user kept the original.
    expect(imported?.storedPath).not.toContain("Downloads");
    expect(vi.mocked(join)).not.toHaveBeenCalledWith(expect.stringContaining("Downloads"));
  });

  it("does nothing when the picker is dismissed", async () => {
    vi.mocked(open).mockResolvedValue(null);

    expect(await importLocalMediaFile()).toBeNull();
  });
});

describe("resolveMediaSrc", () => {
  it("serves a user-provided file from the app's data folder, never its original path", async () => {
    expect(
      await resolveMediaSrc(media({ distribution: "local", localPath: "media/poster-1.png" })),
    ).toBe("asset://localhost/app-data/media/poster-1.png");
  });

  it("shows an approved asset", async () => {
    expect(
      await resolveMediaSrc(media({ distribution: "bundled", url: "https://example.com/a.png" })),
    ).toBe("https://example.com/a.png");
  });

  it("shows an offline copy from the app's folder, still recording where it came from", async () => {
    expect(
      await resolveMediaSrc(
        media({
          distribution: "local",
          url: "https://example.com/official.jpg",
          localPath: "media/official-1.jpg",
        }),
      ),
    ).toBe("asset://localhost/app-data/media/official-1.jpg");
  });

  it("never loads a reference or an unclear copy, whatever its URL", async () => {
    for (const distribution of ["reference", "unclear"] as const) {
      expect(
        await resolveMediaSrc(media({ distribution, url: "https://example.com/theirs.jpg" })),
      ).toBeNull();
    }
  });
});

describe("pickArtwork", () => {
  it("passes over what it may not show, and a map, for what it may", async () => {
    const artwork = await pickArtwork(
      [
        media({ id: "ref", mediaType: "poster", url: "https://example.com/p.jpg" }),
        media({
          id: "map",
          mediaType: "map",
          distribution: "bundled",
          url: "https://example.com/m.jpg",
        }),
        media({
          id: "logo",
          mediaType: "logo",
          distribution: "local",
          localPath: "media/logo.png",
        }),
      ],
      "attraction",
    );

    expect(artwork).toEqual({ src: "asset://localhost/app-data/media/logo.png", fit: "contain" });
  });

  it("returns nothing when nothing may be shown, so the fallback card stands", async () => {
    expect(
      await pickArtwork(
        [media({ distribution: "unclear", url: "https://example.com/x.jpg" })],
        "season",
      ),
    ).toBeNull();
  });
});
