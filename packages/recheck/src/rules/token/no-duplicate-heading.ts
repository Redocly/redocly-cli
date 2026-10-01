import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md024.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// `respectSections` is a Recheck extension. It is off by default, so the rule matches markdownlint.
import type { TokenRule } from '../types.js';
import { getHeadingLevel, getHeadingText } from './helpers.js';

// Headings skipped when `ignoreCommonHeadings` is on.
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
    // Recheck extensions with no markdownlint equivalent. The defaults match markdownlint.
    caseSensitive: true,
    ignoreCommonHeadings: false,
  },
  check(ctx) {
    const siblingsOnly = !!ctx.config.siblingsOnly;
    const respectSections = !!ctx.config.respectSections;
    const caseSensitive = ctx.config.caseSensitive !== false;
    const ignoreCommonHeadings = !!ctx.config.ignoreCommonHeadings;

    // Sets keep lookups fast in documents with many headings.
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
