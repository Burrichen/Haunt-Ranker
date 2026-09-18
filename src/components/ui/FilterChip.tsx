import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import "./FilterChip.css";

export interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean;
  icon?: ReactNode;
}

/** A multi-select toggle button — several can be active at once, unlike a SegmentedControl. */
export function FilterChip({
  active,
  icon,
  className,
  children,
  type = "button",
  ...rest
}: FilterChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cn("filter-chip", active && "filter-chip--active", className)}
      {...rest}
    >
      {icon && (
        <span aria-hidden="true" className="filter-chip__icon">
          {icon}
        </span>
      )}
      {children}
    </button>
  );
}
