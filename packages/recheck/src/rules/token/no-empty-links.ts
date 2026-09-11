import { filterByTypes } from '../../parser/index.js';
// Ported from markdownlint's lib/md042.mjs
// (https://github.com/DavidAnson/markdownlint, MIT © David Anson).
// Upstream resolves reference-style link destinations via a shared,
// document-wide `getReferenceLinkImageData()` cache (lib/cache.mjs +
// helpers/helpers.cjs) that indexes every `[label]: destination` definition
// once per lint run. Batch 5 (Task 9) ported that full helper into
// helpers.ts (needed by link-fragments/reference-links-images/
// link-image-reference-definitions/link-image-style) -- this rule now
// calls it too instead of the narrower rule-local `buildDefinitionDestinations`
// it originally used (removed; its label -> destination lookup is exactly
// `getReferenceLinkImageData(tree).definitions`'s `[1]` element, so no
// behavior changed, just the source of the map).
import type { Token } from '../../parser/types.js';
import type { TokenRule } from '../types.js';
import { getDescendantsByType, getReferenceLinkImageData, normalizeReference } from './helpers.js';

export const noEmptyLinks: TokenRule = {
  name: 'no-empty-links',
  tags: ['links'],
  fixable: false,
  defaults: {
    message: 'No empty links',
  },
  check(ctx) {
    const { definitions } = getReferenceLinkImageData(ctx.tree);
    const isReferenceDefinitionHash = (token: Token): boolean =>
      definitions.get(normalizeReference(token.text.trim()))?.[1] === '#';

    for (const link of filterByTypes(ctx.tree, ['link'])) {
      const labelText = getDescendantsByType(link, ['label', 'labelText']);
      const reference = getDescendantsByType(link, ['reference']);
      const resource = getDescendantsByType(link, ['resource']);
      const referenceString = reference[0]
        ? getDescendantsByType(reference[0], ['referenceString'])
        : [];
      const resourceDestinationStringRaw = resource[0]
        ? getDescendantsByType(resource[0], [
            'resourceDestination',
            'resourceDestinationRaw',
            'resourceDestinationString',
          ])
        : [];
      const resourceDestinationStringLiteral = resource[0]
        ? getDescendantsByType(resource[0], [
            'resourceDestination',
            'resourceDestinationLiteral',
            'resourceDestinationString',
          ])
        : [];
      const resourceDestinationString = [
        ...resourceDestinationStringRaw,
        ...resourceDestinationStringLiteral,
      ];

      const hasLabelText = labelText.length > 0;
      const hasReference = reference.length > 0;
      const hasResource = resource.length > 0;
      const hasReferenceString = referenceString.length > 0;
      const hasResourceDestinationString = resourceDestinationString.length > 0;

      let error = false;
      if (
        hasLabelText &&
        ((!hasReference && !hasResource) || (hasReference && !hasReferenceString))
      ) {
        error = isReferenceDefinitionHash(labelText[0]);
      } else if (hasReferenceString && !hasResourceDestinationString) {
        error = isReferenceDefinitionHash(referenceString[0]);
      } else if (!hasReferenceString && hasResourceDestinationString) {
        error = resourceDestinationString[0].text.trim() === '#';
      } else if (!hasReferenceString && !hasResourceDestinationString) {
        error = true;
      }

      if (error) {
        ctx.onError({
          line: link.startLine,
          column: link.startColumn,
          context: link.text,
        });
      }
    }
  },
};
