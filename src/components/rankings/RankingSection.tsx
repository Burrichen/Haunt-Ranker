import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import "./RankingSection.css";

export interface RankingSectionProps {
  title: string;
  count: number;
  description: string;
  children: ReactNode;
}

/**
 * A collapsed-by-default list that sits outside the ranking — unrated
 * attractions, and rated ones the user hasn't placed yet. Collapsed so it
 * doesn't compete with the ranking, but always showing its count so it's
 * obvious those attractions exist and where they went.
 */
export function RankingSection({ title, count, description, children }: RankingSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="ranking-section">
      <button
        type="button"
        className="ranking-section__toggle"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span aria-hidden="true" className="ranking-section__chevron">
          {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </span>
        <span className="ranking-section__title">{title}</span>
        <span className="ranking-section__count">{count}</span>
      </button>
      {isOpen && (
        <div className="ranking-section__body">
          <p className="ranking-section__description">{description}</p>
          {children}
        </div>
      )}
    </section>
  );
}
