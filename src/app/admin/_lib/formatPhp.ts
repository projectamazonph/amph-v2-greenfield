/**
 * formatPhp — format a number as Philippine Peso.
 *
 * Inline implementation of what will eventually live in src/lib/format.ts
 * (a future story consolidates all formatters there).
 *
 * @param amountPhp  Amount in PHP (not centavos). Decimal allowed.
 * @returns Formatted string with the peso sign and thousands separators.
 */
export function formatPhp(amountPhp: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amountPhp);
}
