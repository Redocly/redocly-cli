import { filterByTypes } from '../../parser/index.js';
import type { TokenRule } from '../types.js';
import { getDescendantsByType, getReferenceLinkImageData, normalizeReference } from './helpers.js';

interface LinkOccurrence {
  destination: string;
  text: string;
  startLine: number;
}

// Destination extraction mirrors `getImageDestinations` in helpers.ts (same
// token shapes, same reference-definition fallback) but for `link` rather
// than `image` tokens. Kept local rather than exported from helpers because
// this rule is its only consumer.
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

    // Explicit annotation: with `noUncheckedIndexedAccess` off, `[0]?.text`
    // infers as `string`, which would reject the reference-definition
    // fallback below.
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

// Recheck-original rule (no markdownlint equivalent, so it sits outside the
// parity comparison). Linking one destination from several DIFFERENT link
// texts is both an accessibility problem — screen-reader users listing a
// page's links hear the same target described inconsistently — and a
// maintenance smell, since the two texts drift apart over time.
//
// Repeating the SAME text for the same destination is ordinary prose (a
// page may reasonably link "the style guide" twice) and is not reported.
// Only the second and later occurrences are flagged: the first is the one
// the others should have matched.
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
