import { useId } from "react";
import { cn } from "../../utils/cn";
import "./Toggle.css";

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** An on/off switch with its label and explanation — the `role="switch"` pattern. */
export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  const labelId = useId();
  const descriptionId = useId();

  return (
    <div className="toggle">
      <div className="toggle__text">
        <span id={labelId} className="toggle__label">
          {label}
        </span>
        {description && (
          <p id={descriptionId} className="toggle__description">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        className={cn("toggle__switch", checked && "toggle__switch--on")}
        onClick={() => onChange(!checked)}
      >
        <span aria-hidden="true" className="toggle__thumb" />
      </button>
    </div>
  );
}
