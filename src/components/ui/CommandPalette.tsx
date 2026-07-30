"use client";

/**
 * CommandPalette — Cmd+K quick navigation + search.
 *
 * Renders a modal overlay with a search input. Filters navigation
 * items as the user types. Selecting an item navigates to it.
 *
 * Props:
 *   - items: array of { href, label, icon?, section? }
 *
 * Usage:
 *   <CommandPalette items={adminNavItems} />
 *
 * Keyboard:
 *   - Cmd/Ctrl+K to open
 *   - Escape to close
 *   - Arrow keys to navigate results
 *   - Enter to select
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import styles from "./CommandPalette.module.css";
import type { ComponentType, SVGProps } from "react";

export interface CommandItem {
  href: string;
  label: string;
  section?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;
}

export interface CommandPaletteProps {
  items: readonly CommandItem[];
}

export function CommandPalette({ items }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Open/close with Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      // Small delay to let the modal render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Filter items
  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(lower) ||
        (item.section?.toLowerCase().includes(lower) ?? false)
    );
  }, [items, query]);

  // Keyboard navigation within results
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIdx]) {
        e.preventDefault();
        setOpen(false);
        router.push(filtered[selectedIdx].href);
      }
    },
    [filtered, selectedIdx, router]
  );

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputRow}>
          <MagnifyingGlass size={18} className={styles.searchIcon} aria-hidden />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Search pages, actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search commands"
            role="combobox"
            aria-expanded
            aria-controls="command-list"
          />
          <kbd className={styles.kbd}>Esc</kbd>
        </div>
        <div id="command-list" ref={listRef} className={styles.list} role="listbox">
          {filtered.length === 0 && (
            <div className={styles.empty}>No results found</div>
          )}
          {filtered.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.href}
                type="button"
                className={`${styles.item} ${i === selectedIdx ? styles.selected : ""}`}
                role="option"
                aria-selected={i === selectedIdx}
                onClick={() => {
                  setOpen(false);
                  router.push(item.href);
                }}
                onMouseEnter={() => setSelectedIdx(i)}
              >
                {Icon && (
                  <span className={styles.itemIcon}>
                    <Icon size={16} />
                  </span>
                )}
                <span className={styles.itemLabel}>{item.label}</span>
                {item.section && (
                  <span className={styles.itemSection}>{item.section}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className={styles.footer}>
          <span className={styles.footerHint}>
            <kbd>↑↓</kbd> navigate
            <kbd>↵</kbd> select
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
