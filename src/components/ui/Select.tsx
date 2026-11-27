"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { CheckIcon, ChevronDownIcon } from "@/components/icons/KbmIcons";

/**
 * Themed drop-in replacement for a native <select>.
 *
 * Accepts the same `value`, `onChange`, `disabled`, `className` and
 * `<option>` children as a controlled <select>, and calls `onChange`
 * with an event whose `target.value` / `currentTarget.value` hold the
 * chosen option value as a string — exactly what the native element
 * reports — so existing handlers keep working unchanged.
 */

type OptionValue = string | number | readonly string[] | undefined;

type SelectProps = {
  value?: OptionValue;
  defaultValue?: OptionValue;
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  title?: string;
  required?: boolean;
  /** Optional leading icon shown in the trigger and every option. */
  icon?: ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  children?: ReactNode;
};

type ParsedOption = {
  value: string;
  label: ReactNode;
  text: string;
  disabled: boolean;
};

function toText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (isValidElement(node)) {
    return toText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function parseOptions(children: ReactNode): ParsedOption[] {
  const result: ParsedOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const el = child as ReactElement<{
      value?: OptionValue;
      disabled?: boolean;
      children?: ReactNode;
    }>;
    if (el.type === "optgroup") {
      result.push(...parseOptions(el.props.children));
      return;
    }
    const text = toText(el.props.children).replace(/\s+/g, " ").trim();
    result.push({
      value: el.props.value !== undefined ? String(el.props.value) : text,
      label: el.props.children,
      text,
      disabled: Boolean(el.props.disabled),
    });
  });
  return result;
}

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  placement: "bottom" | "top";
};

const MENU_GAP = 6;
const MENU_MAX = 320;
const MENU_MIN_WIDTH = 190;

export function Select({
  value,
  defaultValue,
  onChange,
  disabled,
  className,
  id,
  name,
  title,
  required,
  icon,
  children,
  ...aria
}: SelectProps) {
  const options = useMemo(() => parseOptions(children), [children]);
  const isControlled = value !== undefined;
  const [innerValue, setInnerValue] = useState<string>(() =>
    defaultValue !== undefined
      ? String(defaultValue)
      : options.find((o) => !o.disabled)?.value ?? "",
  );
  const current = isControlled ? String(value) : innerValue;
  const selectedIndex = options.findIndex((o) => o.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [position, setPosition] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef<{ text: string; timer?: number }>({ text: "" });
  const baseId = useId();
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-opt-${index}`;

  useEffect(() => setMounted(true), []);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;
    const spaceBelow = viewportH - rect.bottom - MENU_GAP - 8;
    const spaceAbove = rect.top - MENU_GAP - 8;
    const wanted = Math.min(MENU_MAX, options.length * 44 + 12);
    const placement: MenuPosition["placement"] =
      spaceBelow < Math.min(wanted, 200) && spaceAbove > spaceBelow
        ? "top"
        : "bottom";
    const maxHeight = Math.max(
      120,
      Math.min(MENU_MAX, placement === "bottom" ? spaceBelow : spaceAbove),
    );
    const width = Math.min(
      Math.max(rect.width, MENU_MIN_WIDTH),
      viewportW - 16,
    );
    const left = Math.min(Math.max(8, rect.left), viewportW - width - 8);
    const top =
      placement === "bottom"
        ? rect.bottom + MENU_GAP
        : rect.top - MENU_GAP - Math.min(wanted, maxHeight);
    setPosition({ top, left, width, maxHeight, placement });
  }, [options.length]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    const onWin = () => measure();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
    };
  }, [open, measure]);

  // Close on outside pointer
  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        listRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open]);

  // Keep the active option in view
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (!isControlled) setInnerValue(option.value);
    if (option.value !== current && onChange) {
      const target = {
        value: option.value,
        name: name ?? "",
        id: id ?? "",
        selectedIndex: index,
      } as unknown as HTMLSelectElement;
      onChange({
        target,
        currentTarget: target,
        type: "change",
        preventDefault: () => {},
        stopPropagation: () => {},
        persist: () => {},
        nativeEvent: new Event("change"),
      } as unknown as ChangeEvent<HTMLSelectElement>);
    }
    setOpen(false);
    triggerRef.current?.focus();
  };

  const step = (from: number, dir: 1 | -1) => {
    if (!options.length) return -1;
    let i = from;
    for (let n = 0; n < options.length; n += 1) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };

  const openMenu = () => {
    if (disabled || !options.length) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : step(-1, 1));
    setOpen(true);
  };

  const onTypeahead = (key: string) => {
    const t = typeahead.current;
    window.clearTimeout(t.timer);
    t.text += key.toLowerCase();
    t.timer = window.setTimeout(() => (t.text = ""), 600);
    const start = open ? activeIndex : selectedIndex;
    const ordered = [
      ...options.slice(start + 1),
      ...options.slice(0, start + 1),
    ];
    const hit = ordered.find(
      (o) => !o.disabled && o.text.toLowerCase().startsWith(t.text),
    );
    if (!hit) return;
    const index = options.indexOf(hit);
    if (open) setActiveIndex(index);
    else commit(index);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        const dir = e.key === "ArrowDown" ? 1 : -1;
        if (!open) {
          openMenu();
          return;
        }
        setActiveIndex((i) => step(i, dir));
        return;
      }
      case "Home":
      case "End":
        if (!open) return;
        e.preventDefault();
        setActiveIndex(
          e.key === "Home" ? step(-1, 1) : step(options.length, -1),
        );
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) openMenu();
        else if (e.key === " " && typeahead.current.text) onTypeahead(" ");
        else commit(activeIndex);
        return;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      case "Tab":
        if (open) setOpen(false);
        return;
      default:
        if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
          onTypeahead(e.key);
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        title={title}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={
          open && activeIndex >= 0 ? optionId(activeIndex) : undefined
        }
        aria-required={required || undefined}
        aria-label={aria["aria-label"]}
        aria-labelledby={aria["aria-labelledby"]}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        data-open={open || undefined}
        className={clsx(
          "kbm-select-trigger",
          className ?? "input-field",
          disabled && "is-disabled",
        )}
      >
        {icon && <span className="kbm-select-icon">{icon}</span>}
        <span className="kbm-select-value">
          {selected ? selected.label : " "}
        </span>
        <ChevronDownIcon size={14} className="kbm-select-chevron" />
      </button>
      {name && <input type="hidden" name={name} value={current} />}

      {mounted &&
        open &&
        position &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={aria["aria-label"]}
            className="kbm-select-menu"
            data-placement={position.placement}
            style={{
              top: position.top,
              left: position.left,
              minWidth: position.width,
              maxWidth: "calc(100vw - 16px)",
              maxHeight: position.maxHeight,
            }}
          >
            {options.map((option, index) => {
              const isSelected = index === selectedIndex;
              return (
                <li
                  key={`${option.value}-${index}`}
                  id={optionId(index)}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  data-active={index === activeIndex || undefined}
                  className="kbm-select-option"
                  onPointerMove={() =>
                    !option.disabled && setActiveIndex(index)
                  }
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => commit(index)}
                >
                  {icon && <span className="kbm-select-icon">{icon}</span>}
                  <span className="kbm-select-option-label">
                    {option.label}
                  </span>
                  <span className="kbm-select-check" aria-hidden="true">
                    {isSelected && <CheckIcon size={14} strokeWidth={3} />}
                  </span>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}

export default Select;
