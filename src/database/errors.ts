/** Base class for every error the database layer raises. Never a plain string or raw driver error. */
export class DatabaseError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export type ConstraintKind = "check" | "unique" | "foreign_key" | "not_null" | "unknown";

/** A SQL constraint (CHECK, UNIQUE, FOREIGN KEY, NOT NULL) rejected the write. */
export class ConstraintViolationError extends DatabaseError {
  constructor(
    message: string,
    readonly constraint: ConstraintKind,
    cause?: unknown,
  ) {
    super(message, cause);
    this.name = "ConstraintViolationError";
  }
}

/** An update/delete/read targeted a row that doesn't exist. */
export class NotFoundError extends DatabaseError {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" was not found`);
    this.name = "NotFoundError";
  }
}

/**
 * Normalizes a raw error from either driver (`@tauri-apps/plugin-sql`'s
 * IPC rejection, or `node:sqlite` in tests) into a typed DatabaseError so
 * callers can branch on constraint kind instead of parsing strings
 * themselves.
 */
export function toDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  const message = extractMessage(error);

  if (/CHECK constraint failed/i.test(message)) {
    return new ConstraintViolationError(message, "check", error);
  }
  if (/UNIQUE constraint failed/i.test(message)) {
    return new ConstraintViolationError(message, "unique", error);
  }
  if (/FOREIGN KEY constraint failed/i.test(message)) {
    return new ConstraintViolationError(message, "foreign_key", error);
  }
  if (/NOT NULL constraint failed/i.test(message)) {
    return new ConstraintViolationError(message, "not_null", error);
  }

  return new DatabaseError(message, error);
}

/** Runs `operation`, translating any thrown driver error into a typed DatabaseError. */
export async function withDatabaseErrors<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw toDatabaseError(error);
  }
}

function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown database error occurred";
}
