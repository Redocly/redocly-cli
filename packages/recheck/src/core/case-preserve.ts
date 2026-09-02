/**
 * Applies the OBSERVED casing of a matched string to its replacement, so an
 * `ignoreCase` swap does not damage the text it fixes: with ignoreCase, a
 * sentence-initial "Behaviour" used to be replaced by literal "behavior",
 * silently lowercasing the start of the sentence.
 *
 * Only three shapes are inferred, deliberately: all-lowercase (insert the
 * replacement as configured), Capitalized, and ALL-CAPS (2+ characters, so a
 * single letter is not mistaken for an acronym). Anything else -- mIxEd case
 * -- carries no reliable intent, so the replacement is inserted as
 * configured rather than guessed at. Multi-word replacements capitalize only
 * the first word ("Login" -> "Log in", never "Log In").
 *
 * The ALL-CAPS branch does NOT upper-case the replacement unconditionally.
 * That would be correct when the replacement is a single word standing in
 * for the matched acronym/short-form (`WHITELIST` -> `ALLOWLIST` should
 * still shout -- that's the case this branch exists for), but wrong when
 * the replacement is a multi-word PHRASE: an all-caps short form expanded
 * to a phrase should not shout the whole phrase. Concretely, an
 * unconditional upper-case would corrupt: `GCP` -> `Google Cloud` into
 * `"GOOGLE CLOUD"`; `AKA` -> `also known as` into `"ALSO KNOWN AS"`;
 * `VICE VERSA` -> `the other way around` into `"THE OTHER WAY AROUND"`.
 * None of those would be a "casing fix" -- they'd be an ALL-CAPS match
 * forcing SHOUTING onto unrelated replacement text. The chosen semantics:
 * a multi-word replacement (one containing whitespace) is inserted AS
 * AUTHORED when the match is ALL-CAPS, same as the no-confident-inference
 * (mIxEd case) branch below -- simplest defensible answer, and consistent
 * with "the config's authored casing is presumed correct unless a
 * single-word match/replacement pair gives a confident signal otherwise."
 *
 * KNOWN EDGE, not fixed here (behavior unchanged): "multi-word" above is
 * literally "contains a space" (`/\s/`), so a hyphen-only or dot-only
 * replacement still counts as a single "word" and still gets shouted when
 * the match is ALL-CAPS -- `ECOMMERCE` -> `E-COMMERCE`, `NODEJS` ->
 * `NODE.JS`. This is a real, currently-shipping case, not a hypothetical:
 * `recheck/microsoft`'s `spelling-hyphenation` rule ships `ecommerce` ->
 * `e-commerce`, `elearning` -> `e-learning`, and `ebook` -> `e-book`
 * (`ignoreCase: true`, so `ECOMMERCE`/`ELEARNING`/`EBOOK` are all
 * ALL-CAPS-reachable matches), and all three replacements are hyphen-joined
 * with no space, so all three hit exactly this edge (`ECOMMERCE` fixes to
 * `E-COMMERCE`, shouted, not the authored `e-commerce`). The behavior is
 * still fine here: a shouted hyphenated replacement is a correct, readable
 * fix, just louder than authored.
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
