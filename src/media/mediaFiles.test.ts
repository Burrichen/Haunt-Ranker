import { describe, expect, it, vi } from "vitest";
import { buildStoredFileName, fileNameOf, toStoredPath } from "./mediaFiles";

// The module reaches for Tauri APIs at import time; the pure helpers under
// test here don't call them, but the imports still have to resolve.
vi.mock("@tauri-apps/api/core", () => ({ convertFileSrc: (path: string) => path }));
vi.mock("@tauri-apps/api/path", () => ({
  appDataDir: vi.fn(),
  join: vi.fn(),
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
