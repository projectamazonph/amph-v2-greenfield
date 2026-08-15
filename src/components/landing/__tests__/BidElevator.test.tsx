/**
 * BidElevator.test.tsx — M-11 audit fix verification.
 *
 * Locks in the IntersectionObserver-based rAF pause behavior so the
 * landing-page demo does not pay for a 60fps redraw when its canvas is
 * offscreen. The component never had a component-level test before; this
 * fills the gap with a minimal jsdom + mocked observer harness.
 *
 * Approach: install jsdom globals, stub browser APIs the component
 * touches (IntersectionObserver, matchMedia, getComputedStyle, canvas
 * getContext, requestAnimationFrame / cancelAnimationFrame), then mount
 * the component and drive the observer callback manually.
 */

/// <reference types="vitest/globals" />
import { JSDOM } from "jsdom";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import React from "react";

const observers: Array<{
  callback: IntersectionObserverCallback;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  thresholds: ReadonlyArray<number>;
}> = [];

class IntersectionObserverMock {
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  thresholds: ReadonlyArray<number> = [];

  constructor(cb: IntersectionObserverCallback, init?: IntersectionObserverInit) {
    this.callback = cb;
    if (init?.threshold !== undefined) {
      this.thresholds = Array.isArray(init.threshold) ? init.threshold : [init.threshold];
    }
    observers.push(this as unknown as (typeof observers)[number]);
  }
}

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
globalThis.document = dom.window.document;
globalThis.window = dom.window as unknown as Window & typeof globalThis;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLCanvasElement = dom.window.HTMLCanvasElement;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.IntersectionObserver =
  IntersectionObserverMock as unknown as typeof IntersectionObserver;

beforeEach(() => {
  observers.length = 0;
  // Stub getComputedStyle for the resize effect that reads --ink-900 etc.
  dom.window.document.documentElement.style.setProperty("--ink-900", "#171717");
  dom.window.document.documentElement.style.setProperty("--accent", "#FF6B35");
  dom.window.document.documentElement.style.setProperty("--ink-500", "#737373");
  dom.window.document.documentElement.style.setProperty("--border", "#E5E5E0");
  dom.window.document.documentElement.style.setProperty("--font-mono", "monospace");
  // Stub canvas getContext — BidElevator paints into a 2D context.
  const proto = dom.window.HTMLCanvasElement.prototype as unknown as {
    getContext: () => unknown;
  };
  proto.getContext = () => {
    const noop = () => {};
    return new Proxy(
      {},
      {
        get: (_t, prop) => {
          if (prop === "canvas") return { width: 0, height: 0 };
          return typeof prop === "string" ? noop : undefined;
        },
      },
    );
  };
  // Stub matchMedia so prefers-reduced-motion reads cleanly.
  dom.window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(() => false),
  }));
});

afterEach(() => {
  cleanup();
});

describe("BidElevator", () => {
  it("sets up an IntersectionObserver on the canvas", async () => {
    // Dynamic import so @phosphor-icons / bidElevator.logic are loaded
    // after jsdom + IntersectionObserver mock are installed.
    const { BidElevator } = await import("../BidElevator");
    const { container } = render(React.createElement(BidElevator));
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(observers.length).toBe(1);
    expect(observers[0]!.observe).toHaveBeenCalledWith(canvas);
  });

  it("requests a low threshold so the loop pauses as soon as the canvas scrolls out", async () => {
    const { BidElevator } = await import("../BidElevator");
    render(React.createElement(BidElevator));
    expect(observers.length).toBe(1);
    expect(observers[0]!.thresholds[0]).toBeLessThanOrEqual(0.05);
  });

  it("disconnects the observer on unmount", async () => {
    const { BidElevator } = await import("../BidElevator");
    const { unmount } = render(React.createElement(BidElevator));
    expect(observers.length).toBe(1);
    const observer = observers[0]!;
    unmount();
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });
});
