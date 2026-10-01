// All token rules, collected for registry.ts. It must not import registry.ts (circular import).
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

/** Heading rules. */
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

/** Whitespace and line rules. */
const batch2TokenRules: TokenRule[] = [
  noTrailingSpaces,
  noHardTabs,
  noMultipleBlanks,
  lineLength,
  singleTrailingNewline,
  hrStyle,
];

/** List rules. `list-length` has no markdownlint counterpart. */
const batch3TokenRules: TokenRule[] = [
  ulStyle,
  listIndent,
  ulIndent,
  olPrefix,
  listMarkerSpace,
  blanksAroundLists,
  listLength,
];

/** Code and inline syntax rules. */
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

/** Link, image and emphasis rules. */
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

/** Blockquote and table rules. */
const batch6TokenRules: TokenRule[] = [
  noMultipleSpaceBlockquote,
  noBlanksBlockquote,
  tablePipeStyle,
  tableColumnCount,
  blanksAroundTables,
  tableColumnStyle,
];

/**
 * Markdoc rules. `markdoc-unknown-tag` and `markdoc-attributes` need a configured
 * schema and do nothing without one.
 */
const markdocTokenRules: TokenRule[] = [
  markdocSyntax,
  markdocPairing,
  markdocUnknownTag,
  markdocAttributes,
];

/**
 * Rules with no markdownlint counterpart. They are not in the `recheck/markdown`
 * preset. The preset and registry tests use this list.
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
