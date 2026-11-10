import { isRef } from '../../ref-utils.js';
import type { Oas2Rule, Oas3Rule } from '../../visitors.js';

export const SpecStrictRefs: Oas3Rule | Oas2Rule = () => {
  const nodesToSkip = [
    'Schema',
    'Response',
    'Parameter',
    'RequestBody',
    'Example',
    'Header',
    'SecurityScheme',
    'Link',
    'Callback',
    'PathItem',
  ];

  return {
    any(_node, { report, rawNode, rawLocation, type, specVersion }) {
      // OAS 3.2 allows a Reference Object as a `content` entry
      const isRefAllowed =
        nodesToSkip.includes(type.name) || (type.name === 'MediaType' && specVersion === 'oas3_2');

      if (!isRefAllowed && isRef(rawNode)) {
        report({
          message: 'Field $ref is not expected here.',
          location: rawLocation.child('$ref').key(),
          reference: 'https://redocly.com/docs/cli/rules/oas/spec-strict-refs',
        });
      }
    },
  };
};
