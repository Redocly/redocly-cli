import type { Async2Rule, Async3Rule, Oas2Rule, OpenRpc1Rule } from '../../visitors.js';

export const SpecRefSiblings: Oas2Rule | Async2Rule | Async3Rule | OpenRpc1Rule = () => {
  return {
    ref: {
      leave(ref, { report, location }) {
        for (const key of Object.keys(ref)) {
          if (key === '$ref' || key.startsWith('x-')) continue;
          report({
            message: `Property \`${key}\` is not expected here because it is defined alongside \`$ref\`.`,
            location: location.child(key).key(),
            reference: 'https://redocly.com/docs/cli/rules/oas/spec-ref-siblings',
          });
        }
      },
    },
  };
};
