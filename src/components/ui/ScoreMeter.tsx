import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { RATING_MAX, RATING_MIN, RATING_VALUES } from "../../models/rating";
import { cn } from "../../utils/cn";
import { formatScore } from "../../utils/formatScore";
import "./ScoreMeter.css";

export interface ScoreMeterProps {
  label: string;
  value: number;
  onChange?: (value: number) => void;
  /** Renders a static meter with no controls — the read-only display of a saved score. */
  readOnly?: boolean;
}

/** The fillable half-point segments: 0.5 … 5. Zero has its own stop at the start of the track. */
const SEGMENT_VALUES = RATING_VALUES.filter((value) => value > RATING_MIN);

/**
 * A segmented 0–5 meter in half-point steps — deliberately not a five-star
 * control, because half-steps across three dimensions have to be readable
 * at a glance, and half-filled stars aren't.
 *
 * Interactive mode is a radiogroup over the eleven valid values rather than
 * an ARIA slider: the values are discrete, it gives every stop (including
 * 0) its own click target and accessible name, and it gets the keyboard
 * conventions users already expect from the app's other segmented control.
 * Dragging across the track is supported as a convenience — it can never
 * save anything on its own, since persisting a review is always an
 * explicit Save in the editor that owns this control.
 */
export function ScoreMeter({ label, value, onChange, readOnly = false }: ScoreMeterProps) {
  const [dragging, setDragging] = useState(false);
  const optionRefs = useRef(new Map<number, HTMLButtonElement | null>());
  const labelId = useId();

  useEffect(() => {
    if (!dragging) {
      return;
    }
    const stopDragging = () => setDragging(false);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    return () => {
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [dragging]);

  const select = (next: number) => {
    if (next !== value) {
      onChange?.(next);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = RATING_VALUES.indexOf(value);
    let next: number;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = RATING_VALUES[Math.min(index + 1, RATING_VALUES.length - 1)];
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = RATING_VALUES[Math.max(index - 1, 0)];
        break;
      case "PageUp":
        next = Math.min(value + 1, RATING_MAX);
        break;
      case "PageDown":
        next = Math.max(value - 1, RATING_MIN);
        break;
      case "Home":
        next = RATING_MIN;
        break;
      case "End":
        next = RATING_MAX;
        break;
      default:
        return;
    }

    event.preventDefault();
    select(next);
    // Radiogroup convention: focus follows selection, so the arrow keys keep
    // working from the newly selected stop.
    optionRefs.current.get(next)?.focus();
  };

  const header = (
    <div className="score-meter__header">
      <span id={labelId} className="score-meter__label">
        {label}
      </span>
      <span className="score-meter__value">{formatScore(value)}</span>
    </div>
  );

  if (readOnly) {
    return (
      <div className="score-meter score-meter--readonly">
        {header}
        <div className="score-meter__track" aria-hidden="true">
          <span className="score-meter__zero score-meter__zero--static">0</span>
          {SEGMENT_VALUES.map((segment) => (
            <span
              key={segment}
              className={cn(
                "score-meter__segment",
                segment <= value && "score-meter__segment--filled",
                segment % 1 === 0 && "score-meter__segment--whole",
              )}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="score-meter">
      {header}
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="score-meter__track"
        onKeyDown={handleKeyDown}
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === RATING_MIN}
          aria-label={formatScore(RATING_MIN)}
          tabIndex={value === RATING_MIN ? 0 : -1}
          ref={(element) => {
            optionRefs.current.set(RATING_MIN, element);
          }}
          className={cn("score-meter__zero", value === RATING_MIN && "score-meter__zero--selected")}
          onClick={() => select(RATING_MIN)}
          onPointerDown={() => {
            setDragging(true);
            select(RATING_MIN);
          }}
          onPointerEnter={() => {
            if (dragging) {
              select(RATING_MIN);
            }
          }}
        >
          0
        </button>
        {SEGMENT_VALUES.map((segment) => (
          <button
            key={segment}
            type="button"
            role="radio"
            aria-checked={segment === value}
            aria-label={formatScore(segment)}
            tabIndex={segment === value ? 0 : -1}
            ref={(element) => {
              optionRefs.current.set(segment, element);
            }}
            className={cn(
              "score-meter__segment",
              segment <= value && "score-meter__segment--filled",
              segment % 1 === 0 && "score-meter__segment--whole",
            )}
            onClick={() => select(segment)}
            onPointerDown={() => {
              setDragging(true);
              select(segment);
            }}
            onPointerEnter={() => {
              if (dragging) {
                select(segment);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
