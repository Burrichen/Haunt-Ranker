import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../components/layout/Sidebar";
import { useBackup, type BackupState } from "../hooks/useBackup";
import { useSampleData, type SampleDataState } from "../hooks/useSampleData";
import { PREFERENCE_KEYS } from "../preferences/localPreferences";
import { Settings } from "./Settings";

vi.mock("../hooks/useBackup");
vi.mock("../hooks/useSampleData");

const mockedUseBackup = vi.mocked(useBackup);
const mockedUseSampleData = vi.mocked(useSampleData);

const STORAGE_KEY = PREFERENCE_KEYS.adminMode;

function makeBackupState(overrides: Partial<BackupState> = {}): BackupState {
  return {
    isLoading: false,
    isBusy: false,
    currentCounts: [
      { key: "attractions", label: "Attractions", count: 7 },
      { key: "ratings", label: "Ratings", count: 3 },
      { key: "notes", label: "Notes", count: 0 },
    ],
    currentTotal: 10,
    appliedSchemaVersion: 5,
    error: null,
    validationErrors: [],
    message: null,
    exportedPath: null,
    pendingImport: null,
    importResult: null,
    exportBackup: vi.fn().mockResolvedValue(undefined),
    chooseImportFile: vi.fn().mockResolvedValue(undefined),
    confirmImport: vi.fn().mockResolvedValue(undefined),
    cancelImport: vi.fn(),
    dismissMessages: vi.fn(),
    ...overrides,
  };
}

function makeSampleDataState(overrides: Partial<SampleDataState> = {}): SampleDataState {
  return {
    isAvailable: false,
    isLoading: false,
    isBusy: false,
    hasSampleData: false,
    error: null,
    message: null,
    reseed: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function renderSettings(
  backup: Partial<BackupState> = {},
  sampleData: Partial<SampleDataState> = {},
) {
  const backupState = makeBackupState(backup);
  const sampleState = makeSampleDataState(sampleData);
  mockedUseBackup.mockReturnValue(backupState);
  mockedUseSampleData.mockReturnValue(sampleState);
  render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
  );
  return { backup: backupState, sampleData: sampleState };
}

describe("Settings", () => {
  beforeEach(() => {
    mockedUseBackup.mockReset();
    mockedUseSampleData.mockReset();
  });

  afterEach(() => {
    for (const key of Object.values(PREFERENCE_KEYS)) {
      window.localStorage.removeItem(key);
    }
    delete document.documentElement.dataset.reduceMotion;
  });

  describe("appearance", () => {
    it("turns the ambient background off and remembers it", () => {
      renderSettings();

      const toggle = screen.getByRole("switch", { name: "Ambient effects" });
      expect(toggle).toHaveAttribute("aria-checked", "true");

      fireEvent.click(toggle);

      expect(screen.getByRole("switch", { name: "Ambient effects" })).toHaveAttribute(
        "aria-checked",
        "false",
      );
      expect(window.localStorage.getItem(PREFERENCE_KEYS.ambientEffects)).toBe("false");
    });

    it("follows the system motion setting until told otherwise", () => {
      renderSettings();

      const motion = within(screen.getByRole("radiogroup", { name: "Motion" }));
      expect(motion.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
      expect(document.documentElement.dataset.reduceMotion).toBeUndefined();
    });

    it("reduces motion when asked, and says so to the whole app", () => {
      renderSettings();

      fireEvent.click(
        within(screen.getByRole("radiogroup", { name: "Motion" })).getByRole("radio", {
          name: "Reduce",
        }),
      );

      expect(document.documentElement.dataset.reduceMotion).toBe("true");
      expect(window.localStorage.getItem(PREFERENCE_KEYS.motion)).toBe("reduce");
    });

    it("can keep full motion even where the system asks for less", () => {
      renderSettings();

      fireEvent.click(
        within(screen.getByRole("radiogroup", { name: "Motion" })).getByRole("radio", {
          name: "Full",
        }),
      );

      // Not simply "absent": the explicit false is what overrides the OS
      // media query in CSS.
      expect(document.documentElement.dataset.reduceMotion).toBe("false");
    });

    it("sets the view attraction lists open in", () => {
      renderSettings();

      fireEvent.click(
        within(screen.getByRole("radiogroup", { name: "Attraction lists" })).getByRole("radio", {
          name: "Compact",
        }),
      );

      expect(window.localStorage.getItem(PREFERENCE_KEYS.attractionViewMode)).toBe("compact");
    });
  });

  describe("data", () => {
    it("exports and imports through the file system, with no account anywhere", () => {
      const { backup } = renderSettings();

      expect(screen.getByText(/no account and nothing is uploaded/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Export Haunt Ranker" }));
      expect(backup.exportBackup).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByRole("button", { name: "Import Haunt Ranker" }));
      expect(backup.chooseImportFile).toHaveBeenCalledOnce();
    });

    it("shows where a backup was written", () => {
      renderSettings({ message: "Backup saved.", exportedPath: "C:/Users/me/backup.json" });

      expect(screen.getByText("C:/Users/me/backup.json")).toBeInTheDocument();
    });

    it("reports what's stored now", () => {
      renderSettings();

      expect(screen.getByText("Attractions")).toBeInTheDocument();
      expect(screen.getByText("7")).toBeInTheDocument();
      // A table with nothing in it isn't worth a line.
      expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    });

    it("says nothing changed when a file is refused", () => {
      renderSettings({
        validationErrors: ["ratings[0].theme is out of range: 9."],
      });

      expect(screen.getByText(/wasn.t imported — nothing here has changed/i)).toBeInTheDocument();
      expect(screen.getByText("ratings[0].theme is out of range: 9.")).toBeInTheDocument();
    });

    it("names the database and both versions it depends on", () => {
      renderSettings();

      expect(screen.getByText(/sqlite:haunt-ranker\.db/)).toBeInTheDocument();
      expect(screen.getByText(/schema version 5/)).toBeInTheDocument();
      expect(screen.getByText(/backup format v1/)).toBeInTheDocument();
    });
  });

  describe("the import preview", () => {
    const pendingImport = {
      path: "C:/Users/me/haunt-ranker-backup.json",
      backup: {
        formatVersion: 1,
        appVersion: "0.1.0",
        schemaVersion: 5,
        exportedAt: "2026-09-18T12:00:00.000Z",
        preferences: {},
        data: {} as never,
      },
      summary: {
        formatVersion: 1,
        appVersion: "0.1.0",
        schemaVersion: 5,
        exportedAt: "2026-09-18T12:00:00.000Z",
        counts: [
          { key: "attractions" as const, label: "Attractions", count: 9 },
          { key: "ratings" as const, label: "Ratings", count: 4 },
          { key: "notes" as const, label: "Notes", count: 0 },
        ],
        totalRows: 13,
      },
    };

    it("puts what's in the file beside what's already here", () => {
      renderSettings({ pendingImport });

      const dialog = within(screen.getByRole("dialog"));
      expect(dialog.getByText(pendingImport.path)).toBeInTheDocument();

      const attractions = dialog.getByRole("row", { name: /Attractions/ });
      expect(within(attractions).getByText("7")).toBeInTheDocument();
      expect(within(attractions).getByText("9")).toBeInTheDocument();
    });

    it("warns that this replaces everything before anything is replaced", () => {
      renderSettings({ pendingImport });

      expect(
        screen.getByText(/replaces all archive records, ratings, notes and rankings/i),
      ).toBeInTheDocument();
      expect(screen.getByText(/copy of what's here now is saved first/i)).toBeInTheDocument();
    });

    it("only imports once the user says so", () => {
      const { backup } = renderSettings({ pendingImport });
      const dialog = within(screen.getByRole("dialog"));

      fireEvent.click(dialog.getByRole("button", { name: "Cancel" }));
      expect(backup.cancelImport).toHaveBeenCalledOnce();
      expect(backup.confirmImport).not.toHaveBeenCalled();

      fireEvent.click(dialog.getByRole("button", { name: "Replace my data" }));
      expect(backup.confirmImport).toHaveBeenCalledOnce();
    });

    it("tells the user where their previous data went afterwards", () => {
      renderSettings({
        importResult: {
          summary: pendingImport.summary,
          safetyBackupPath: "C:/AppData/Haunt Ranker/backups/before-import-2026-09-18-143201.json",
        },
      });

      expect(screen.getByText(/Restored 13 records/)).toBeInTheDocument();
      expect(
        screen.getByText("C:/AppData/Haunt Ranker/backups/before-import-2026-09-18-143201.json"),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reload to see it" })).toBeInTheDocument();
    });
  });

  describe("sample data", () => {
    it("is not offered in a normal build", () => {
      renderSettings({}, { isAvailable: false });

      expect(screen.queryByText("Sample data")).not.toBeInTheDocument();
    });

    it("can be reset or cleared in a development build", () => {
      const { sampleData } = renderSettings({}, { isAvailable: true, hasSampleData: true });

      expect(screen.getByText("Development build")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Reset sample data" }));
      expect(sampleData.reseed).toHaveBeenCalledOnce();

      fireEvent.click(screen.getByRole("button", { name: "Clear sample data" }));
      expect(sampleData.clear).toHaveBeenCalledOnce();
    });

    it("can't clear what isn't there", () => {
      renderSettings({}, { isAvailable: true, hasSampleData: false });

      expect(screen.getByRole("button", { name: "Clear sample data" })).toBeDisabled();
    });
  });

  describe("about", () => {
    it("states the versions a backup depends on", () => {
      renderSettings();

      expect(screen.getByText("Haunt Ranker")).toBeInTheDocument();
      expect(screen.getByText("Data schema")).toBeInTheDocument();
      expect(screen.getByText("Backup format")).toBeInTheDocument();
    });

    it("says plainly that nothing leaves the machine", () => {
      renderSettings();

      expect(screen.getByText(/no account and no server/i)).toBeInTheDocument();
    });
  });

  describe("admin", () => {
    it("offers Admin Mode, off by default", () => {
      renderSettings();

      const toggle = screen.getByRole("switch", { name: "Admin Mode" });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("says that editing never touches the user's own ratings", () => {
      renderSettings();
      expect(screen.getByText(/ratings and notes are never touched/i)).toBeInTheDocument();
    });

    it("turns Admin Mode on and persists it", () => {
      renderSettings();

      fireEvent.click(screen.getByRole("switch", { name: "Admin Mode" }));

      expect(screen.getByRole("switch", { name: "Admin Mode" })).toHaveAttribute(
        "aria-checked",
        "true",
      );
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe("true");
    });

    it("points at where the editing tools appear once it's on", () => {
      window.localStorage.setItem(STORAGE_KEY, "true");
      renderSettings();

      expect(screen.getByRole("link", { name: "Admin Mode" })).toHaveAttribute("href", "/admin");
    });
  });
});

describe("Sidebar", () => {
  afterEach(() => {
    window.localStorage.removeItem(STORAGE_KEY);
  });

  it("does not list Admin Mode while it's off", () => {
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: /Admin Mode/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Settings/ })).toBeInTheDocument();
  });

  it("lists Admin Mode once it's on", () => {
    window.localStorage.setItem(STORAGE_KEY, "true");
    render(
      <MemoryRouter>
        <Sidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Admin Mode/ })).toHaveAttribute("href", "/admin");
  });
});
