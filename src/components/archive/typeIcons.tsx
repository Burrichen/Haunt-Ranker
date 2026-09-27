import { DoorOpen, Drama, Sparkles, TreePine } from "lucide-react";
import type { ComponentType, ReactElement } from "react";
import type { AttractionType } from "../../models/attraction";

/**
 * A mark per category of experience — a door for a walk-through, a tree for
 * a zone, masks for a show.
 *
 * Per *category*, not per haunt: a haunt names its experiences whatever it
 * likes, and the icon follows what kind of thing it is. That keeps an
 * imported haunt looking like part of the app rather than like an import.
 */
export const ATTRACTION_TYPE_ICONS: Record<
  AttractionType,
  ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  house: DoorOpen,
  scare_zone: TreePine,
  show: Drama,
  other: Sparkles,
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
  const Icon = ATTRACTION_TYPE_ICONS[type] ?? ATTRACTION_TYPE_ICONS.other;
  return <Icon {...props} />;
}

/** The accent a category reads in: walk-throughs orange, zones purple. */
export function attractionTypeVariant(type: AttractionType): "orange" | "purple" | "neutral" {
  if (type === "house") {
    return "orange";
  }
  if (type === "scare_zone") {
    return "purple";
  }
  return "neutral";
}
