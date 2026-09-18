import { cloneElement, useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode } from "react";
import { cn } from "../../utils/cn";
import "./Dropdown.css";

export interface DropdownItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}

export interface DropdownProps {
  trigger: ReactElement<Record<string, unknown>>;
  items: DropdownItem[];
  align?: "start" | "end";
}

/** Accessible menu-button pattern: click or Enter/Space/ArrowDown to open, arrow keys to move, Escape to close. */
export function Dropdown({ trigger, items, align = "start" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleClick = (event: globalThis.MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      itemRefs.current[activeIndex]?.focus();
    }
  }, [open, activeIndex]);

  const openMenu = (initialIndex: number) => {
    setOpen(true);
    setActiveIndex(initialIndex);
  };

  const triggerEl = cloneElement(trigger, {
    onClick: (event: MouseEvent) => {
      (trigger.props.onClick as ((e: MouseEvent) => void) | undefined)?.(event);
      setOpen((wasOpen) => !wasOpen);
    },
    onKeyDown: (event: KeyboardEvent) => {
      (trigger.props.onKeyDown as ((e: KeyboardEvent) => void) | undefined)?.(event);
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openMenu(0);
      }
    },
    "aria-haspopup": "menu",
    "aria-expanded": open,
    "aria-controls": open ? menuId : undefined,
  });

  const handleMenuKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, items.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
  };

  return (
    <div className="dropdown" ref={containerRef}>
      {triggerEl}
      {open && (
        <ul
          id={menuId}
          role="menu"
          className={cn("dropdown__menu", `dropdown__menu--${align}`)}
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item, index) => (
            <li key={item.label} role="none">
              <button
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                tabIndex={index === activeIndex ? 0 : -1}
                className={cn("dropdown__item", item.danger && "dropdown__item--danger")}
                disabled={item.disabled}
                onClick={() => {
                  item.onSelect();
                  setOpen(false);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {item.icon && (
                  <span aria-hidden="true" className="dropdown__item-icon">
                    {item.icon}
                  </span>
                )}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
