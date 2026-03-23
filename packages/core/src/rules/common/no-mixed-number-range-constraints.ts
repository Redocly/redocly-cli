import { type Oas3_1Schema } from '../../typings/openapi.js';
import {
  type Arazzo1Rule,
  type Async2Rule,
  type Async3Rule,
  type Oas3Rule,
} from '../../visitors.js';
import { type UserContext } from '../../walk.js';

export const NoMixedNumberRangeConstraints:
  | Oas3Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  return {
    Schema(schema: Oas3_1Schema, { report, location }: UserContext) {
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
