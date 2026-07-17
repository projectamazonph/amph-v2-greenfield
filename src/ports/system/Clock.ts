/**
 * Clock port — the single abstraction for "what time is it now?".
 *
 * Business logic that needs the current time must accept a Clock via
 * constructor injection. Never call `new Date()` in domain or use-case code.
 * This makes time-dependent logic testable with a FixedClock.
 *
 * @example
 * ```ts
 * // Production
 * const clock = new SystemClock();
 *
 * // Tests
 * const clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
 * clock.set(new Date("2026-07-01T00:00:00Z")); // advance time
 * ```
 */

/** The wall-clock abstraction. All times are UTC. */
export interface Clock {
  /** Returns the current moment in UTC. */
  now(): Date;
}

/** Real system clock — use in production and integration tests. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/**
 * Frozen clock for tests. Advance it by calling `.set()`.
 *
 * @example
 * ```ts
 * const clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
 * clock.set(new Date("2026-07-01T12:00:00Z"));
 * expect(clock.now()).toEqual(new Date("2026-07-01T12:00:00Z"));
 * ```
 */
export class FixedClock implements Clock {
  private _now: Date;

  constructor(initial: Date = new Date()) {
    this._now = initial;
  }

  now(): Date {
    return new Date(this._now);
  }

  /** Advance the clock to a specific moment. */
  set(date: Date): void {
    this._now = new Date(date);
  }

  /** Advance by a duration in milliseconds. */
  advance(ms: number): void {
    this._now = new Date(this._now.getTime() + ms);
  }

  /** Advance by a duration in seconds. */
  advanceSeconds(s: number): void {
    this.advance(s * 1000);
  }

  /** Advance by a duration in days. */
  advanceDays(d: number): void {
    this.advance(d * 24 * 60 * 60 * 1000);
  }
}

// ── Internal helpers ────────────────────────────────────────


