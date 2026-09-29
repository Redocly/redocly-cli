import { filterByTypes } from '../../parser/index.js';
import type { TokenRule } from '../types.js';
import { getDescendantsByType, getReferenceLinkImageData, normalizeReference } from './helpers.js';

interface LinkOccurrence {
  destination: string;
  text: string;
  startLine: number;
}

// Like `getImageDestinations` in helpers.ts, but for `link` tokens.
function collectLinks(tree: Parameters<typeof getReferenceLinkImageData>[0]): LinkOccurrence[] {
  const { definitions } = getReferenceLinkImageData(tree);
  const occurrences: LinkOccurrence[] = [];

  for (const link of filterByTypes(tree, ['link'])) {
    const text = getDescendantsByType(link, ['label', 'labelText'])[0]?.text ?? '';
    const inlineDestination = getDescendantsByType(link, [
      'resource',
      'resourceDestination',
      ['resourceDestinationLiteral', 'resourceDestinationRaw'],
      'resourceDestinationString',
    ])[0]?.text;

    // Annotated because `[0]?.text` is inferred as `string`, which would reject the fallback below.
    let destination: string | undefined = inlineDestination;
    if (destination === undefined) {
      // Reference (`[text][label]`) or shortcut (`[label]`) link: the
      // destination lives in the definition, keyed by the normalized label.
      const referenceLabel =
        getDescendantsByType(link, ['reference', 'referenceString'])[0]?.text ?? text;
      destination = definitions.get(normalizeReference(referenceLabel))?.[1];
    }
    if (destination === undefined) continue;

    occurrences.push({ destination, text, startLine: link.startLine });
  }

  return occurrences;
}

// Recheck-original rule (no markdownlint equivalent). Linking one destination with several
// different link texts confuses screen-reader users, and the texts drift apart over time.
// The same text for the same destination is fine and not reported. Only the second and
// later links are flagged.
export const noDuplicateLinkDestinations: TokenRule = {
  name: 'no-duplicate-link-destinations',
  tags: ['links', 'accessibility'],
  fixable: false,
  defaults: {
    message: 'Link destination "%s" is already linked by different text',
  },
  check(ctx) {
    const firstTextByDestination = new Map<string, string>();

    for (const link of collectLinks(ctx.tree)) {
      const seenText = firstTextByDestination.get(link.destination);
      if (seenText === undefined) {
        firstTextByDestination.set(link.destination, link.text);
        continue;
      }
      if (seenText !== link.text) {
        ctx.onError({ line: link.startLine, context: link.destination });
      }
    }
  },
};
