import { useState } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
import type { Note } from "../../models/note";
import { RATING_TOTAL_MAX, type Rating, type RatingInput } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import { Badge, Button, Modal, Panel, ScoreMeter } from "../ui";
import { ReviewEditor } from "./ReviewEditor";
import "./MyReview.css";

export interface MyReviewProps {
  attractionName: string;
  /** `null` means genuinely unrated — never rendered as a score of 0. */
  rating: Rating | null;
  note: Note | null;
  onSave: (input: RatingInput, note: string) => Promise<void>;
  onClear: () => Promise<void>;
}

/**
 * A clearly separate personal area, deliberately not mixed into the factual
 * archive sections around it. Reviewing happens in `ReviewEditor`; this
 * panel shows the saved result and owns the two destructive-ish entry
 * points into it.
 */
export function MyReview({ attractionName, rating, note, onSave, onClear }: MyReviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const handleClear = async () => {
    setIsClearing(true);
    setClearError(null);
    try {
      await onClear();
    } catch (caught) {
      setClearError(caught instanceof Error ? caught.message : "Couldn't clear the rating.");
      setIsClearing(false);
      return;
    }
    setIsClearing(false);
    setIsConfirmingClear(false);
  };

  return (
    <Panel elevated glow="purple" padding="md" className="my-review" aria-label="My Review">
      <h2 className="my-review__title">My Review</h2>

      {rating ? (
        <>
          <div className="my-review__meters">
            <ScoreMeter label="Theme" value={rating.theme} readOnly />
            <ScoreMeter label="Fun" value={rating.fun} readOnly />
            <ScoreMeter label="Fear" value={rating.fear} readOnly />
          </div>
          <div className="my-review__total">
            <span className="my-review__total-label">Total</span>
            <span className="my-review__total-value">
              {formatScore(rating.total)} / {RATING_TOTAL_MAX}
            </span>
          </div>
        </>
      ) : (
        <div className="my-review__unrated">
          <Badge variant="neutral">Not Rated</Badge>
          <p className="my-review__empty">You haven&rsquo;t rated this one yet.</p>
        </div>
      )}

      {note && (
        <div className="my-review__note">
          <h3 className="my-review__note-title">Notes</h3>
          <p className="my-review__note-body">{note.note}</p>
        </div>
      )}

      <div className="my-review__actions">
        {rating ? (
          <>
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<Pencil size={14} />}
              onClick={() => setIsEditing(true)}
            >
              Edit Review
            </Button>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<Trash2 size={14} />}
              onClick={() => setIsConfirmingClear(true)}
            >
              Clear Rating
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="sm"
            leadingIcon={<Star size={14} />}
            onClick={() => setIsEditing(true)}
          >
            Rate this attraction
          </Button>
        )}
      </div>

      {clearError && (
        <p className="my-review__error" role="alert">
          {clearError}
        </p>
      )}

      {isEditing && (
        <ReviewEditor
          attractionName={attractionName}
          rating={rating}
          note={note}
          onSave={onSave}
          onClose={() => setIsEditing(false)}
        />
      )}

      <Modal
        isOpen={isConfirmingClear}
        onClose={() => setIsConfirmingClear(false)}
        title="Clear this rating?"
        description={`${attractionName} goes back to Not Rated — not a score of zero. Your notes are kept.`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsConfirmingClear(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleClear()} isLoading={isClearing}>
              Clear rating
            </Button>
          </>
        }
      />
    </Panel>
  );
}
