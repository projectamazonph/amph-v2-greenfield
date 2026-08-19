// src/components/lesson/__tests__/TradeOffTable.test.tsx
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TradeOffTable } from "../TradeOffTable";

describe("TradeOffTable", () => {
  it("renders rectangular columns + rows", () => {
    const html = renderToString(
      <TradeOffTable
        id="big-six"
        title="The Big Six"
        caption="What each metric answers"
        columns={["Metric", "What it answers"]}
        rows={[
          { label: "CPC", value: "How much per click" },
          { label: "CTR", value: "How often the ad gets clicked" },
        ]}
      />,
    );
    expect(html).toContain('id="big-six"');
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).toContain("The Big Six");
    expect(html).toContain("What each metric answers");
    expect(html).toContain("CPC");
    expect(html).toContain("How much per click");
    expect(html).toContain('scope="col"');
  });

  it("renders pairs form with row scope headers", () => {
    const html = renderToString(
      <TradeOffTable
        id="what-each-tells-you"
        title="What each tells you"
        pairs={[
          { label: "CPC", value: "Average cost per click" },
          { label: "CTR", value: "Share of impressions that become clicks" },
        ]}
      />,
    );
    expect(html).toContain('scope="row"');
    expect(html).toContain("Average cost per click");
    expect(html).toContain("Share of impressions that become clicks");
  });

  it("warns and renders placeholder for empty rows", () => {
    const html = renderToString(
      <TradeOffTable id="empty" title="Empty table" columns={["A"]} rows={[]} />,
    );
    expect(html).toMatch(/no rows|no data|empty/i);
  });
});
