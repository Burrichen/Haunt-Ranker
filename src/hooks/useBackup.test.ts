import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openBackupFile, saveBackupFile, writeSafetyBackup } from "../backup/backupFiles";
import { buildBackupFile, serializeBackup } from "../backup/backupFormat";
import { importBackupFile } from "../backup/importBackup";
import { getDatabase } from "../database/client";
import { SCHEMA_VERSION } from "../database/schemaVersion";
import type { BackupData } from "../models/backup";
import { PREFERENCE_KEYS } from "../preferences/localPreferences";
import { createBackupRepository } from "../repositories/backupRepository";
import { useBackup } from "./useBackup";

vi.mock("../backup/backupFiles", () => ({
  saveBackupFile: vi.fn(),
  openBackupFile: vi.fn(),
  writeSafetyBackup: vi.fn(),
}));
vi.mock("../backup/importBackup", () => ({ importBackupFile: vi.fn() }));
vi.mock("../repositories/backupRepository", () => ({ createBackupRepository: vi.fn() }));
vi.mock("../database/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../database/client")>()),
  getDatabase: vi.fn(),
}));

const mockedSave = vi.mocked(saveBackupFile);
const mockedOpen = vi.mocked(openBackupFile);
const mockedImport = vi.mocked(importBackupFile);
const mockedCreateRepository = vi.mocked(createBackupRepository);
const mockedGetDatabase = vi.mocked(getDatabase);

function emptyData(): BackupData {
  return {
    eventYears: [],
    attractions: [],
    attractionParks: [],
    characters: [],
    attractionRelations: [],
    sources: [],
    attractionSources: [],
    eventYearSources: [],
    media: [],
    ratings: [],
    notes: [],
    rankings: [],
    settings: [],
  };
}

function backupText(preferences = {}): string {
  const data = emptyData();
  data.eventYears.push({
    id: "y9",
    calendar_year: 2102,
    name: "Shadowfest 2102",
    description: null,
    source_notes: null,
    starts_on: null,
    ends_on: null,
    is_sample: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  });

  return serializeBackup(
    buildBackupFile({ data, preferences, appVersion: "0.1.0", schemaVersion: 5 }),
  );
}

const repository = {
  exportData: vi.fn(),
  counts: vi.fn(),
  replaceAll: vi.fn(),
  appliedSchemaVersion: vi.fn(),
};

async function renderBackup() {
  const view = renderHook(() => useBackup());
  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

describe("useBackup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.values(PREFERENCE_KEYS)) {
      window.localStorage.removeItem(key);
    }

    repository.exportData.mockResolvedValue(emptyData());
    repository.counts.mockResolvedValue([
      { key: "attractions", label: "Attractions", count: 2 },
      { key: "ratings", label: "Ratings", count: 1 },
    ]);
    repository.replaceAll.mockResolvedValue(undefined);
    repository.appliedSchemaVersion.mockResolvedValue(5);

    mockedCreateRepository.mockReturnValue(repository);
    mockedGetDatabase.mockResolvedValue({} as never);
    vi.mocked(writeSafetyBackup).mockResolvedValue("C:/AppData/backups/before-import.json");
    mockedImport.mockResolvedValue({
      safetyBackupPath: "C:/AppData/backups/before-import.json",
      previousData: emptyData(),
    });
  });

  it("reports what's currently stored", async () => {
    const { result } = await renderBackup();

    expect(result.current.currentTotal).toBe(3);
    expect(result.current.appliedSchemaVersion).toBe(5);
  });

  it("writes a versioned, timestamped file", async () => {
    mockedSave.mockResolvedValue("C:/Users/me/haunt-ranker-backup.json");
    const { result } = await renderBackup();

    await act(async () => {
      await result.current.exportBackup();
    });

    const [contents, suggestedName] = mockedSave.mock.calls[0];
    const written = JSON.parse(contents) as Record<string, unknown>;
    expect(written.formatVersion).toBe(1);
    expect(written.appVersion).toBe("0.1.0");
    expect(written.schemaVersion).toBe(SCHEMA_VERSION);
    expect(typeof written.exportedAt).toBe("string");
    expect(suggestedName).toMatch(/^haunt-ranker-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json$/);
    expect(result.current.exportedPath).toBe("C:/Users/me/haunt-ranker-backup.json");
  });

  it("carries the preferences worth transferring, and not Admin Mode", async () => {
    window.localStorage.setItem(PREFERENCE_KEYS.ambientEffects, "false");
    window.localStorage.setItem(PREFERENCE_KEYS.adminMode, "true");
    mockedSave.mockResolvedValue("C:/backup.json");
    const { result } = await renderBackup();

    await act(async () => {
      await result.current.exportBackup();
    });

    const written = JSON.parse(mockedSave.mock.calls[0][0]) as { preferences: object };
    expect(written.preferences).toEqual({ ambientEffects: false });
  });

  it("says nothing when the save dialog is dismissed", async () => {
    mockedSave.mockResolvedValue(null);
    const { result } = await renderBackup();

    await act(async () => {
      await result.current.exportBackup();
    });

    expect(result.current.message).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("refuses a corrupt file without going anywhere near the database", async () => {
    mockedOpen.mockResolvedValue({ path: "C:/bad.json", text: "{not json" });
    const { result } = await renderBackup();

    await act(async () => {
      await result.current.chooseImportFile();
    });

    expect(result.current.validationErrors[0]).toMatch(/isn't valid JSON/);
    expect(result.current.pendingImport).toBeNull();
    expect(mockedImport).not.toHaveBeenCalled();
  });

  it("stages a valid file for confirmation rather than importing it", async () => {
    mockedOpen.mockResolvedValue({ path: "C:/good.json", text: backupText() });
    const { result } = await renderBackup();

    await act(async () => {
      await result.current.chooseImportFile();
    });

    expect(result.current.pendingImport?.path).toBe("C:/good.json");
    expect(result.current.pendingImport?.summary.totalRows).toBe(1);
    expect(mockedImport).not.toHaveBeenCalled();
  });

  it("imports only once confirmed, and reports where the previous data went", async () => {
    mockedOpen.mockResolvedValue({ path: "C:/good.json", text: backupText() });
    const { result } = await renderBackup();

    await act(async () => {
      await result.current.chooseImportFile();
    });
    await act(async () => {
      await result.current.confirmImport();
    });

    expect(mockedImport).toHaveBeenCalledOnce();
    expect(result.current.importResult?.safetyBackupPath).toBe(
      "C:/AppData/backups/before-import.json",
    );
    expect(result.current.pendingImport).toBeNull();
    // Counts are read again, so the panel isn't describing data that's gone.
    expect(repository.counts).toHaveBeenCalledTimes(2);
  });

  it("applies the preferences the backup carried", async () => {
    mockedOpen.mockResolvedValue({
      path: "C:/good.json",
      text: backupText({ ambientEffects: false, motion: "reduce", attractionViewMode: "compact" }),
    });
    const { result } = await renderBackup();

    await act(async () => {
      await result.current.chooseImportFile();
    });
    await act(async () => {
      await result.current.confirmImport();
    });

    expect(window.localStorage.getItem(PREFERENCE_KEYS.ambientEffects)).toBe("false");
    expect(window.localStorage.getItem(PREFERENCE_KEYS.motion)).toBe("reduce");
    expect(window.localStorage.getItem(PREFERENCE_KEYS.attractionViewMode)).toBe("compact");
  });

  it("surfaces a failed import instead of claiming success", async () => {
    mockedImport.mockRejectedValue(
      new Error(
        "UNIQUE constraint failed. Nothing was changed — your data was put back as it was.",
      ),
    );
    mockedOpen.mockResolvedValue({ path: "C:/good.json", text: backupText() });
    const { result } = await renderBackup();

    await act(async () => {
      await result.current.chooseImportFile();
    });
    await act(async () => {
      await result.current.confirmImport();
    });

    expect(result.current.error).toMatch(/put back as it was/);
    expect(result.current.importResult).toBeNull();
  });

  it("forgets a staged import when it's cancelled", async () => {
    mockedOpen.mockResolvedValue({ path: "C:/good.json", text: backupText() });
    const { result } = await renderBackup();

    await act(async () => {
      await result.current.chooseImportFile();
    });
    act(() => {
      result.current.cancelImport();
    });

    expect(result.current.pendingImport).toBeNull();
    expect(mockedImport).not.toHaveBeenCalled();
  });
});
