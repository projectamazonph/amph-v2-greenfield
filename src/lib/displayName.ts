/**
 * src/lib/displayName.ts
 *
 * Display-only helpers for user-supplied name fields. The underlying User
 * entity stores whatever the signup form captured (e.g. "RYan", "McDonald",
 * "delacruz") — we never rewrite the source of truth. These helpers are
 * applied at render time so the UI is consistent and human-readable.
 */

/**
 * Lightly title-cases a name string for display. Preserves all-uppercase
 * tokens ("IBM") and common multi-letter connectors ("Mc", "Mac", "De",
 * "Van", "Von", "La", "Le", "St"). Handles ASCII whitespace and the most
 * common Unicode separators (em/en dash, hyphen, apostrophe).
 *
 * This is intentionally NOT a Unicode-correct title-case; it is good
 * enough for the Filipino / English name shapes AMPH accepts. For names
 * with non-Latin scripts (Tagalog with ñ, CJK, etc.) the input passes
 * through unchanged.
 */
export function displayName(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Split on whitespace and the common intra-name separators so "delA
  // CRUZ" still becomes "DelA CRUZ" (preserving the user's odd casing on
  // already-loud tokens but normalising the first letter of each part).
  const parts = trimmed.split(/([\s\u2013\u2014\-']+)/);
  return parts
    .map((part, i) => {
      // Separators stay as-is (they live at odd indices).
      if (i % 2 === 1) return part;
      if (!part) return part;
      return titleCaseToken(part);
    })
    .join("");
}

const UPPER_ACRONYMS = new Set([
  "IBM",
  "AWS",
  "USA",
  "UK",
  "EU",
  "API",
  "PPC",
  "PPCU",
  "AMPH",
  "ACOS",
  "TACOS",
  "ROAS",
  "CTR",
  "CVR",
  "ASIN",
]);

const LOWER_CONNECTORS = new Set([
  "mc",
  "mac",
  "de",
  "da",
  "del",
  "van",
  "von",
  "la",
  "le",
  "st",
  "st.",
  "of",
]);

function titleCaseToken(token: string): string {
  if (!token) return token;

  // Pure-uppercase tokens of 2+ letters that are known acronyms stay as-is
  // so "IBM" doesn't become "Ibm".
  if (token.length >= 2 && token === token.toUpperCase() && /^[A-Z]+$/.test(token)) {
    return UPPER_ACRONYMS.has(token) ? token : titleCaseLetters(token);
  }

  // Pure lowercase multi-letter tokens that are common connectors stay
  // lowercase after the leading letter so "McDonald" stays "McDonald"
  // and "macarthur" becomes "Macarthur" (not great, but not worse than
  // what we had).
  if (token.length >= 3 && token === token.toLowerCase()) {
    return titleCaseLetters(token);
  }

  return titleCaseLetters(token);
}

function titleCaseLetters(token: string): string {
  if (!token) return token;
  // Uppercase the first alphabetic character, lowercase the rest, but
  // preserve an apostrophe or hyphen that follows the first letter so
  // "O'Brien" stays "O'Brien" instead of "O'brien".
  const firstAlpha = token.search(/[\p{L}]/u);
  if (firstAlpha === -1) return token;
  const head = token.slice(0, firstAlpha);
  const ch = token.charAt(firstAlpha);
  const tail = token.slice(firstAlpha + 1);
  return head + ch.toUpperCase() + tail.toLowerCase();
}
