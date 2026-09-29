import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
// @vitest-environment jsdom

/**
 * WorksheetArtifact.test.tsx — STORY-163.
 *
 * Covers the structural contract for the client component:
 * - One input per field, prefilled from initialValues.
 * - Typing updates state without round-tripping.
 * - Blur leaves the form (not within it) triggers saveWorksheetEntryAction
 *   exactly once with the full row.
 * - Blur between two inputs inside the form does NOT trigger the save.
 * - A successful save renders the "Saved at HH:MM:SS" indicator.
 * - A failed save renders the error message and does not throw.
 *
 * The action module is mocked so we never touch a real server.
 */

import type { SaveWorksheetEntryActionResult } from "@/app/actions/worksheet.action";

const { saveWorksheetEntryAction } = vi.hoisted(() => ({
  saveWorksheetEntryAction: vi.fn<() => Promise<SaveWorksheetEntryActionResult>>(async () => ({
    ok: true,
    value: { savedAt: new Date("2026-09-29T12:00:00.000Z").toISOString() },
  })),
}));

vi.mock("@/app/actions/worksheet.action", () => ({
  saveWorksheetEntryAction,
}));

import { WorksheetArtifact } from "@/components/lesson/WorksheetArtifact";

const fields = [
  { key: "productName", label: "Product" },
  { key: "price", label: "Price", placeholder: "PHP" },
] as const;

beforeEach(() => {
  saveWorksheetEntryAction.mockClear();
  saveWorksheetEntryAction.mockResolvedValue({
    ok: true,
    value: { savedAt: new Date("2026-09-29T12:00:00.000Z").toISOString() },
  });
});

describe("WorksheetArtifact", () => {
  it("renders one input per field", () => {
    render(
      <WorksheetArtifact
        studentId="student-1"
        lessonSlug="1.1-read-ppc-data-before-you-change-it"
        partNumber={1}
        title="Part 1 of your sheet"
        fields={fields}
        initialValues={{ productName: "Bamboo", price: "1250" }}
      />,
    );
    expect(screen.getByLabelText("Product")).toHaveValue("Bamboo");
    expect(screen.getByLabelText("Price")).toHaveValue("1250");
  });

  it("renders missing initial values as empty strings", () => {
    render(
      <WorksheetArtifact
        studentId="student-1"
        lessonSlug="1.1-read-ppc-data-before-you-change-it"
        partNumber={1}
        title="Part 1"
        fields={fields}
        initialValues={{ productName: "Bamboo" }}
      />,
    );
    expect(screen.getByLabelText("Product")).toHaveValue("Bamboo");
    expect(screen.getByLabelText("Price")).toHaveValue("");
  });

  it("updates state on input change without calling the action", () => {
    render(
      <WorksheetArtifact
        studentId="student-1"
        lessonSlug="1.1-read-ppc-data-before-you-change-it"
        partNumber={1}
        title="Part 1"
        fields={fields}
        initialValues={{}}
      />,
    );
    const product = screen.getByLabelText("Product");
    fireEvent.change(product, { target: { value: "New value" } });
    expect(product).toHaveValue("New value");
    expect(saveWorksheetEntryAction).not.toHaveBeenCalled();
  });

  it("saves the full row when blur leaves the form", async () => {
    render(
      <WorksheetArtifact
        studentId="student-1"
        lessonSlug="1.1-read-ppc-data-before-you-change-it"
        partNumber={1}
        title="Part 1"
        fields={fields}
        initialValues={{ productName: "Bamboo" }}
      />,
    );
    const product = screen.getByLabelText("Product");
    fireEvent.change(product, { target: { value: "Cutting board" } });
    // Focus moves to a node outside the form (no relatedTarget).
    fireEvent.blur(product);
    await new Promise((r) => setTimeout(r, 0));

    expect(saveWorksheetEntryAction).toHaveBeenCalledTimes(1);
    expect(saveWorksheetEntryAction).toHaveBeenCalledWith({
      studentId: "student-1",
      lessonSlug: "1.1-read-ppc-data-before-you-change-it",
      values: { productName: "Cutting board", price: "" },
    });
  });

  it("does not save on intra-form blur (between two inputs)", async () => {
    render(
      <WorksheetArtifact
        studentId="student-1"
        lessonSlug="1.1-read-ppc-data-before-you-change-it"
        partNumber={1}
        title="Part 1"
        fields={fields}
        initialValues={{}}
      />,
    );
    const product = screen.getByLabelText("Product");
    const price = screen.getByLabelText("Price");
    product.focus();
    // Move focus from product to price — both are inside the form, so
    // relatedTarget is inside currentTarget and the handler returns early.
    fireEvent.blur(product, { relatedTarget: price });
    await new Promise((r) => setTimeout(r, 0));
    expect(saveWorksheetEntryAction).not.toHaveBeenCalled();
  });

  it("renders the saved indicator after a successful save", async () => {
    render(
      <WorksheetArtifact
        studentId="student-1"
        lessonSlug="1.1-read-ppc-data-before-you-change-it"
        partNumber={1}
        title="Part 1"
        fields={fields}
        initialValues={{ productName: "Bamboo" }}
      />,
    );
    fireEvent.blur(screen.getByLabelText("Product"));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("status")).toHaveTextContent(/saved/i);
  });

  it("renders the error message after a failed save without throwing", async () => {
    saveWorksheetEntryAction.mockResolvedValueOnce({
      ok: false,
      error: { kind: "unauthorized" },
    });
    render(
      <WorksheetArtifact
        studentId="student-1"
        lessonSlug="1.1-read-ppc-data-before-you-change-it"
        partNumber={1}
        title="Part 1"
        fields={fields}
        initialValues={{}}
      />,
    );
    fireEvent.blur(screen.getByLabelText("Product"));
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole("status")).toHaveTextContent(/sign in/i);
  });

  it("sets data-amph-* attrs the renderer can hydrate from", () => {
    render(
      <WorksheetArtifact
        studentId="student-1"
        lessonSlug="1.2-cpc-ctr"
        partNumber={2}
        title="Part 2"
        fields={fields}
        initialValues={{}}
      />,
    );
    const form = screen.getByLabelText("Part 2");
    expect(form.getAttribute("data-amph-block")).toBe("worksheet");
    expect(form.getAttribute("data-amph-lesson")).toBe("1.2-cpc-ctr");
    expect(form.getAttribute("data-amph-part")).toBe("2");
  });
});
