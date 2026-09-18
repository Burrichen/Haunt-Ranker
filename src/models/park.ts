/** Fixed, small lookup table — seeded once, never user-editable. */
export const PARK_IDS = {
  hollywood: "hollywood",
  orlando: "orlando",
} as const;

export type ParkId = (typeof PARK_IDS)[keyof typeof PARK_IDS];

export interface Park {
  id: ParkId;
  name: string;
}
