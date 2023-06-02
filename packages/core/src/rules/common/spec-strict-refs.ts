import { Oas2Rule, Oas3Rule } from '../../visitors';
import { isRef } from '../../ref-utils';

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
    any(_node, { report, rawNode, rawLocation, type }) {
      const isShouldCheck = !nodesToSkip.includes(type.name);

      if (isShouldCheck && isRef(rawNode)) {
        report({
          message: 'Field $ref is not expected here.',
          location: rawLocation.child('$ref').key(),
        });
      }
    },
  };
};
