import { useHauntScope } from "../../hooks/useHauntScope";
import { HAUNT_SCOPES, hauntScopeLabel, type HauntScope } from "../../models/haunt";
import { cn } from "../../utils/cn";
import "./HauntSelector.css";

export interface HauntSelectorProps {
  className?: string;
}

/**
 * The haunt context, always on screen.
 *
 * Deliberately a stack of three equal rows rather than a dropdown: the
 * choice between the two archives is the app's top-level one, and hiding
 * either of them behind a menu would make it look like the other is the
 * real subject. The choice is remembered across launches.
 */
export function HauntSelector({ className }: HauntSelectorProps) {
  const { scope, setScope } = useHauntScope();

  return (
    <div className={cn("haunt-selector", className)}>
      <span className="haunt-selector__label" id="haunt-selector-label">
        Viewing
      </span>
      <div
        className="haunt-selector__options"
        role="radiogroup"
        aria-labelledby="haunt-selector-label"
      >
        {HAUNT_SCOPES.map((option: HauntScope) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={option === scope}
            className={cn(
              "haunt-selector__option",
              option === scope && "haunt-selector__option--active",
            )}
            onClick={() => setScope(option)}
          >
            {hauntScopeLabel(option)}
          </button>
        ))}
      </div>
    </div>
  );
}
