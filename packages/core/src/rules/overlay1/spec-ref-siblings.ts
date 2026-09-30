import type { Overlay1Rule } from '../../visitors.js';

const ALLOWED_SIBLINGS = ['$ref', 'target', 'description'];

export const SpecRefSiblings: Overlay1Rule = () => {
  return {
    ref: {
      leave(ref, { report, location, type }) {
        // Only an `actions` item references a reusable action; `$ref`s in overlay values are data.
        if (type.name !== 'ReusableAction') return;

        for (const key of Object.keys(ref)) {
          if (ALLOWED_SIBLINGS.includes(key) || key.startsWith('x-')) continue;
          report({
            message: `Property \`${key}\` is not expected here because it is defined alongside \`$ref\`.`,
            location: location.child(key).key(),
            reference: 'https://redocly.com/docs/cli/rules/oas/spec-ref-siblings',
          });
        }
        if (!Object.hasOwn(ref, 'target')) {
          report({
            message: 'The field `target` must be present next to `$ref`.',
            location: location.key(),
            reference: 'https://redocly.com/docs/cli/rules/oas/spec-ref-siblings',
          });
        }
      },
    },
  };
};
