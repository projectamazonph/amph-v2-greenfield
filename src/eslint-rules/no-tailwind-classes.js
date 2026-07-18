/**
 * no-tailwind-classes.js — local ESLint rule.
 *
 * Bans Tailwind utility classes from src/. The project uses CSS
 * Modules + design tokens (CSS variables) instead of Tailwind. This
 * rule enforces that decision: any class-name string containing a
 * Tailwind utility pattern is flagged.
 *
 * What we flag:
 *  1. Arbitrary value brackets: bg-[#fff], text-[var(--x)], w-[100px]
 *  2. Standard utility prefixes: bg-*, text-*, w-*, h-*, p-*, m-*,
 *     px-*, py-*, mx-*, my-*, mt-*, mb-*, ml-*, mr-*, flex, grid,
 *     hidden, block, inline-block, absolute, relative, fixed, sticky,
 *     rounded-*, border-*, font-*, leading-*, tracking-*, opacity-*,
 *     scale-*, rotate-*, transition-*, duration-*, ease-*, hover:*,
 *     focus:*, active:*, group-hover:*
 *
 * What we DON'T flag:
 *  - CSS Module references (className={styles.card})
 *  - BEM-style names: btn, btn-primary, form-input, alert
 *  - Object-style className expressions
 *  - Anything that doesn't look like a Tailwind utility
 *
 * The rule is deliberately conservative on the side of flagging.
 * False positives (e.g., a class literally named "text-content")
 * are easy to silence by using a CSS Module instead.
 *
 * TDD: see no-tailwind-classes.test.js for the full test surface.
 * The test file was written first; this implementation was written
 * to make it pass.
 */

const TAILWIND_PREFIXES = [
  // Color
  "bg-", "text-", "border-",
  // Sizing
  "w-", "h-", "min-w-", "max-w-", "min-h-", "max-h-", "size-",
  // Spacing
  "p-", "px-", "py-", "pt-", "pr-", "pb-", "pl-",
  "m-", "mx-", "my-", "mt-", "mr-", "mb-", "ml-",
  // Layout
  "flex", "grid", "block", "inline", "inline-block", "inline-flex",
  "hidden", "absolute", "relative", "fixed", "sticky",
  "top-", "right-", "bottom-", "left-", "inset-", "z-",
  // Borders & shape
  "rounded", "rounded-",
  // Typography
  "font-", "leading-", "tracking-", "truncate", "uppercase", "lowercase", "capitalize",
  // Effects
  "opacity-", "scale-", "rotate-", "translate-", "skew-", "origin-",
  "transition", "transition-", "duration-", "ease-", "delay-", "animate-",
  "shadow", "shadow-",
  // States (prefix: e.g. hover:bg-red-500)
  "hover:", "focus:", "active:", "disabled:", "group-hover:", "group-focus:",
  "dark:", "light:",
];

/**
 * Returns true if the given class token looks like a Tailwind utility.
 *
 * Handles compound tokens like "hover:bg-red-500" by stripping the
 * state prefix (hover:, focus:, etc.) and re-checking the remainder.
 *
 * @param {string} token  A single space-separated class token.
 * @returns {boolean}
 */
function looksLikeTailwind(token) {
  // Bracket arbitrary values: bg-[#fff], w-[100px], text-[var(--x)].
  // The bracket must be PRECEDED by a Tailwind prefix like "bg-",
  // otherwise it's not a Tailwind class (it's likely a log message
  // like "[performSignUp] something happened").
  for (const prefix of TAILWIND_PREFIXES) {
    if (!prefix.endsWith("-")) continue;
    const re = new RegExp("^" + prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\[");
    if (re.test(token)) {
      return true;
    }
  }

  // Strip a state prefix if present. e.g., "hover:bg-red-500" →
  // "bg-red-500". Handles chained states: "hover:focus:bg-red-500"
  // → "focus:bg-red-500" → "bg-red-500".
  const STATE_PREFIXES = ["hover", "focus", "active", "disabled", "group-hover", "group-focus", "dark", "light"];
  let remainder = token;
  let changed = true;
  while (changed) {
    changed = false;
    for (const state of STATE_PREFIXES) {
      if (remainder.startsWith(state + ":")) {
        remainder = remainder.slice(state.length + 1);
        changed = true;
        break;
      }
    }
  }

  // Check the standard prefixes (exact word match for bare names like
  // "flex", "hidden", "block"; prefix match for "bg-red-500").
  for (const prefix of TAILWIND_PREFIXES) {
    if (prefix.endsWith("-") || prefix.endsWith(":")) {
      if (remainder.startsWith(prefix)) {
        return true;
      }
    } else {
      // Exact match (e.g., "flex", "hidden", "grid")
      if (remainder === prefix) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Scan a string literal for Tailwind utility tokens. Returns the
 * matching tokens (for inclusion in the error message).
 *
 * @param {string} value
 * @returns {string[]}
 */
function findTailwindTokens(value) {
  return value
    .split(/\s+/)
    .filter((token) => token && looksLikeTailwind(token));
}

/** @type {import("eslint").Rule.RuleModule} */
export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow Tailwind utility classes. Use CSS Modules + design tokens (CSS variables) instead.",
      category: "Best Practices",
      recommended: false,
    },
    messages: {
      noTailwind:
        "Tailwind utility class detected: '{{token}}'. The project uses CSS Modules + design tokens, not Tailwind. " +
        "Add a class to the relevant CSS Module file (e.g. Button.module.css) and use it via className={styles.x}.",
    },
    schema: [],
  },

  create(context) {
    function checkStringLiteral(node, value) {
      const tokens = findTailwindTokens(value);
      for (const token of tokens) {
        context.report({
          node,
          messageId: "noTailwind",
          data: { token },
        });
      }
    }

    return {
      // JSX attribute: <div className="bg-red-500 p-4">x</div>
      'JSXAttribute[name.name="className"] > Literal'(node) {
        if (typeof node.value === "string") {
          checkStringLiteral(node, node.value);
        }
      },
      // JSX attribute: <div class="bg-red-500">x</div>  (some HTML elements)
      'JSXAttribute[name.name="class"] > Literal'(node) {
        if (typeof node.value === "string") {
          checkStringLiteral(node, node.value);
        }
      },
      // Backtick JSX expression with a single template literal:
      //   <div className={`bg-red-500`}>
      'JSXAttribute[name.name="className"] > JSXExpressionContainer > TemplateLiteral'(
        node,
      ) {
        for (const quasi of node.quasis) {
          if (typeof quasi.value.cooked === "string") {
            checkStringLiteral(node, quasi.value.cooked);
          }
        }
      },
      // The same for class= (HTML)
      'JSXAttribute[name.name="class"] > JSXExpressionContainer > TemplateLiteral'(
        node,
      ) {
        for (const quasi of node.quasis) {
          if (typeof quasi.value.cooked === "string") {
            checkStringLiteral(node, quasi.value.cooked);
          }
        }
      },
    };
  },
};
