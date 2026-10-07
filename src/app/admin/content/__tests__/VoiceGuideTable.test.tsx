// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { VoiceGuideTable } from "@/components/admin/VoiceGuideTable";
import { getVoiceGuideData } from "@/lib/voice-guide";

describe("VoiceGuideTable", () => {
  it("table rows match the banned phrases and rules from the voice guide constant", () => {
    const data = getVoiceGuideData();
    expect(data.bannedPhrases.length).toBeGreaterThanOrEqual(80);
    expect(data.entries.length).toBeGreaterThan(data.bannedPhrases.length);

    render(<VoiceGuideTable entries={data.entries} />);

    // Verify accordion header shows total count
    expect(screen.getByText(`${data.entries.length} items`)).toBeInTheDocument();

    // Verify caption is present for accessibility
    expect(
      screen.getByText("Voice Guide and Banned Phrases Reference Table")
    ).toBeInTheDocument();

    // Check that sample banned phrases exist in the rendered data
    const bannedEntries = data.entries.filter((e) => e.category === "Banned Phrase");
    expect(bannedEntries.length).toBe(data.bannedPhrases.length);

    // Verify sample banned phrases from constant are represented in table cells
    const samplePhrases = ["seamless", "robust", "in order to"];
    for (const phrase of samplePhrases) {
      expect(screen.getByText(phrase)).toBeInTheDocument();
    }
  });

  it("filters table rows by category when category buttons are clicked", async () => {
    const user = userEvent.setup();
    const data = getVoiceGuideData();

    render(<VoiceGuideTable entries={data.entries} />);

    const bannedCount = data.entries.filter((e) => e.category === "Banned Phrase").length;
    const rulesCount = data.entries.filter((e) => e.category !== "Banned Phrase").length;

    // Filter by Banned Phrases
    const bannedFilterBtn = screen.getByRole("button", {
      name: new RegExp(`Banned Phrases \\(${bannedCount}\\)`),
    });
    await user.click(bannedFilterBtn);

    // Rules category badges should not be visible
    expect(screen.queryByText("Voice Rule")).not.toBeInTheDocument();

    // Filter by Rules
    const rulesFilterBtn = screen.getByRole("button", {
      name: new RegExp(`Rules \\(${rulesCount}\\)`),
    });
    await user.click(rulesFilterBtn);

    expect(screen.getAllByText("Voice Rule").length).toBeGreaterThan(0);
  });

  it("filters table rows when search query is typed", async () => {
    const user = userEvent.setup();
    const data = getVoiceGuideData();

    render(<VoiceGuideTable entries={data.entries} />);

    const searchInput = screen.getByPlaceholderText("Search banned phrases or rules...");
    await user.type(searchInput, "seamless");

    // Only seamless row should remain
    expect(screen.getByText("seamless")).toBeInTheDocument();
    expect(screen.queryByText("Active voice.")).not.toBeInTheDocument();
  });
});
