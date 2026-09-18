import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";
import "./IconButton.css";

export type IconButtonVariant = "ghost" | "secondary";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  /** Accessible name — there is no visible label, so this is required. */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = "ghost", size = "md", className, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn("icon-btn", `icon-btn--${variant}`, `icon-btn--${size}`, className)}
      {...rest}
    >
      <span aria-hidden="true" className="icon-btn__glyph">
        {icon}
      </span>
    </button>
  );
});
