import { useState } from "react";
import type { Note } from "../../models/note";
import { RATING_MIN, RATING_TOTAL_MAX, type Rating, type RatingInput } from "../../models/rating";
import { formatScore } from "../../utils/formatScore";
import { Button, Modal, ScoreMeter, Textarea } from "../ui";
import "./ReviewEditor.css";

export interface ReviewEditorProps {
  attractionName: string;
  /** The saved review being edited, or null when rating for the first time. */
  rating: Rating | null;
  note: Note | null;
  onSave: (input: RatingInput, note: string) => Promise<void>;
  onClose: () => void;
}

/**
 * The review editor, in a modal so three meters and a real notes field get
 * room the wiki's sidebar can't give them.
 *
 * Mounted only while open, so the draft starts from the saved values every
 * time without a syncing effect. Nothing here touches the database until
 * Save: moving a meter — including dragging across one — only changes local
 * draft state, and every exit path that would discard edits (Cancel,
 * Escape, clicking the overlay) is intercepted while there are unsaved
 * changes.
 */
export function ReviewEditor({ attractionName, rating, note, onSave, onClose }: ReviewEditorProps) {
  const [theme, setTheme] = useState(rating?.theme ?? RATING_MIN);
  const [fun, setFun] = useState(rating?.fun ?? RATING_MIN);
  const [fear, setFear] = useState(rating?.fear ?? RATING_MIN);
  const [noteText, setNoteText] = useState(note?.note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const total = theme + fun + fear;
  const isDirty =
    theme !== (rating?.theme ?? RATING_MIN) ||
    fun !== (rating?.fun ?? RATING_MIN) ||
    fear !== (rating?.fear ?? RATING_MIN) ||
    noteText.trim() !== (note?.note ?? "");

  const requestClose = () => {
    if (isSaving) {
      return;
    }
    if (confirmingDiscard) {
      setConfirmingDiscard(false);
      return;
    }
    if (isDirty) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await onSave({ theme, fun, fear }, noteText);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Couldn't save your review.");
      setIsSaving(false);
      return;
    }
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={requestClose}
      title={rating ? "Edit Review" : "Rate this attraction"}
      description={attractionName}
      footer={
        confirmingDiscard ? (
          <>
            <Button variant="secondary" onClick={() => setConfirmingDiscard(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={onClose}>
              Discard changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={requestClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleSave()} isLoading={isSaving}>
              Save review
            </Button>
          </>
        )
      }
    >
      <div className="review-editor">
        {confirmingDiscard && (
          <p className="review-editor__discard" role="alert">
            You have unsaved changes to this review. Discard them?
          </p>
        )}

        <div className="review-editor__meters">
          <ScoreMeter label="Theme" value={theme} onChange={setTheme} />
          <ScoreMeter label="Fun" value={fun} onChange={setFun} />
          <ScoreMeter label="Fear" value={fear} onChange={setFear} />
        </div>

        {/* Derived from the three meters above and never editable — there is
            deliberately no control for it. */}
        <div className="review-editor__total">
          <span className="review-editor__total-label">Total</span>
          <span className="review-editor__total-value">
            {formatScore(total)} / {RATING_TOTAL_MAX}
          </span>
        </div>

        <Textarea
          label="Notes (optional)"
          placeholder="What stood out? Anything you want to remember next year?"
          value={noteText}
          rows={5}
          onChange={(event) => setNoteText(event.target.value)}
        />

        {error && (
          <p className="review-editor__error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
