import type { EntityId, Identifiable } from "../models/common";

/**
 * The contract most domain repositories implement, keeping React
 * components decoupled from SQL and the Tauri SQL plugin. `TInput`
 * defaults to `Omit<T, "id">` but is overridden wherever an entity's
 * create/update shape genuinely differs from itself minus an id — e.g.
 * `Media`, whose input takes a discriminated `owner` instead of the two
 * nullable FK columns the stored entity has.
 */
export interface Repository<T extends Identifiable, TInput = Omit<T, "id">> {
  getAll(): Promise<T[]>;
  getById(id: EntityId): Promise<T | null>;
  create(input: TInput): Promise<T>;
  update(id: EntityId, input: Partial<TInput>): Promise<T>;
  delete(id: EntityId): Promise<void>;
}
