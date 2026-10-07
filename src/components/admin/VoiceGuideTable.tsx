"use client";

import { useState, useMemo } from "react";
import { Badge, Card, Input } from "@/components/ui";
import { type VoiceGuideEntry } from "@/lib/voice-guide";
import { CaretDown, CaretRight, MagnifyingGlass } from "@phosphor-icons/react";
import styles from "./VoiceGuideTable.module.css";

export interface VoiceGuideTableProps {
  entries: readonly VoiceGuideEntry[];
}

export function VoiceGuideTable({ entries }: VoiceGuideTableProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isOpen, setIsOpen] = useState(false);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const matchesCategory =
        selectedCategory === "all" ||
        (selectedCategory === "banned" && entry.category === "Banned Phrase") ||
        (selectedCategory === "rules" && entry.category !== "Banned Phrase");

      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        entry.originalOrTitle.toLowerCase().includes(query) ||
        entry.replacementOrDescription.toLowerCase().includes(query) ||
        (entry.subcategory && entry.subcategory.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });
  }, [entries, search, selectedCategory]);

  const bannedCount = useMemo(
    () => entries.filter((e) => e.category === "Banned Phrase").length,
    [entries]
  );
  const rulesCount = useMemo(
    () => entries.filter((e) => e.category !== "Banned Phrase").length,
    [entries]
  );

  return (
    <Card padding="comfortable" className={styles.cardContainer}>
      <details
        className={styles.details}
        open={isOpen}
        onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className={styles.summary} aria-controls="voice-guide-panel">
          <div className={styles.summaryTitle}>
            {isOpen ? <CaretDown size={20} weight="bold" /> : <CaretRight size={20} weight="bold" />}
            <span>Voice Guide & Banned Phrases Reference</span>
          </div>
          <Badge variant="neutral" shape="pill">
            {entries.length} items
          </Badge>
        </summary>

        <div id="voice-guide-panel" className={styles.panel}>
          <p className={styles.description}>
            Source of truth: <code>docs/voice-guide.md</code>. These rules and banned phrases govern
            all UI copy, lesson prose, and error messages across the platform.
          </p>

          <div className={styles.controls}>
            <div className={styles.searchWrapper}>
              <Input
                placeholder="Search banned phrases or rules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                rightAdornment={<MagnifyingGlass size={16} />}
              />
            </div>
            <div className={styles.filterGroup}>
              <button
                type="button"
                className={selectedCategory === "all" ? styles.filterActive : styles.filterButton}
                onClick={() => setSelectedCategory("all")}
              >
                All ({entries.length})
              </button>
              <button
                type="button"
                className={selectedCategory === "banned" ? styles.filterActive : styles.filterButton}
                onClick={() => setSelectedCategory("banned")}
              >
                Banned Phrases ({bannedCount})
              </button>
              <button
                type="button"
                className={selectedCategory === "rules" ? styles.filterActive : styles.filterButton}
                onClick={() => setSelectedCategory("rules")}
              >
                Rules ({rulesCount})
              </button>
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <caption>Voice Guide and Banned Phrases Reference Table</caption>
              <thead>
                <tr>
                  <th scope="col" style={{ width: "22%" }}>Category</th>
                  <th scope="col" style={{ width: "35%" }}>Original Phrase / Title</th>
                  <th scope="col" style={{ width: "43%" }}>Replacement / Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={3} className={styles.emptyState}>
                      No matching voice guide entries found.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <Badge
                          variant={
                            entry.category === "Banned Phrase"
                              ? "danger"
                              : entry.category === "Voice Rule"
                              ? "accent"
                              : entry.category === "Student Load Rule"
                              ? "info"
                              : "warning"
                          }
                        >
                          {entry.category}
                        </Badge>
                        {entry.subcategory && (
                          <span className={styles.subcategory}>{entry.subcategory}</span>
                        )}
                      </td>
                      <td className={styles.originalCell}>
                        <code>{entry.originalOrTitle}</code>
                      </td>
                      <td className={styles.replacementCell}>
                        {entry.replacementOrDescription}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </details>
    </Card>
  );
}
