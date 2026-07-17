import { describe, it, expect } from "vitest";
import { Result } from "@/domain/shared/Result";

describe("Result", () => {
  describe("constructors", () => {
    it("ok() wraps a value with ok=true", () => {
      const r = Result.ok(42);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value).toBe(42);
    });

    it("err() wraps a failure with ok=false", () => {
      const r = Result.err({ kind: "boom", message: "explode" });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toEqual({ kind: "boom", message: "explode" });
    });

    it("Result object is frozen (shallow)", () => {
      const r = Result.ok({ a: 1 });
      expect(() => ((r as Record<string, unknown>).ok = false)).toThrow(TypeError);
    });
  });

  describe("map", () => {
    it("applies fn to the success value", () => {
      const r = Result.map(Result.ok(5), (n) => n * 2);
      expect(r).toEqual({ ok: true, value: 10 });
    });

    it("short-circuits on error", () => {
      let called = false;
      const r = Result.map(
        Result.err("nope"),
        (_n: number) => {
          called = true;
          return 1;
        },
      );
      expect(r).toEqual({ ok: false, error: "nope" });
      expect(called).toBe(false);
    });
  });

  describe("flatMap", () => {
    it("chains a successful operation that returns a Result", () => {
      const r = Result.flatMap(Result.ok(5), (n) =>
        n > 0 ? Result.ok(n * 2) : Result.err("negative"),
      );
      expect(r).toEqual({ ok: true, value: 10 });
    });

    it("propagates the inner error", () => {
      const r = Result.flatMap(Result.ok(-1), (n) =>
        n > 0 ? Result.ok(n * 2) : Result.err("negative"),
      );
      expect(r).toEqual({ ok: false, error: "negative" });
    });

    it("short-circuits on outer error", () => {
      let called = false;
      const r = Result.flatMap(Result.err("outer"), (_n: number) => {
        called = true;
        return Result.ok(99);
      });
      expect(r).toEqual({ ok: false, error: "outer" });
      expect(called).toBe(false);
    });
  });

  describe("combine", () => {
    it("returns all values when all ok", () => {
      const r = Result.combine(Result.ok(1), Result.ok("a"), Result.ok(true));
      expect(r).toEqual({ ok: true, value: [1, "a", true] });
    });

    it("returns the first error on any err", () => {
      const r = Result.combine(
        Result.ok(1),
        Result.err("first"),
        Result.err("second"),
      );
      expect(r).toEqual({ ok: false, error: "first" });
    });

    it("works with zero results", () => {
      const r = Result.combine();
      expect(r).toEqual({ ok: true, value: [] });
    });
  });

  describe("unwrapOr", () => {
    it("returns the value when ok", () => {
      expect(Result.unwrapOr(Result.ok(5), 99)).toBe(5);
    });

    it("returns the fallback when err", () => {
      expect(Result.unwrapOr(Result.err("nope"), 99)).toBe(99);
    });
  });

  describe("unwrap", () => {
    it("returns the value when ok", () => {
      expect(Result.unwrap(Result.ok(5))).toBe(5);
    });

    it("throws when err", () => {
      expect(() => Result.unwrap(Result.err("boom"))).toThrow(/boom/);
    });
  });

  describe("isOk / isErr", () => {
    it("isOk narrows correctly", () => {
      const r: Result<number, string> = Result.ok(1);
      if (Result.isOk(r)) {
        const _n: number = r.value;
        expect(_n).toBe(1);
      } else {
        throw new Error("should be ok");
      }
    });

    it("isErr narrows correctly", () => {
      const r: Result<number, string> = Result.err("nope");
      if (Result.isErr(r)) {
        const _e: string = r.error;
        expect(_e).toBe("nope");
      } else {
        throw new Error("should be err");
      }
    });
  });

  describe("discriminated union usage pattern", () => {
    type DbError = { kind: "not_found" } | { kind: "unauthorized" } | { kind: "conflict" };

    function findUser(id: string): Result<{ id: string; name: string }, DbError> {
      if (id === "1") return Result.ok({ id, name: "Alice" });
      if (id === "2") return Result.err({ kind: "unauthorized" });
      return Result.err({ kind: "not_found" });
    }

    it("exhaustively handles all error kinds via switch", () => {
      const r = findUser("1");
      if (!r.ok) {
        switch (r.error.kind) {
          case "not_found":
            throw new Error("not found");
          case "unauthorized":
            throw new Error("unauthorized");
          case "conflict":
            throw new Error("conflict");
        }
      }
      expect(r.value.name).toBe("Alice");
    });

    it("maps not_found to fallback user", () => {
      const r = findUser("999");
      const user = Result.isOk(r)
        ? r.value
        : { id: "guest", name: "Guest" };
      expect(user.id).toBe("guest");
    });
  });
});
