import { FerrisWheel, MapPin, Palmtree, Star, Tent, Trees } from "lucide-react";
import type { ComponentType } from "react";
import { DEFAULT_VENUE_ICON, type VenueIcon } from "../../models/park";

/**
 * The marks a venue can be drawn with.
 *
 * Professional, non-emoji, and the app's own: a Haunt Pack chooses a name
 * from this set rather than shipping artwork, so a venue nobody has written
 * code for still gets a mark that belongs to the rest of the interface. An
 * unrecognised name falls back to a plain pin rather than to nothing.
 *
 * The icon is how a card says where something ran, which is why an
 * exclusive attraction needs no "exclusive" label: it simply shows one venue.
 */
export const VENUE_ICON_COMPONENTS: Record<
  VenueIcon,
  ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  star: Star,
  palm: Palmtree,
  "ferris-wheel": FerrisWheel,
  tent: Tent,
  trees: Trees,
  pin: MapPin,
};

export function venueIconComponent(
  icon: VenueIcon | null | undefined,
): ComponentType<{ size?: number; strokeWidth?: number }> {
  return VENUE_ICON_COMPONENTS[icon ?? DEFAULT_VENUE_ICON] ?? VENUE_ICON_COMPONENTS.pin;
}
