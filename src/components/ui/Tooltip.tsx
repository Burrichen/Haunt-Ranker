import { cloneElement, useId, useState } from "react";
import type { FocusEvent, MouseEvent, ReactElement } from "react";
import { cn } from "../../utils/cn";
import "./Tooltip.css";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: string;
  placement?: TooltipPlacement;
  children: ReactElement<Record<string, unknown>>;
}

/**
 * Wraps a single focusable/hoverable child and shows a floating label for
 * it. The child keeps its own accessible name; the tooltip is linked via
 * `aria-describedby` so assistive tech announces both.
 */
export function Tooltip({ content, placement = "top", children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  const show = () => setVisible(true);
  const hide = () => setVisible(false);

  const child = cloneElement(children, {
    "aria-describedby": visible ? id : undefined,
    onMouseEnter: (event: MouseEvent) => {
      (children.props.onMouseEnter as ((e: MouseEvent) => void) | undefined)?.(event);
      show();
    },
    onMouseLeave: (event: MouseEvent) => {
      (children.props.onMouseLeave as ((e: MouseEvent) => void) | undefined)?.(event);
      hide();
    },
    onFocus: (event: FocusEvent) => {
      (children.props.onFocus as ((e: FocusEvent) => void) | undefined)?.(event);
      show();
    },
    onBlur: (event: FocusEvent) => {
      (children.props.onBlur as ((e: FocusEvent) => void) | undefined)?.(event);
      hide();
    },
  });

  return (
    <span className="tooltip-wrapper">
      {child}
      {visible && (
        <span role="tooltip" id={id} className={cn("tooltip", `tooltip--${placement}`)}>
          {content}
        </span>
      )}
    </span>
  );
}
