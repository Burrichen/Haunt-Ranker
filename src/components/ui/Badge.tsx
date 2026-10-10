import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import "./Badge.css";

/** `accent` and `accent-2` follow the haunt theme in scope (see tokens.css). */
export type BadgeVariant = "neutral" | "accent" | "accent-2" | "danger" | "positive";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "neutral", className, children, ...rest }: BadgeProps) {
  return (
    <span className={cn("badge", `badge--${variant}`, className)} {...rest}>
      {children}
    </span>
  );
}
