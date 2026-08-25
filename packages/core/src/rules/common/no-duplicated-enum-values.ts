import type { Oas3Schema } from '../../typings/openapi.js';
import type { Oas2Schema } from '../../typings/swagger.js';
import { dequal } from '../../utils/dequal.js';
import { isPlainObject } from '../../utils/is-plain-object.js';
import type { Arazzo1Rule, Async2Rule, Async3Rule, Oas2Rule, Oas3Rule } from '../../visitors.js';
import type { UserContext } from '../../walk.js';

function isStructuredValue(value: unknown): boolean {
  return isPlainObject(value) || Array.isArray(value);
}

export const NoDuplicatedEnumValues:
  | Oas3Rule
  | Oas2Rule
  | Async3Rule
  | Async2Rule
  | Arazzo1Rule = () => {
  return {
    Schema(schema: Oas2Schema | Oas3Schema, { report, location }: UserContext) {
      if (!Array.isArray(schema.enum)) return;
      // A Set compares objects and arrays by identity, and two enum entries written the same way
      // are separate nodes, so structured values need a structural comparison instead.
      // Primitives keep the Set, which is what large enums of codes and names are made of.
      const seenPrimitives = new Set();
      const seenStructures: unknown[] = [];

      for (const [index, value] of schema.enum.entries()) {
        const isStructured = isStructuredValue(value);
        const isDuplicated = isStructured
          ? seenStructures.some((seenValue) => dequal(seenValue, value))
          : seenPrimitives.has(value);

        if (isDuplicated) {
          report({
            message: `Duplicated enum value found: '${
              isStructured ? JSON.stringify(value) : value
            }'.`,
            location: location.child(['enum', index]),
            reference: 'https://redocly.com/docs/cli/rules/common/no-duplicated-enum-values',
          });
        }

        if (isStructured) {
          seenStructures.push(value);
        } else {
          seenPrimitives.add(value);
        }
      }
    },
  };
};
