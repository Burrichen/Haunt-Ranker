import { DoorOpen } from "lucide-react";
import type { ComponentType, ReactElement } from "react";
import type { AttractionType } from "../../models/attraction";

/**
 * A mark per category of experience — a door for a walk-through, which is
 * the only category the app shows.
 *
 * Per *category*, not per haunt: HHN's Houses and Knott's Mazes are the same
 * kind of thing, so they share a mark.
 */
export const ATTRACTION_TYPE_ICONS: Record<
  AttractionType,
  ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  house: DoorOpen,
};

/**
 * The mark for a category, as an element.
 *
 * Returns the rendered icon rather than the component behind it: a
 * component built during a render is a new type every time, which costs
 * React the node it already has.
 */
export function attractionTypeIcon(
  type: AttractionType,
  props: { size?: number; strokeWidth?: number } = {},
): ReactElement {
  const Icon = ATTRACTION_TYPE_ICONS[type] ?? DoorOpen;
  return <Icon {...props} />;
}

/** The accent a category reads in: walk-throughs orange. */
export function attractionTypeVariant(type: AttractionType): "accent" | "neutral" {
  return type === "house" ? "accent" : "neutral";
}
