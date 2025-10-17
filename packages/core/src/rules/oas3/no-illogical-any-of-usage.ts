import { areDuplicatedSchemas } from '../utils.js';

import type { Oas3Rule, Oas3Visitor } from '../../visitors.js';
import type { Oas3Schema, Oas3_1Schema } from '../../typings/openapi.js';
import type { UserContext } from '../../walk.js';

export const NoIllogicalAnyOfUsage: Oas3Rule = (): Oas3Visitor => {
  return {
    Schema: {
      skip(node) {
        return !node.anyOf;
      },
      enter(schema: Oas3Schema | Oas3_1Schema, { report, location }: UserContext) {
        if (!schema.anyOf) return;
        if (!Array.isArray(schema.anyOf)) return;
        const anyOfSchemas = schema.anyOf;

        if (anyOfSchemas.length < 2) {
          report({
            message: '`anyOf` must have at least two items',
            location,
          });
        } else {
          const { isDuplicated, reason: duplicatedReason } = areDuplicatedSchemas(
            anyOfSchemas,
            'anyOf'
          );
          if (isDuplicated && duplicatedReason) {
            report({
              message: duplicatedReason,
              location,
            });
          }
        }
      },
    },
  };
};
