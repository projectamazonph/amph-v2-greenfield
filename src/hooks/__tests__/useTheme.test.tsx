/**
 * useTheme.test.tsx — client-side theme toggle.
 *
 * Verifies that:
 *  - first render reports "light" before mount (SSR-safe default)
 *  - after mount, the stored preference or system preference is read
 *  - calling setTheme flips the data-theme attribute and persists
 *
 * Mirrors the JSDOM setup pattern from useUnsavedChanges.test.tsx.
 */

/// <reference types="vitest/globals" />
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.localStorage = dom.window.localStorage;
globalThis.matchMedia = (query: string) =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }) as unknown as MediaQueryList;

// Import AFTER globals are installed.
import { act, render } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { useTheme } from "@/hooks/useTheme";

function Probe() {
  const [theme, setTheme] = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
        toggle
      </button>
    </div>
  );
}

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  it("defaults to light before hydration completes", () => {
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("theme").textContent).toBe("light");
  });

  it("sets data-theme on <html> when toggled", () => {
    const { getByText } = render(<Probe />);
    act(() => {
      getByText("toggle").click();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("persists the selected theme to localStorage", () => {
    const { getByText } = render(<Probe />);
    act(() => {
      getByText("toggle").click();
    });
    expect(localStorage.getItem("theme")).toBe("dark");
  });

  it("reads the stored preference back on a fresh render", async () => {
    localStorage.setItem("theme", "dark");
    const { getByTestId } = render(<Probe />);
    // Flush the useEffect so the stored value is applied.
    await act(async () => {
      await Promise.resolve();
    });
    expect(getByTestId("theme").textContent).toBe("dark");
  });
});
