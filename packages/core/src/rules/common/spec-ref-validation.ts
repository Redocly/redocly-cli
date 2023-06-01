import { Oas2Rule, Oas3Rule } from '../../visitors';
import { isRef } from '../../ref-utils';

export const SpecRefValidation: Oas3Rule | Oas2Rule = () => {
  const nodesToValidate = [
    'Schema',
    'Response',
    'Parameter',
    'RequestBody',
    'Example',
    'Examples',
    'Header',
    'SecurityScheme',
    'Link',
    'Callback',
    'PathItem',
  ];

  return {
    any(_node, { report, rawNode, rawLocation, type }) {
      if (!nodesToValidate.includes(type.name) && isRef(rawNode)) {
        report({
          message: 'Field $ref is not expected here.',
          location: rawLocation.child('$ref').key(),
        });
      }
    },
  };
};
