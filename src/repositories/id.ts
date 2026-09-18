import type { EntityId } from "../models/common";

/** Uses the global Web Crypto API — available in both the WebView2 bundle and Node/tests. */
export function generateId(): EntityId {
  return crypto.randomUUID();
}
