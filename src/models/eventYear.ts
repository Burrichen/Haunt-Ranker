import type { EntityId, Timestamped } from "./common";

export interface EventYear extends Timestamped {
  id: EntityId;
  calendarYear: number;
  name: string;
  description: string | null;
  sourceNotes: string | null;
  /** True for fictional development/sample data — see src/database/devSampleData.ts. */
  isSample: boolean;
}

export interface EventYearInput {
  calendarYear: number;
  name: string;
  description?: string | null;
  sourceNotes?: string | null;
  /** Defaults to false. Only the dev sample seed should ever pass true. */
  isSample?: boolean;
}
