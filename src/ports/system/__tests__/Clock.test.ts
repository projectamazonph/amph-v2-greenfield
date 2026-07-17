import { describe, it, expect } from "vitest";
import { FixedClock, SystemClock } from "../Clock";

describe("SystemClock", () => {
  it("now() returns a Date", () => {
    const clock = new SystemClock();
    const now = clock.now();
    expect(now).toBeInstanceOf(Date);
    // Within 1 second of actual current time
    const drift = Math.abs(now.getTime() - Date.now());
    expect(drift).toBeLessThan(1000);
  });

  it("two calls return monotonically non-decreasing times", () => {
    const clock = new SystemClock();
    const a = clock.now();
    const b = clock.now();
    expect(b.getTime()).toBeGreaterThanOrEqual(a.getTime());
  });
});

describe("FixedClock", () => {
  it("returns the fixed time", () => {
    const t = new Date("2026-01-01T00:00:00Z");
    const clock = new FixedClock(t);
    expect(clock.now().toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("returns a copy of the date (mutations don't leak)", () => {
    const t = new Date("2026-01-01T00:00:00Z");
    const clock = new FixedClock(t);
    const now = clock.now();
    now.setFullYear(1999);
    // The clock should still return 2026
    expect(clock.now().getFullYear()).toBe(2026);
  });

  it("set() advances the clock to a new time", () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    clock.set(new Date("2026-07-01T12:00:00Z"));
    expect(clock.now().toISOString()).toBe("2026-07-01T12:00:00.000Z");
  });

  it("advance(ms) adds milliseconds", () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    clock.advance(60 * 60 * 1000); // 1 hour
    expect(clock.now().toISOString()).toBe("2026-01-01T01:00:00.000Z");
  });

  it("advanceSeconds(s) adds seconds", () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    clock.advanceSeconds(30);
    expect(clock.now().toISOString()).toBe("2026-01-01T00:00:30.000Z");
  });

  it("advanceDays(d) adds days", () => {
    const clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    clock.advanceDays(7);
    expect(clock.now().toISOString()).toBe("2026-01-08T00:00:00.000Z");
  });

  it("defaults to 'now' when constructed without a time", () => {
    const clock = new FixedClock();
    const drift = Math.abs(clock.now().getTime() - Date.now());
    expect(drift).toBeLessThan(1000);
  });
});
