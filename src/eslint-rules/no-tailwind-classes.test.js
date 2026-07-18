/**
 * no-tailwind-classes.test.js — TDD for the local ESLint rule that
 * bans Tailwind utility classes in src/.
 *
 * The project uses CSS Modules + design tokens (CSS variables). Tailwind
 * is intentionally not adopted. This rule enforces that decision: any
 * class name that looks like a Tailwind utility must be flagged.
 *
 * Categories we flag:
 *  1. Arbitrary value brackets: bg-[#fff], text-[var(--x)], w-[100px]
 *  2. Standard utility patterns: bg-red-500, p-4, mt-2, flex, hidden,
 *     rounded-lg, text-blue-300
 *  3. Any class with the utility prefixes bg-, text-, w-, h-, p-, m-,
 *     px-, py-, mx-, my-, mt-, mb-, ml-, mr-, flex, grid, hidden,
 *     block, inline, absolute, relative, fixed, sticky, top-, left-,
 *     right-, bottom-, z-, rounded-, border-, font-, leading-,
 *     tracking-, opacity-, scale-, rotate-, transition-, duration-,
 *     ease-, hover:, focus:, active:, group-hover:, etc.
 *
 * Categories we DON'T flag:
 *  - CSS Module references: className={styles.card}
 *  - BEM-style names: btn, btn-primary, form-input, alert, header
 *  - Non-Tailwind literal strings: "user-card", "sidebar", etc.
 *  - Dynamic class names from variables (we scan literal strings only)
 *
 * TDD: this test file is written FIRST, watched to fail (the rule
 * module doesn't exist), then the rule is implemented to make it pass.
 */

import { RuleTester } from "eslint";
import rule from "./no-tailwind-classes.js";

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run("no-tailwind-classes", rule, {
  valid: [
    // CSS Module references
    { code: '<div className={styles.card}>x</div>' },
    { code: '<button className={`${styles.btn} ${active ? styles.active : ""}`}>x</button>' },
    // BEM-style / non-Tailwind class names
    { code: '<div className="btn btn-primary">x</div>' },
    { code: '<input className="form-input" />' },
    { code: '<div className="user-card sidebar">x</div>' },
    { code: '<span className="alert alert-error">x</span>' },
    // Empty class
    { code: '<div className="">x</div>' },
    // No class at all
    { code: '<div>x</div>' },
    // Object-style className (CSS Modules, clsx, etc.) — we only scan
    // string literals, not expressions
    { code: '<div className={{ foo: true }}>x</div>' },
    // String with no Tailwind-looking tokens
    { code: 'const x = "hello world";' },
    // Bracket tokens without a Tailwind prefix are log messages, not
    // classes. The rule must not false-positive on them.
    { code: 'console.error("[performSignUp] auto-login failed:", err);' },
    { code: 'console.log("[webhook] received payment:", payload);' },
    { code: 'const err = new Error("[auth] invalid token");' },
  ],

  invalid: [
    // ── Arbitrary value brackets ──
    {
      code: '<div className="bg-[#fff]">x</div>',
      errors: [{ messageId: "noTailwind" }],
    },
    {
      code: '<div className="text-[var(--ink-700)]">x</div>',
      errors: [{ messageId: "noTailwind" }],
    },
    {
      code: '<div className="w-[100px]">x</div>',
      errors: [{ messageId: "noTailwind" }],
    },
    {
      // Whitespace tolerance
      code: '<div className="bg-[#fff]  text-[14px]">x</div>',
      errors: [
        { messageId: "noTailwind" },
        { messageId: "noTailwind" },
      ],
    },

    // ── Standard utility prefixes ──
    {
      code: '<div className="bg-red-500">x</div>',
      errors: [{ messageId: "noTailwind" }],
    },
    {
      code: '<div className="p-4 mt-2">x</div>',
      errors: [
        { messageId: "noTailwind" },
        { messageId: "noTailwind" },
      ],
    },
    {
      code: '<div className="rounded-lg shadow-md">x</div>',
      errors: [
        { messageId: "noTailwind" },
        { messageId: "noTailwind" },
      ],
    },
    {
      code: '<div className="text-blue-300">x</div>',
      errors: [{ messageId: "noTailwind" }],
    },
    {
      code: '<div className="flex hidden">x</div>',
      errors: [
        { messageId: "noTailwind" },
        { messageId: "noTailwind" },
      ],
    },
    {
      code: '<div className="hover:bg-red-500">x</div>',
      errors: [{ messageId: "noTailwind" }],
    },
    {
      code: '<div className="transition-all duration-200">x</div>',
      errors: [
        { messageId: "noTailwind" },
        { messageId: "noTailwind" },
      ],
    },

    // ── Mixed with valid classes (still flag) ──
    {
      code: '<div className="btn btn-primary bg-red-500">x</div>',
      errors: [{ messageId: "noTailwind" }],
    },
  ],
});
