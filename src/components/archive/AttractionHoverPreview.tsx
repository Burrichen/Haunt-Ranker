import { cloneElement, useEffect, useState } from "react";
import type { FocusEvent, MouseEvent, ReactElement } from "react";
import type { Attraction } from "../../models/attraction";
import type { EventYear } from "../../models/eventYear";
import type { Rating } from "../../models/rating";
import { AttractionPreviewCard } from "./AttractionPreviewCard";
import "./AttractionHoverPreview.css";

const SHOW_DELAY_MS = 400;

export interface AttractionHoverPreviewProps {
  attraction: Attraction;
  eventYear: EventYear | null;
  rating: Rating | null;
  children: ReactElement<Record<string, unknown>>;
}

/**
 * Wraps a single trigger (typically a `Link` to the attraction's wiki
 * page) and, after a short hover/focus delay, floats an
 * `AttractionPreviewCard` beside it — reusable infrastructure for
 * attraction references anywhere in the app (rankings, related-attraction
 * links, etc.), not just here. The delay means a pointer merely passing
 * over the trigger doesn't flash the popup: `visible` only flips on after
 * `hovered` has stayed true for the whole delay, and the pending timeout
 * is cancelled the moment the pointer leaves. The popup itself is
 * decorative (`pointer-events: none`); the trigger stays the one
 * clickable target, so a click always navigates straight to the wiki page.
 */
export function AttractionHoverPreview({
  attraction,
  eventYear,
  rating,
  children,
}: AttractionHoverPreviewProps) {
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hovered) {
      return;
    }
    const timeout = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [hovered]);

  const child = cloneElement(children, {
    onMouseEnter: (event: MouseEvent) => {
      (children.props.onMouseEnter as ((e: MouseEvent) => void) | undefined)?.(event);
      setHovered(true);
    },
    onMouseLeave: (event: MouseEvent) => {
      (children.props.onMouseLeave as ((e: MouseEvent) => void) | undefined)?.(event);
      setHovered(false);
      setVisible(false);
    },
    onFocus: (event: FocusEvent) => {
      (children.props.onFocus as ((e: FocusEvent) => void) | undefined)?.(event);
      setHovered(true);
    },
    onBlur: (event: FocusEvent) => {
      (children.props.onBlur as ((e: FocusEvent) => void) | undefined)?.(event);
      setHovered(false);
      setVisible(false);
    },
  });

  return (
    <span className="attraction-hover-preview">
      {child}
      {visible && (
        <span className="attraction-hover-preview__popup" role="presentation">
          <AttractionPreviewCard attraction={attraction} eventYear={eventYear} rating={rating} />
        </span>
      )}
    </span>
  );
}
