/** @type {import('commitlint').Config} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allow conventional commit types
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "perf", "test", "build", "ci", "chore", "revert"],
    ],
    // Subject should be lowercase
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
  },
};
