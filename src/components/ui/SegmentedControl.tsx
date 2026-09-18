import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "../../utils/cn";
import "./SegmentedControl.css";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  "aria-label": string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ...rest
}: SegmentedControlProps<T>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onChange(options[(index + 1) % options.length].value);
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onChange(options[(index - 1 + options.length) % options.length].value);
    }
  };

  return (
    <div role="radiogroup" className="segmented" {...rest}>
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            className={cn("segmented__option", active && "segmented__option--active")}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {option.icon && (
              <span aria-hidden="true" className="segmented__icon">
                {option.icon}
              </span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
