import { useId } from "react";
import type { ReactNode } from "react";
import { Panel } from "../ui";
import "./WikiSection.css";

export interface WikiSectionProps {
  title: string;
  children: ReactNode;
}

/**
 * One article section. Callers decide whether a section has anything to
 * show and only render `WikiSection` when it does — there is no "Unknown"
 * placeholder state here by design.
 */
export function WikiSection({ title, children }: WikiSectionProps) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId}>
      <Panel elevated padding="lg" className="wiki-section">
        <h2 id={titleId} className="wiki-section__title">
          {title}
        </h2>
        <div className="wiki-section__body">{children}</div>
      </Panel>
    </section>
  );
}
