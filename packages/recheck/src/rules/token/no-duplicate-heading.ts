import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md024.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// `respectSections` is a Recheck extension ported from the legacy scope
// rule (src/rules/scope/no-duplicate-headings.ts)'s section-stack logic —
// additive alongside upstream's `siblingsOnly`, defaulting to `false` so
// the rule matches upstream behavior exactly until a user opts in.
import type { TokenRule } from '../types.js';
import { getHeadingLevel, getHeadingText } from './helpers.js';

// Legacy common-headings list from the deleted
// `src/rules/scope/no-duplicate-headings.ts` scope rule — ported verbatim
// as the additive `ignoreCommonHeadings` Recheck extension (Task 11).
const COMMON_HEADINGS = new Set<string>([
  'introduction',
  'overview',
  'getting started',
  'installation',
  'usage',
  'configuration',
  'api reference',
  'examples',
  'example',
  'troubleshooting',
  'faq',
  'conclusion',
  'summary',
  'notes',
  'warning',
  'caution',
  'tip',
]);

export const noDuplicateHeading: TokenRule = {
  name: 'no-duplicate-heading',
  tags: ['headings'],
  fixable: false,
  defaults: {
    message: 'Multiple headings with the same content',
    siblingsOnly: false,
    respectSections: false,
    // Additive Recheck extensions ported from the legacy scope rule.
    // Upstream MD024 has no equivalent option for either. Both default to
    // upstream-faithful values (case-sensitive comparison, no common-
    // headings skip-list) so a plain `no-duplicate-heading` config with no
    // options behaves identically to upstream MD024.
    caseSensitive: true,
    ignoreCommonHeadings: false,
  },
  check(ctx) {
    const siblingsOnly = !!ctx.config.siblingsOnly;
    const respectSections = !!ctx.config.respectSections;
    const caseSensitive = ctx.config.caseSensitive !== false;
    const ignoreCommonHeadings = !!ctx.config.ignoreCommonHeadings;

    // Sets, not arrays (upstream MD024 uses `.includes()` over growing
    // arrays): membership checks here run once per heading against every
    // previously seen key, so array buckets make the rule O(N^2) in the
    // heading count — pathological inputs (tens of thousands of headings)
    // took seconds in the rule alone. Set semantics are otherwise identical:
    // first occurrence inserts, later occurrences test true (SameValueZero
    // string equality, exactly what `.includes()` used).
    const knownContents: Set<string>[] = [new Set(), new Set()];
    let lastLevel = 1;
    let knownContent = knownContents[lastLevel];

    const sectionStack: string[] = [];

    for (const heading of filterByTypes(ctx.tree, ['atxHeading', 'setextHeading'])) {
      const rawHeadingText = getHeadingText(heading);
      const headingText = caseSensitive ? rawHeadingText : rawHeadingText.toLowerCase();

      if (ignoreCommonHeadings && COMMON_HEADINGS.has(rawHeadingText.trim().toLowerCase())) {
        continue;
      }

      if (siblingsOnly) {
        const newLevel = getHeadingLevel(heading);
        while (lastLevel < newLevel) {
          lastLevel++;
          knownContents[lastLevel] = new Set();
        }
        while (lastLevel > newLevel) {
          knownContents[lastLevel] = new Set();
          lastLevel--;
        }
        knownContent = knownContents[newLevel];
      }

      let isDuplicate: boolean;
      if (respectSections) {
        const level = getHeadingLevel(heading);
        while (sectionStack.length >= level) {
          sectionStack.pop();
        }
        sectionStack.push(headingText);
        const sectionKey = sectionStack.join('/');
        isDuplicate = knownContent.has(sectionKey);
        if (!isDuplicate) knownContent.add(sectionKey);
      } else {
        isDuplicate = knownContent.has(headingText);
        if (!isDuplicate) knownContent.add(headingText);
      }

      if (isDuplicate) {
        ctx.onError({
          line: heading.startLine,
          context: rawHeadingText.trim(),
        });
      }
    }
  },
};
