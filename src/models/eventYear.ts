import type { EntityId, Timestamped } from "./common";

export interface EventYear extends Timestamped {
  id: EntityId;
  calendarYear: number;
  name: string;
  description: string | null;
  sourceNotes: string | null;
  /** ISO date the event's first night ran, where it's known. */
  startsOn: string | null;
  /** ISO date of its last night, where it's known. */
  endsOn: string | null;
  /** True for fictional development/sample data — see src/database/devSampleData.ts. */
  isSample: boolean;
}

export interface EventYearInput {
  calendarYear: number;
  name: string;
  description?: string | null;
  sourceNotes?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  /** Defaults to false. Only the dev sample seed should ever pass true. */
  isSample?: boolean;
}
