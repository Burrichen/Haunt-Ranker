import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import "./Badge.css";

export type BadgeVariant = "neutral" | "orange" | "purple" | "danger" | "positive";

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
