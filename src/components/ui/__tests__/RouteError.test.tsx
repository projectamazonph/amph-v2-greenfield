import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

import { RouteError } from "@/components/ui/RouteError";

const error = new Error("test failure");
const reset = vi.fn();

describe("RouteError", () => {
  it("owns the page landmark and heading by default", () => {
    const html = renderToStaticMarkup(<RouteError error={error} reset={reset} />);

    expect(html).toContain("<main");
    expect(html).toContain("<h1");
    expect(html).toContain("Something went wrong");
    expect(html).toContain("Try again");
  });

  it("does not nest a main landmark inside a layout-owned main", () => {
    const html = renderToStaticMarkup(<RouteError error={error} reset={reset} withinMain />);

    expect(html).not.toContain("<main");
    expect(html).toContain("<h1");
  });
});
