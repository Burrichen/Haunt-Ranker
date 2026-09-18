import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

// Vitest doesn't expose `afterEach` as a global here (see vite.config.ts —
// `test.globals` is left off in favor of explicit imports), so Testing
// Library's automatic cleanup detection never kicks in. Register it
// ourselves so each test unmounts its render instead of leaking into the
// next one in the same file.
afterEach(() => {
  cleanup();
});

// node:sqlite (used by src/test/createTestDatabase.ts) is still marked
// experimental and logs a warning on first use. It's a deliberate,
// well-understood choice here (see that file), so quiet just this one
// warning rather than the whole warning channel.
process.on("warning", (warning) => {
  if (warning.name === "ExperimentalWarning" && warning.message.includes("SQLite")) {
    return;
  }
  console.warn(warning);
});
