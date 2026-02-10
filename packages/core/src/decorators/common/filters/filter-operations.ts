import { isPlainObject } from '../../../utils/is-plain-object.js';
import { isRef } from '../../../ref-utils.js';
import { type Oas3PathItem, type Oas3Schema, type Oas3_1Schema } from '../../../typings/openapi.js';
import { type UserContext } from '../../../walk.js';
import { type Oas3Decorator, type Oas2Decorator } from '../../../visitors.js';

export const FilterOperations: Oas3Decorator | Oas2Decorator = ({ property, values }) => {
  const HTTP_METHODS = [
    'get',
    'post',
    'put',
    'delete',
    'patch',
    'options',
    'head',
    'trace',
    'query',
  ] as const;

  // Validate options upfront
  if (typeof property !== 'string') {
    throw new Error(`The 'property' option must be a string.`);
  }
  if (!Array.isArray(values)) {
    throw new Error(`The 'values' option must be an array.`);
  }

  return {
    PathItem: {
      enter(pathItem: Oas3PathItem<Oas3Schema | Oas3_1Schema>, ctx: UserContext) {
        for (const method of HTTP_METHODS) {
          const operation = isRef(pathItem[method])
            ? ctx.resolve(pathItem[method]).node
            : pathItem[method];

          if (isPlainObject(operation)) {
            const propertyValue = operation[property];
            const shouldKeep = Array.isArray(propertyValue)
              ? propertyValue.some((item) => values.includes(item))
              : values.includes(propertyValue);

            if (!shouldKeep) {
              delete pathItem[method];
            }
          }
        }

        const hasOperations =
          HTTP_METHODS.some((method) => pathItem[method]) || pathItem.additionalOperations;
        if (!hasOperations) {
          delete ctx.parent[ctx.key];
        }
      },
    },
  };
};
