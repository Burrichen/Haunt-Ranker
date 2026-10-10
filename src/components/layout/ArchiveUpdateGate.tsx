import { Fragment, useEffect, useState, type ReactNode } from "react";
import { runArchiveUpdate } from "../../archive/archiveUpdate";
import { LoadingState } from "../ui";

/**
 * Applies the archive shipped with this version, once per launch.
 *
 * Most launches there's nothing to apply and the pages open straight away.
 * After an upgrade, the content area says it's updating until the new data
 * is in, then remounts so every page reads the updated archive rather than
 * what it loaded a moment before.
 */
export function ArchiveUpdateGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<"checking" | "updating" | "ready">("checking");
  const [generation, setGeneration] = useState(0);

  useEffect(() => {
    let active = true;
    void runArchiveUpdate(() => {
      if (active) {
        setPhase("updating");
      }
    }).then((outcome) => {
      if (!active) {
        return;
      }
      if (outcome.result && outcome.result.applied.length > 0) {
        setGeneration((value) => value + 1);
      }
      setPhase("ready");
    });
    return () => {
      active = false;
    };
  }, []);

  if (phase === "updating") {
    return <LoadingState label="Updating the archive with this version's data…" />;
  }
  return <Fragment key={generation}>{children}</Fragment>;
}
