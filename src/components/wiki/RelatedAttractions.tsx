import { AttractionPreviewCard } from "../archive";
import type { RelationType } from "../../models/attractionRelation";
import type { RelatedAttractionItem } from "../../hooks/useAttractionWiki";
import { Badge } from "../ui";
import "./RelatedAttractions.css";

export interface RelatedAttractionsProps {
  items: RelatedAttractionItem[];
}

const RELATION_LABEL: Record<RelationType, string> = {
  sequel: "Sequel",
  previous_version: "Previous Version",
  same_franchise: "Same Franchise",
  related_concept: "Related Concept",
};

/** A grid of clickable cards — one per related attraction, labeled with how it relates. */
export function RelatedAttractions({ items }: RelatedAttractionsProps) {
  return (
    <div className="related-attractions">
      {items.map((item) => (
        <div key={item.relation.id} className="related-attractions__item">
          <Badge variant="neutral" className="related-attractions__relation">
            {RELATION_LABEL[item.relation.relationType]}
          </Badge>
          <AttractionPreviewCard
            attraction={item.attraction}
            eventYear={item.eventYear}
            rating={item.rating}
          />
        </div>
      ))}
    </div>
  );
}
