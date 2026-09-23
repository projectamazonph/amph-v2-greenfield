// @vitest-environment jsdom

/**
 * useToast cap tests.
 *
 * Pins the max-3 stack: a burst replaces the oldest toast instead
 * of covering the viewport, and manual dismiss works.
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MAX_TOASTS, useToast } from "../useToast";

describe("useToast", () => {
  it(`caps the stack at ${MAX_TOASTS} toasts`, () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useToast());
      act(() => {
        result.current.success("one");
        result.current.success("two");
        result.current.success("three");
        result.current.success("four");
      });
      expect(result.current.toasts).toHaveLength(MAX_TOASTS);
      expect(result.current.toasts.map((t) => t.message)).toEqual(["two", "three", "four"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("dismisses a toast by id", () => {
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.success("hello");
    });
    const id = result.current.toasts[0]?.id ?? "";
    act(() => {
      result.current.dismiss(id);
    });
    expect(result.current.toasts).toHaveLength(0);
  });
});
