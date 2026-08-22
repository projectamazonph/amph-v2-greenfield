// @vitest-environment jsdom
/// <reference types="@testing-library/jest-dom" />

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let pathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

vi.unmock("@/components/ui/MobileNavToggle");

import { MobileNavToggle } from "../MobileNavToggle";

function renderDrawer() {
  return render(
    <>
      <MobileNavToggle sidebarId="student-sidebar" />
      <aside id="student-sidebar">
        <a href="/dashboard">Dashboard</a>
        <button type="button">Last action</button>
      </aside>
      <main data-navigation-content>Page content</main>
    </>,
  );
}

describe("MobileNavToggle runtime accessibility", () => {
  beforeEach(() => {
    pathname = "/dashboard";
    document.body.innerHTML = "";
    document.body.style.overflow = "";
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
    document.body.style.overflow = "";
  });

  it("opens the drawer, traps focus, and closes on Escape with focus restored", async () => {
    const user = userEvent.setup();
    renderDrawer();

    const toggle = screen.getByRole("button", { name: "Open navigation", hidden: true });
    const sidebar = document.getElementById("student-sidebar");
    const content = screen.getByRole("main");
    expect(sidebar).not.toBeNull();
    expect(content).not.toBeNull();

    await user.click(toggle);

    expect(sidebar).toHaveAttribute("data-open", "true");
    expect(sidebar).toHaveAttribute("role", "dialog");
    expect(sidebar).toHaveAttribute("aria-modal", "true");
    expect(content).toHaveAttribute("aria-hidden", "true");
    expect(content).toHaveProperty("inert", true);
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(screen.getByRole("button", { name: "Last action" })).toHaveFocus();

    await user.keyboard("{Tab}");
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveFocus();

    await user.keyboard("{Escape}");

    expect(sidebar).toHaveAttribute("data-open", "false");
    expect(sidebar).not.toHaveAttribute("role");
    expect(sidebar).not.toHaveAttribute("aria-modal");
    expect(content).not.toHaveAttribute("aria-hidden");
    expect(content).toHaveProperty("inert", false);
    expect(document.body.style.overflow).toBe("");
    expect(screen.getByRole("button", { name: "Open navigation", hidden: true })).toHaveFocus();
  });

  it("closes from the backdrop and restores focus to the toggle", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "Open navigation", hidden: true }));
    const closeButtons = screen.getAllByRole("button", { name: "Close navigation" });
    await user.click(closeButtons[closeButtons.length - 1]!);

    expect(screen.getByRole("button", { name: "Open navigation", hidden: true })).toHaveFocus();
    expect(document.getElementById("student-sidebar")).toHaveAttribute("data-open", "false");
  });

  it("closes an open drawer when the route changes", async () => {
    const user = userEvent.setup();
    const view = renderDrawer();

    await user.click(screen.getByRole("button", { name: "Open navigation", hidden: true }));
    pathname = "/courses";
    view.rerender(
      <>
        <MobileNavToggle sidebarId="student-sidebar" />
        <aside id="student-sidebar">
          <a href="/courses">Courses</a>
          <button type="button">Last action</button>
        </aside>
        <main data-navigation-content>Course content</main>
      </>,
    );

    expect(document.getElementById("student-sidebar")).toHaveAttribute("data-open", "false");
    expect(document.body.style.overflow).toBe("");
  });
});
