import type { Oas3Schema } from '../../typings/openapi.js';
import type { Oas2Schema } from '../../typings/swagger.js';
import type { Arazzo1Rule, Async2Rule, Async3Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

export const NoDuplicatedEnumValues:
  | Oas3Rule
  | Oas2Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  return {
    Schema(schema: Oas2Schema | Oas3Schema, { report, location }: UserContext) {
      if (!Array.isArray(schema.enum)) return;
      const seenValues = new Set();
      for (const [index, value] of schema.enum.entries()) {
        if (seenValues.has(value)) {
          report({
            message: `Duplicated enum value found: '${value}'.`,
            location: location.child(['enum', index]),
            reference: 'https://redocly.com/docs/cli/rules/common/no-duplicated-enum-values',
          });
        }
        seenValues.add(value);
      }
    },
  };
};
