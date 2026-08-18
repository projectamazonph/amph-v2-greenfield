import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { SimulatorCoachGuide } from "../SimulatorCoachGuide";
import { SimulatorNextRep } from "../SimulatorNextRep";
import { SimulatorPageHeader } from "../SimulatorPageHeader";

vi.mock("server-only", () => ({}));

describe("simulator copy components", () => {
  it("renders the same coaching frame around a scenario", () => {
    const html = renderToString(
      <>
        <SimulatorPageHeader
          simulatorId="bid-elevator"
          title="Reduce ACoS on a high-spend electronics campaign"
          description="Wireless earbuds campaign spending ₱800/day at 45% ACoS."
        />
        <SimulatorCoachGuide simulatorId="bid-elevator" />
        <SimulatorNextRep simulatorId="bid-elevator" />
      </>,
    );

    expect(html).toContain("Practice goal.");
    expect(html).toContain("Your task");
    expect(html).toContain("Coach note");
    expect(html).toContain("Next rep.");
  });
});
