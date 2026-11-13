/**
 * Copies the casing of the matched text onto its replacement, so a case-insensitive swap does
 * not turn "Behaviour" into "behavior". Handles lowercase, Capitalized and ALL-CAPS matches.
 * Any other casing leaves the replacement as written.
 *
 * An ALL-CAPS match only upper-cases a replacement without spaces. A phrase stays as written,
 * so `AKA` becomes `also known as`, not `ALSO KNOWN AS`. A hyphenated replacement counts as one
 * word, so `ECOMMERCE` becomes `E-COMMERCE`.
 */
export function applyMatchCase(match: string, replacement: string): string {
  const letters = match.replace(/[^A-Za-z]/g, '');
  if (letters.length === 0) return replacement;
  const isAllCaps = letters.length >= 2 && letters === letters.toUpperCase();
  if (isAllCaps) return /\s/.test(replacement) ? replacement : replacement.toUpperCase();
  const isCapitalized =
    letters[0] === letters[0].toUpperCase() && letters.slice(1) === letters.slice(1).toLowerCase();
  if (!isCapitalized) return replacement;
  return replacement.charAt(0).toUpperCase() + replacement.slice(1);
}
