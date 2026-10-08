// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ModuleDependencyMatrix } from "../ModuleDependencyMatrix";
import type { ModuleDependencyMatrixData } from "@/usecases/GetModuleDependencyMatrix";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockDataEmpty: ModuleDependencyMatrixData = {
  modules: [
    {
      id: "m1",
      title: "Foundations",
      code: "M1",
      displayOrder: 1,
      courseId: "c1",
      courseTitle: "PPC Foundations",
      courseSlug: "ppc-foundations",
      courseTier: "STARTER",
    },
    {
      id: "m2",
      title: "Keyword Research",
      code: "M2",
      displayOrder: 2,
      courseId: "c1",
      courseTitle: "PPC Foundations",
      courseSlug: "ppc-foundations",
      courseTier: "STARTER",
    },
  ],
  matrix: [
    [
      { rowModuleId: "m1", colModuleId: "m1", cellType: "SELF", ruleSummary: null },
      { rowModuleId: "m1", colModuleId: "m2", cellType: "NONE", ruleSummary: null },
    ],
    [
      { rowModuleId: "m2", colModuleId: "m1", cellType: "NONE", ruleSummary: null },
      { rowModuleId: "m2", colModuleId: "m2", cellType: "SELF", ruleSummary: null },
    ],
  ],
  hasPrerequisites: false,
  totalPrerequisiteRules: 0,
};

const mockDataWithRules: ModuleDependencyMatrixData = {
  modules: [
    {
      id: "m1",
      title: "Foundations",
      code: "M1",
      displayOrder: 1,
      courseId: "c1",
      courseTitle: "PPC Foundations",
      courseSlug: "ppc-foundations",
      courseTier: "STARTER",
    },
    {
      id: "m2",
      title: "Portfolio Strategy",
      code: "M2",
      displayOrder: 1,
      courseId: "c2",
      courseTitle: "Accelerated Mastery",
      courseSlug: "accelerated-mastery",
      courseTier: "PRO",
    },
  ],
  matrix: [
    [
      { rowModuleId: "m1", colModuleId: "m1", cellType: "SELF", ruleSummary: null },
      {
        rowModuleId: "m1",
        colModuleId: "m2",
        cellType: "PREREQUISITE",
        ruleSummary: "M1 is required for M2",
      },
    ],
    [
      {
        rowModuleId: "m2",
        colModuleId: "m1",
        cellType: "DEPENDENT",
        ruleSummary: "M2 depends on M1",
      },
      { rowModuleId: "m2", colModuleId: "m2", cellType: "SELF", ruleSummary: null },
    ],
  ],
  hasPrerequisites: true,
  totalPrerequisiteRules: 1,
};

describe("ModuleDependencyMatrix", () => {
  it("renders empty state notice when no prerequisite rules exist", () => {
    render(<ModuleDependencyMatrix data={mockDataEmpty} courseId="c1" />);

    expect(screen.getByText("No Prerequisite Rules Configured")).toBeInTheDocument();
    expect(screen.getByText("Configure Course Prerequisites")).toBeInTheDocument();
  });

  it("renders matrix grid when prerequisite rules exist", () => {
    render(<ModuleDependencyMatrix data={mockDataWithRules} courseId="c1" />);

    expect(screen.getByText("Legend:")).toBeInTheDocument();
    expect(screen.getByText("Prereq")).toBeInTheDocument();
    expect(screen.getByText("Depends")).toBeInTheDocument();
    expect(screen.getByTitle("M1 is required for M2")).toBeInTheDocument();
    expect(screen.getByTitle("M2 depends on M1")).toBeInTheDocument();
  });

  it("allows toggling between All and Core view", () => {
    render(<ModuleDependencyMatrix data={mockDataWithRules} courseId="c1" />);

    const coreButton = screen.getByText("Core (9×9)");
    expect(coreButton).toBeInTheDocument();
    fireEvent.click(coreButton);

    const allButton = screen.getByText("All (2×2)");
    expect(allButton).toBeInTheDocument();
    fireEvent.click(allButton);
  });
});
