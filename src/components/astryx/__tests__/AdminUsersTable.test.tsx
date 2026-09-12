// @vitest-environment jsdom

/**
 * AdminUsersTable 2FA column tests.
 *
 * Pins the enrolled badge: On (success) when the row has 2FA,
 * Off (neutral) otherwise.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { AdminUsersTable, type UserRow } from "../AdminUsersTable";

function row(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: "u-1",
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    role: "ADMIN",
    subscriptionTier: "PRO",
    twoFactorEnabled: true,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function renderTable(rows: UserRow[]) {
  return render(
    <AdminUsersTable users={rows} totalCount={rows.length} page={1} pageSize={25} filters={{}} />,
  );
}

describe("AdminUsersTable 2FA column", () => {
  it("shows On for enrolled rows and Off otherwise", () => {
    const { unmount } = renderTable([row({ id: "u-1", twoFactorEnabled: true })]);
    expect(screen.getByText("On")).toBeInTheDocument();
    unmount();

    renderTable([row({ id: "u-2", twoFactorEnabled: false })]);
    expect(screen.getByText("Off")).toBeInTheDocument();
  });

  it("labels the column 2FA", () => {
    renderTable([row()]);

    expect(screen.getByText("2FA")).toBeInTheDocument();
  });
});
