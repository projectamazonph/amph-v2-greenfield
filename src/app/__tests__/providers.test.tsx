import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { Providers } from "@/app/providers";

describe("Providers", () => {
  it("defaults to light mode on SSR so Astryx surfaces match the light AMPH shell", () => {
    // SSR runs before localStorage is available, so useTheme() always
    // reports "light" on the server. The client's useTheme() then takes
    // over after hydration and may flip to "dark" if the user has selected
    // it — see useTheme.ts.
    const html = renderToString(
      <Providers>
        <p>Admin content</p>
      </Providers>,
    );

    expect(html).toContain('data-theme="light"');
  });
});
