/**
 * Result<T, E> — the canonical sum type for operations that can fail.
 *
 * Use this instead of throwing exceptions across layer boundaries.
 * Throw only for programmer errors (invariant violations) — catch those at the boundary.
 *
 * @example
 * ```ts
 * const r = await doSomething();
 * if (!r.ok) {
 *   switch (r.error.kind) {
 *     case "not_found": return notFound();
 *     case "unauthorized": return unauthorized();
 *   }
 * }
 * return r.value;
 * ```
 */

/** Discriminated union: success or failure. */
export type Result<T, E> =
  | Readonly<{ ok: true; value: T }>
  | Readonly<{ ok: false; error: E }>;

const _ok = <T>(value: T): Result<T, never> =>
  Object.freeze({ ok: true as const, value });

const _err = <E>(error: E): Result<never, E> =>
  Object.freeze({ ok: false as const, error });

/**
 * Constructors
 */
export const Result = {
  /** Wrap a successful value. */
  ok: <T>(value: T): Result<T, never> => _ok(value),

  /** Wrap a failure. */
  err: <E>(error: E): Result<never, E> => _err(error),

  /**
   * Map over the success value.
   * Short-circuits on failure.
   *
   * @example
   * ```ts
   * const r = Result.ok(5);
   * const doubled = Result.map(r, n => n * 2); // { ok: true, value: 10 }
   * ```
   */
  map: <T, U, E>(
    r: Result<T, E>,
    fn: (value: T) => U,
  ): Result<U, E> =>
    r.ok ? Result.ok(fn(r.value)) : r,

  /**
   * Chain operations that can fail.
   * Short-circuits on failure.
   *
   * @example
   * ```ts
   * const r = await findUser(id);
   * const session = Result.flatMap(r, u => createSession(u));
   * ```
   */
  flatMap: <T, U, E>(
    r: Result<T, E>,
    fn: (value: T) => Result<U, E>,
  ): Result<U, E> =>
    r.ok ? fn(r.value) : r,

  /**
   * Run multiple Results in parallel; short-circuit on first failure.
   * Use `combine` when you need ALL results or nothing.
   *
   * @example
   * ```ts
   * const [userResult, courseResult] = await Promise.all([
   *   findUser(id),
   *   findCourse(slug),
   * ]);
   * const combined = Result.combine(userResult, courseResult);
   * if (!combined.ok) return combined.error; // first error
   * const { value: [user, course] } = combined;
   * ```
   */
  combine: <E, T extends readonly unknown[]>(
    ...results: { [K in keyof T]: Result<T[K], E> }
  ): Result<{ [K in keyof T]: T[K] }, E> => {
    const values = [] as unknown[];
    for (const r of results) {
      if (!r.ok) return r as Result<never, E>;
      values.push(r.value);
    }
    return Result.ok(values as { [K in keyof T]: T[K] });
  },

  /**
   * Extract the value, or return a default.
   * Use when failure is an acceptable default state.
   */
  unwrapOr: <T, _E>(r: Result<T, _E>, fallback: T): T =>
    r.ok ? r.value : fallback,

  /**
   * Extract the value or throw.
   * Prefer `unwrapOr` or pattern matching — this is for internal use.
   */
  unwrap: <T, E>(r: Result<T, E>): T => {
    if (!r.ok) throw new Error(`Result.unwrap called on Err: ${JSON.stringify(r.error)}`);
    return r.value;
  },

  /**
   * Check if a Result is ok.
   */
  isOk: <T, E>(r: Result<T, E>): r is Readonly<{ ok: true; value: T }> =>
    r.ok === true,

  /**
   * Check if a Result is an error.
   */
  isErr: <T, E>(r: Result<T, E>): r is Readonly<{ ok: false; error: E }> =>
    r.ok === false,
} as const;
