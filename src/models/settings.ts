/** A local application setting, stored as a JSON-encoded value. */
export interface Setting<T = unknown> {
  key: string;
  value: T;
  updatedAt: string;
}
