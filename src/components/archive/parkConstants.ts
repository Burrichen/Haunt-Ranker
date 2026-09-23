import { FerrisWheel, Palmtree, Star } from "lucide-react";
import type { ComponentType } from "react";
import type { ParkId } from "../../models/park";

/**
 * Professional, non-emoji icons standing in for each venue — a star for
 * Hollywood, a palm tree for Orlando, a fairground wheel for Knott's Berry
 * Farm. The icon is how a card says where something ran, which is why an
 * exclusive attraction needs no "exclusive" label: it simply shows one venue.
 */
export const PARK_ICONS: Record<ParkId, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  hollywood: Star,
  orlando: Palmtree,
  "knotts-berry-farm": FerrisWheel,
};

export const PARK_NAMES: Record<ParkId, string> = {
  hollywood: "Hollywood",
  orlando: "Orlando",
  "knotts-berry-farm": "Knott's Berry Farm",
};

/**
 * What the icon means, spelled out. A single card can carry two of these —
 * one attraction that ran at both parks is still one record — so the
 * tooltip says where it ran rather than leaving the icon to be guessed at.
 */
export const PARK_VENUE_NAMES: Record<ParkId, string> = {
  hollywood: "Universal Studios Hollywood",
  orlando: "Universal Orlando Resort",
  "knotts-berry-farm": "Knott's Berry Farm, Buena Park",
};
