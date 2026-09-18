import { openUrl } from "@tauri-apps/plugin-opener";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Source } from "../../models/source";
import { SourceList } from "./SourceList";

vi.mock("@tauri-apps/plugin-opener", () => ({
  openUrl: vi.fn().mockResolvedValue(undefined),
}));

const mockedOpenUrl = vi.mocked(openUrl);

function makeSource(overrides: Partial<Source> = {}): Source {
  return {
    id: "s1",
    sourceType: "youtube",
    title: "Behind the Scenes: Moonlight Manor",
    url: "https://youtube.com/watch?v=abc123",
    publisher: "Universal",
    publishedAt: null,
    notes: null,
    isSample: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("SourceList", () => {
  beforeEach(() => {
    mockedOpenUrl.mockClear();
  });

  it("identifies a YouTube source as YouTube", () => {
    render(<SourceList sources={[makeSource()]} />);
    expect(screen.getByText("YouTube")).toBeInTheDocument();
  });

  it("opens a source's URL via the Tauri opener plugin, not an in-app navigation, when clicked", () => {
    render(<SourceList sources={[makeSource()]} />);
    fireEvent.click(screen.getByRole("button", { name: /Behind the Scenes/i }));
    expect(mockedOpenUrl).toHaveBeenCalledWith("https://youtube.com/watch?v=abc123");
  });

  it("renders a source with no URL as plain text, not a button", () => {
    render(<SourceList sources={[makeSource({ url: null, title: "Word of mouth" })]} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("Word of mouth")).toBeInTheDocument();
  });

  it("shows the publisher when present", () => {
    render(<SourceList sources={[makeSource({ publisher: "Universal" })]} />);
    expect(screen.getByText("Universal")).toBeInTheDocument();
  });
});
