import { isRef } from '../../ref-utils.js';

import type { Oas3Rule, Oas3Visitor } from '../../visitors.js';
import type { Oas3_1Schema, Oas3_2Parameter, Oas3Parameter } from '../../typings/openapi.js';
import { UserContext } from 'core/src/walk.js';

export type ArrayParameterSerializationOptions = {
  in?: string[];
};

export const ArrayParameterSerialization: Oas3Rule = (
  options: ArrayParameterSerializationOptions
): Oas3Visitor => {
  return {
    Parameter: {
      leave(node: Oas3Parameter | Oas3_2Parameter, ctx: UserContext) {
        if (!node.schema) {
          return;
        }
        const schema = (
          isRef(node.schema) ? ctx.resolve(node.schema).node : node.schema
        ) as Oas3_1Schema;

        if (
          schema &&
          shouldReportMissingStyleAndExplode(node, schema, options)
        ) {
          ctx.report({
            message: `Parameter \`${node.name}\` should have \`style\` and \`explode \` fields`,
            location: ctx.location,
          });
        }
      },
    },
  };
};

function shouldReportMissingStyleAndExplode(
  node: Oas3Parameter<Oas3_1Schema> | Oas3_2Parameter,
  schema: Oas3_1Schema,
  options: ArrayParameterSerializationOptions
) {
  return (
    (schema.type === 'array' || schema.items || schema.prefixItems) &&
    (node.style === undefined || node.explode === undefined) &&
    (!options.in || (node.in && options.in?.includes(node.in)))
  );
}
