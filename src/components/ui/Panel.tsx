import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import "./Panel.css";

export type PanelPadding = "none" | "sm" | "md" | "lg";
export type PanelGlow = "none" | "orange" | "purple";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  padding?: PanelPadding;
  glow?: PanelGlow;
}

export function Panel({
  elevated = false,
  padding = "md",
  glow = "none",
  className,
  children,
  ...rest
}: PanelProps) {
  return (
    <div
      className={cn(
        "panel",
        elevated && "panel--elevated",
        `panel--padding-${padding}`,
        glow !== "none" && `panel--glow-${glow}`,
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
