import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Providers } from "@/app/providers";

describe("Providers", () => {
  it("pins Astryx to light mode so its surfaces match the light AMPH shell", () => {
    const html = renderToString(
      <Providers>
        <p>Admin content</p>
      </Providers>,
    );

    expect(html).toContain('data-theme="light"');
  });
});
