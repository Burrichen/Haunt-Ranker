import { BookOpen, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CharacterGrid,
  DetailsPanel,
  MediaGallery,
  MyReview,
  RelatedAttractions,
  SourceList,
  WikiHeader,
  WikiSection,
} from "../components/wiki";
import { Button, EmptyState, LoadingState, PageHeader } from "../components/ui";
import { useAdminMode } from "../hooks/useAdminMode";
import { useAttractionWiki } from "../hooks/useAttractionWiki";
import "./AttractionWiki.css";

export function AttractionWiki() {
  const { attractionId } = useParams<{ attractionId: string }>();
  const navigate = useNavigate();
  const [adminMode] = useAdminMode();
  const {
    isLoading,
    error,
    notFound,
    attraction,
    eventYear,
    media,
    characters,
    sources,
    rating,
    note,
    relatedItems,
    saveReview,
    clearRating,
  } = useAttractionWiki(attractionId);

  if (isLoading) {
    return <LoadingState label="Loading attraction…" />;
  }

  if (error || notFound || !attraction) {
    return (
      <>
        <PageHeader title="Attraction" backTo="/" />
        <EmptyState
          icon={<BookOpen size={24} />}
          title="Attraction not found"
          description={error ?? "This attraction may have been removed."}
        />
      </>
    );
  }

  const backTo = attraction.attractionType === "house" ? "/houses" : "/scare-zones";
  const heroMedia = media.find((item) => item.mediaType === "poster") ?? media[0] ?? null;
  const posterUrl = heroMedia ? (heroMedia.url ?? heroMedia.localPath) : null;
  const galleryMedia = heroMedia ? media.filter((item) => item.id !== heroMedia.id) : media;
  const hasEventDetails = Boolean(eventYear && (eventYear.description || eventYear.sourceNotes));

  return (
    <div className="attraction-wiki">
      <WikiHeader
        attraction={attraction}
        eventYear={eventYear}
        posterUrl={posterUrl}
        backTo={backTo}
      />

      {/* The only editing affordance on a reading page, and only once the
          user has asked for one in Settings. */}
      {adminMode && (
        <div className="attraction-wiki__admin">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Pencil size={14} />}
            onClick={() => navigate(`/admin/attractions/${attraction.id}`)}
          >
            Edit this attraction
          </Button>
        </div>
      )}

      <div className="attraction-wiki__layout">
        <div className="attraction-wiki__main">
          {attraction.fullOverview && (
            <WikiSection title="Overview">
              <p>{attraction.fullOverview}</p>
            </WikiSection>
          )}

          {attraction.storyLore && (
            <WikiSection title="Story / Lore">
              <p>{attraction.storyLore}</p>
            </WikiSection>
          )}

          {attraction.experienceDescription && (
            <WikiSection title="Experience">
              <p>{attraction.experienceDescription}</p>
            </WikiSection>
          )}

          {characters.length > 0 && (
            <WikiSection title="Characters / Creatures">
              <CharacterGrid characters={characters} />
            </WikiSection>
          )}

          {attraction.developmentNotes && (
            <WikiSection title="Development">
              <p>{attraction.developmentNotes}</p>
            </WikiSection>
          )}

          {hasEventDetails && eventYear && (
            <WikiSection title="Event Details">
              <p className="attraction-wiki__event-name">{eventYear.name}</p>
              {eventYear.description && <p>{eventYear.description}</p>}
              {eventYear.sourceNotes && (
                <p className="attraction-wiki__event-notes">{eventYear.sourceNotes}</p>
              )}
            </WikiSection>
          )}

          {relatedItems.length > 0 && (
            <WikiSection title="Related Attractions">
              <RelatedAttractions items={relatedItems} />
            </WikiSection>
          )}

          {galleryMedia.length > 0 && (
            <WikiSection title="Media">
              <MediaGallery media={galleryMedia} />
            </WikiSection>
          )}

          {sources.length > 0 && (
            <WikiSection title="Sources">
              <SourceList sources={sources} />
            </WikiSection>
          )}
        </div>

        <aside className="attraction-wiki__sidebar">
          <DetailsPanel attraction={attraction} eventYear={eventYear} relatedItems={relatedItems} />
          <MyReview
            attractionName={attraction.name}
            rating={rating}
            note={note}
            onSave={saveReview}
            onClear={clearRating}
          />
        </aside>
      </div>
    </div>
  );
}
