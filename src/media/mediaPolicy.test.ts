import { describe, expect, it } from "vitest";
import type { MediaDistribution, MediaType } from "../models/media";
import { artworkFit, chooseArtwork, mayDisplayInline, referenceLink } from "./mediaPolicy";

const item = (id: string, mediaType: MediaType, distribution: MediaDistribution = "local") => ({
  id,
  mediaType,
  distribution,
});

describe("mayDisplayInline", () => {
  it("shows what the app holds — a local copy or an approved asset — and nothing else", () => {
    expect(mayDisplayInline({ distribution: "local" })).toBe(true);
    expect(mayDisplayInline({ distribution: "bundled" })).toBe(true);
    // Never fetched from anyone's server: the owner's, or a third party's.
    expect(mayDisplayInline({ distribution: "reference" })).toBe(false);
    expect(mayDisplayInline({ distribution: "unclear" })).toBe(false);
  });
});

describe("chooseArtwork", () => {
  it("prefers a poster for an attraction and key art for a season", () => {
    const media = [item("logo", "logo"), item("art", "event_artwork"), item("poster", "poster")];

    expect(chooseArtwork(media, "attraction")?.id).toBe("poster");
    expect(chooseArtwork(media, "season")?.id).toBe("art");
  });

  it("uses a logo only when there is nothing else", () => {
    expect(
      chooseArtwork([item("logo", "logo"), item("photo", "local_image")], "attraction")?.id,
    ).toBe("photo");
    expect(chooseArtwork([item("logo", "logo")], "attraction")?.id).toBe("logo");
  });

  it("never makes a map into card artwork", () => {
    expect(chooseArtwork([item("map", "map")], "season")).toBeNull();
  });

  it("skips what it holds no copy of, even when it's the better kind", () => {
    const media = [item("poster", "poster", "reference"), item("promo", "promotional_image")];

    expect(chooseArtwork(media, "attraction")?.id).toBe("promo");
    expect(chooseArtwork([item("poster", "poster", "unclear")], "attraction")).toBeNull();
  });
});

describe("artworkFit and referenceLink", () => {
  it("shows a logo whole and everything else filling the frame", () => {
    expect(artworkFit({ mediaType: "logo" })).toBe("contain");
    expect(artworkFit({ mediaType: "poster" })).toBe("cover");
  });

  it("offers a link only for what isn't shown", () => {
    expect(referenceLink({ url: "https://example.com/a", distribution: "reference" })).toBe(
      "https://example.com/a",
    );
    expect(referenceLink({ url: "https://example.com/a", distribution: "local" })).toBeNull();
  });
});
