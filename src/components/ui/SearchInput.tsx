import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../utils/cn";
import { IconButton } from "./IconButton";
import "./SearchInput.css";

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onClear, className, ...rest },
  ref,
) {
  const showClear = Boolean(onClear) && typeof value === "string" && value.length > 0;

  return (
    <div className={cn("search-input", className)}>
      <Search className="search-input__icon" size={16} aria-hidden="true" />
      <input ref={ref} type="search" className="search-input__field" value={value} {...rest} />
      {showClear && (
        <IconButton
          icon={<X size={14} />}
          label="Clear search"
          size="sm"
          className="search-input__clear"
          onClick={onClear}
        />
      )}
    </div>
  );
});
