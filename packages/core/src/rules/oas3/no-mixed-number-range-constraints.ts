import type { Oas3Rule } from '../../visitors.js';

export const NoMixedNumberRangeConstraints: Oas3Rule = () => {
  return {
    Schema(schema, { report, location }) {
      if (typeof schema.maximum === 'number' && typeof schema.exclusiveMaximum === 'number') {
        report({
          message:
            'Schema should not have both `maximum` and `exclusiveMaximum`. Use one or the other.',
          location: location.child(['exclusiveMaximum']).key(),
        });
      }
      if (typeof schema.minimum === 'number' && typeof schema.exclusiveMinimum === 'number') {
        report({
          message:
            'Schema should not have both `minimum` and `exclusiveMinimum`. Use one or the other.',
          location: location.child(['exclusiveMinimum']).key(),
        });
      }
    },
  };
};
