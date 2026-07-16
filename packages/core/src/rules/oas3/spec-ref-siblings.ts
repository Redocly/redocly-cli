import type { Oas3Rule } from '../../visitors.js';

export const SpecRefSiblings: Oas3Rule = () => {
  return {
    ref: {
      leave(ref, { report, location, type, specVersion }) {
        const allowsRefSiblings = specVersion !== 'oas3_0';

        if (allowsRefSiblings && type.name === 'Schema') return;

        for (const key of Object.keys(ref)) {
          if (key === '$ref' || key.startsWith('x-')) continue;

          if (allowsRefSiblings && (key === 'summary' || key === 'description')) continue;

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
