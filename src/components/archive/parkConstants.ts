import { Palmtree, Star } from "lucide-react";
import type { ComponentType } from "react";
import type { ParkId } from "../../models/park";

/** Professional, non-emoji icons standing in for each park — a star for Hollywood, a palm tree for Orlando. */
export const PARK_ICONS: Record<ParkId, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  hollywood: Star,
  orlando: Palmtree,
};

export const PARK_NAMES: Record<ParkId, string> = {
  hollywood: "Hollywood",
  orlando: "Orlando",
};
