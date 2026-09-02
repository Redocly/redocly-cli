// Barrel for all ported markdownlint token rules. Each batch task (5-10)
// adds its rules' imports/array entries here; `registry.ts` imports
// `allTokenRules` and registers the whole list once, so production entry
// points (the CLI, the public library API) get every ported rule without
// each one needing its own registration wiring. Deliberately has no
// dependency on `registry.js` (unlike the rules themselves, which import
// shared types from `../types.js`) — registration is registry.ts's job,
// keeping this a plain data barrel and avoiding a circular import between
// this file and registry.ts (import hoisting made an earlier
// self-registering version of this file initialize before registry.ts's
// own top-level `tokenRules` array existed).
import type { TokenRule } from '../types.js';
import { blanksAroundFences } from './blanks-around-fences.js';
import { blanksAroundHeadings } from './blanks-around-headings.js';
import { blanksAroundLists } from './blanks-around-lists.js';
import { blanksAroundTables } from './blanks-around-tables.js';
import { codeBlockStyle } from './code-block-style.js';
import { codeFenceStyle } from './code-fence-style.js';
import { commandsShowOutput } from './commands-show-output.js';
import { descriptiveLinkText } from './descriptive-link-text.js';
import { emphasisStyle } from './emphasis-style.js';
import { fencedCodeLanguage } from './fenced-code-language.js';
import { firstLineH1 } from './first-line-h1.js';
import { frontMatter } from './front-matter.js';
import { headingIncrement } from './heading-increment.js';
import { headingStartLeft } from './heading-start-left.js';
import { headingStyle } from './heading-style.js';
import { hrStyle } from './hr-style.js';
import { lineLength } from './line-length.js';
import { linkFragments } from './link-fragments.js';
import { linkImageReferenceDefinitions } from './link-image-reference-definitions.js';
import { linkImageStyle } from './link-image-style.js';
import { listIndent } from './list-indent.js';
import { listLength } from './list-length.js';
import { listMarkerSpace } from './list-marker-space.js';
import { markdocAttributes } from './markdoc-attributes.js';
import { markdocPairing } from './markdoc-pairing.js';
import { markdocSyntax } from './markdoc-syntax.js';
import { markdocUnknownTag } from './markdoc-unknown-tag.js';
import { noAltText } from './no-alt-text.js';
import { noBareUrls } from './no-bare-urls.js';
import { noBlanksBlockquote } from './no-blanks-blockquote.js';
import { noDuplicateHeading } from './no-duplicate-heading.js';
import { noDuplicateLinkDestinations } from './no-duplicate-link-destinations.js';
import { noEmphasisAsHeading } from './no-emphasis-as-heading.js';
import { noEmptyHeadings } from './no-empty-headings.js';
import { noEmptyLinks } from './no-empty-links.js';
import { noHardTabs } from './no-hard-tabs.js';
import { noInlineHtml } from './no-inline-html.js';
import { noMissingSpaceAtx } from './no-missing-space-atx.js';
import { noMissingSpaceClosedAtx } from './no-missing-space-closed-atx.js';
import { noMultipleBlanks } from './no-multiple-blanks.js';
import { noMultipleSpaceAtx } from './no-multiple-space-atx.js';
import { noMultipleSpaceBlockquote } from './no-multiple-space-blockquote.js';
import { noMultipleSpaceClosedAtx } from './no-multiple-space-closed-atx.js';
import { noReversedLinks } from './no-reversed-links.js';
import { noSpaceInCode } from './no-space-in-code.js';
import { noSpaceInEmphasis } from './no-space-in-emphasis.js';
import { noSpaceInLinks } from './no-space-in-links.js';
import { noTrailingPunctuation } from './no-trailing-punctuation.js';
import { noTrailingSpaces } from './no-trailing-spaces.js';
import { olPrefix } from './ol-prefix.js';
import { properNames } from './proper-names.js';
import { referenceLinksImages } from './reference-links-images.js';
import { requiredHeadings } from './required-headings.js';
import { singleH1 } from './single-h1.js';
import { singleTrailingNewline } from './single-trailing-newline.js';
import { strongStyle } from './strong-style.js';
import { tableColumnCount } from './table-column-count.js';
import { tableColumnStyle } from './table-column-style.js';
import { tablePipeStyle } from './table-pipe-style.js';
import { ulIndent } from './ul-indent.js';
import { ulStyle } from './ul-style.js';

export {
  headingIncrement,
  headingStyle,
  noMissingSpaceAtx,
  noMultipleSpaceAtx,
  noMissingSpaceClosedAtx,
  noMultipleSpaceClosedAtx,
  blanksAroundHeadings,
  headingStartLeft,
  noDuplicateHeading,
  noDuplicateLinkDestinations,
  noEmptyHeadings,
  listLength,
  singleH1,
  noTrailingPunctuation,
  noEmphasisAsHeading,
  firstLineH1,
  requiredHeadings,
  noTrailingSpaces,
  noHardTabs,
  noMultipleBlanks,
  lineLength,
  singleTrailingNewline,
  hrStyle,
  ulStyle,
  listIndent,
  ulIndent,
  olPrefix,
  listMarkerSpace,
  blanksAroundLists,
  noReversedLinks,
  commandsShowOutput,
  blanksAroundFences,
  noSpaceInEmphasis,
  noSpaceInLinks,
  noSpaceInCode,
  fencedCodeLanguage,
  noEmptyLinks,
  codeBlockStyle,
  codeFenceStyle,
  noInlineHtml,
  noBareUrls,
  properNames,
  noAltText,
  emphasisStyle,
  strongStyle,
  linkFragments,
  frontMatter,
  referenceLinksImages,
  linkImageReferenceDefinitions,
  linkImageStyle,
  descriptiveLinkText,
  noMultipleSpaceBlockquote,
  noBlanksBlockquote,
  tablePipeStyle,
  tableColumnCount,
  blanksAroundTables,
  tableColumnStyle,
  markdocSyntax,
  markdocPairing,
  markdocUnknownTag,
  markdocAttributes,
};

/** Every batch-1 (heading-family) token rule, in doc order (MD001-MD043). */
const batch1TokenRules: TokenRule[] = [
  headingIncrement,
  headingStyle,
  noMissingSpaceAtx,
  noMultipleSpaceAtx,
  noMissingSpaceClosedAtx,
  noMultipleSpaceClosedAtx,
  blanksAroundHeadings,
  headingStartLeft,
  noDuplicateHeading,
  noDuplicateLinkDestinations,
  noEmptyHeadings,
  singleH1,
  noTrailingPunctuation,
  noEmphasisAsHeading,
  firstLineH1,
  requiredHeadings,
];

/**
 * Every batch-2 (whitespace/line-family) token rule, in doc order
 * (MD009-MD047). `no-trailing-spaces` and `no-hard-tabs` were registered
 * here from the start, like every other token rule -- registration via
 * `tokenRulesByName` is independent of `scopeRules`, so this never broke
 * anything -- but while legacy scope rules still existed under those same
 * two ids, `resolveAssertion` in registry.ts (which is scope-first) resolved
 * both ids to the OLD legacy scope rules instead. Those `scopeRules` entries
 * have since been deleted, so both ids now resolve straight to these token
 * rules through the normal `resolveAssertion`
 * path. The batch-2 test files' `tokenRuleUnitHarness` (which bypasses the
 * resolver entirely) predates that cleanup and is still used there, but is
 * no longer strictly required for these two rules specifically.
 */
const batch2TokenRules: TokenRule[] = [
  noTrailingSpaces,
  noHardTabs,
  noMultipleBlanks,
  lineLength,
  singleTrailingNewline,
  hrStyle,
];

/**
 * Every batch-3 (list-family) token rule, in doc order (MD004-MD032). None
 * of these ids collided with a pre-existing legacy scope rule at the time
 * (the legacy `bullet-style` scope rule kept its own distinct id, separate
 * from `ul-style` here), so all six resolved and tested via the normal
 * `tokenRuleHarness` path with no `tokenRuleUnitHarness` needed.
 * `bullet-style` was later converged onto `ul-style` via a deprecated alias
 * (see ul-style.ts's `aliases`) after the legacy scope rule was deleted.
 *
 * `list-length` is grouped here as a seventh, list-family
 * entry for thematic proximity only -- it is Recheck-ORIGINAL, with no MD
 * id and no markdownlint counterpart (see RECHECK_ORIGINAL_TOKEN_RULE_NAMES
 * below).
 */
const batch3TokenRules: TokenRule[] = [
  ulStyle,
  listIndent,
  ulIndent,
  olPrefix,
  listMarkerSpace,
  blanksAroundLists,
  listLength,
];

/**
 * Every batch-4 (code + inline-syntax) token rule, in doc order
 * (MD011-MD048). None of these ids collide with a pre-existing legacy
 * scope rule, so all ten resolve and test via the normal
 * `tokenRuleHarness` path with no `tokenRuleUnitHarness` needed.
 */
const batch4TokenRules: TokenRule[] = [
  noReversedLinks,
  commandsShowOutput,
  blanksAroundFences,
  noSpaceInEmphasis,
  noSpaceInCode,
  noSpaceInLinks,
  fencedCodeLanguage,
  noEmptyLinks,
  codeBlockStyle,
  codeFenceStyle,
];

/**
 * Every batch-5 (link/image/emphasis-style) token rule, in doc order
 * (MD033-MD059) -- the biggest batch. None of these ids collided with a
 * pre-existing legacy scope rule id at the time (`link-fragments` was a new
 * id, distinct from the legacy `no-broken-fragment-links` scope rule it
 * replaces -- see link-fragments.ts's doc comment), so all eleven resolved
 * and tested via the normal `tokenRuleHarness` path with no
 * `tokenRuleUnitHarness` needed. `no-broken-fragment-links` was later
 * converged onto `link-fragments` via a deprecated alias after the legacy
 * scope rule was deleted.
 */
const batch5TokenRules: TokenRule[] = [
  noInlineHtml,
  noBareUrls,
  properNames,
  noAltText,
  emphasisStyle,
  strongStyle,
  linkFragments,
  referenceLinksImages,
  linkImageReferenceDefinitions,
  linkImageStyle,
  descriptiveLinkText,
];

/**
 * Every batch-6 (blockquote + table-family) token rule, in doc order
 * (MD027-MD060) -- the final batch, completing all 53 markdownlint-parity
 * rule ports. None of these ids collide with a pre-existing legacy scope
 * rule id, so all six resolve and test via the normal `tokenRuleHarness`
 * path with no `tokenRuleUnitHarness` needed.
 */
const batch6TokenRules: TokenRule[] = [
  noMultipleSpaceBlockquote,
  noBlanksBlockquote,
  tablePipeStyle,
  tableColumnCount,
  blanksAroundTables,
  tableColumnStyle,
];

/**
 * The four detection-only Markdoc validation rules: a grammar-level pair
 * (`markdoc-syntax`, `markdoc-pairing`) that needs no schema, and a
 * schema-aware pair (`markdoc-unknown-tag`, `markdoc-attributes`) that reads
 * `ctx.markdoc.schema` and goes inert when no schema is configured. All four
 * are Recheck-ORIGINAL (see RECHECK_ORIGINAL_TOKEN_RULE_NAMES below) --
 * Markdoc tag/attribute validation has no markdownlint counterpart at all,
 * so none of the four ships in the `recheck/markdown` parity preset.
 */
const markdocTokenRules: TokenRule[] = [
  markdocSyntax,
  markdocPairing,
  markdocUnknownTag,
  markdocAttributes,
];

/**
 * Recheck-ORIGINAL token rules: no markdownlint counterpart, so they are
 * deliberately absent from the `recheck/markdown` parity preset AND from the
 * parity harness's MD-id map. Three guards consume this list — the preset
 * drift test (src/config/__tests__/presets.test.ts), the registry test
 * (src/rules/__tests__/registry.test.ts), and the parity rule-map test
 * (benchmarks/parity/translate-config.test.mjs, which imports it from dist) —
 * so a native rule can never be silently forgotten by any of them, and the
 * three can never drift apart from separate hand-maintained copies.
 */
export const RECHECK_ORIGINAL_TOKEN_RULE_NAMES = [
  'front-matter',
  'no-duplicate-link-destinations',
  'no-empty-headings',
  'list-length',
  'markdoc-syntax',
  'markdoc-pairing',
  'markdoc-unknown-tag',
  'markdoc-attributes',
] as const;

export const allTokenRules: TokenRule[] = [
  ...batch1TokenRules,
  ...batch2TokenRules,
  ...batch3TokenRules,
  ...batch4TokenRules,
  ...batch5TokenRules,
  ...batch6TokenRules,
  ...markdocTokenRules,
  frontMatter,
];
