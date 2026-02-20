import { isRef } from '../../../ref-utils.js';
import { isPlainObject } from '../../../utils/is-plain-object.js';
import { type Oas3Visitor, type Oas2Decorator, type Oas3Decorator } from '../../../visitors.js';
import { checkIfMatchByStrategy, filter } from './filter-helper.js';

const DEFAULT_STRATEGY = 'any';

export const FilterIn: Oas3Decorator | Oas2Decorator = ({
  property,
  value,
  matchStrategy,
  target,
  noPropertyStrategy,
}) => {
  const strategy = matchStrategy || DEFAULT_STRATEGY;

  if (target !== undefined) {
    if (target === 'Operation') {
      const httpMethods = [
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

      return {
        PathItem: {
          enter(pathItem, ctx) {
            for (const method of httpMethods) {
              const operation = isRef(pathItem[method])
                ? ctx.resolve(pathItem[method]).node
                : pathItem[method];

              if (isPlainObject(operation)) {
                const propertyValue = operation[property];
                const shouldKeep = checkIfMatchByStrategy(propertyValue, value, strategy);
                const shouldKeepWhenNoProperty =
                  propertyValue === undefined && noPropertyStrategy !== 'remove';

                if (shouldKeepWhenNoProperty) {
                  // Do nothing, keep the operation if the property is missing and noPropertyStrategy is not set to 'remove'
                } else if (!shouldKeep) {
                  delete pathItem[method];
                }
              }
            }

            const hasOperations =
              httpMethods.some((method) => pathItem[method]) || pathItem.additionalOperations;
            if (!hasOperations) {
              delete ctx.parent[ctx.key];
            }
          },
        },
      } as Oas3Visitor;
    }

    if (target === 'PathItem') {
      return {
        PathItem: {
          enter(pathItem, ctx) {
            const propertyValue = (pathItem as Record<string, unknown>)[property];
            const shouldKeep = checkIfMatchByStrategy(propertyValue, value, strategy);
            const shouldKeepWhenNoProperty =
              propertyValue === undefined && noPropertyStrategy !== 'remove';

            if (shouldKeepWhenNoProperty) {
              // Do nothing, keep the path item if the property is missing and noPropertyStrategy is not set to 'remove'
            } else if (!shouldKeep) {
              delete ctx.parent[ctx.key];
            }
          },
        },
      } as Oas3Visitor;
    }

    throw new Error(`The 'target' option must be 'Operation' or 'PathItem' when provided.`);
  }

  const filterInCriteria = (item: any) =>
    item?.[property] && !checkIfMatchByStrategy(item?.[property], value, strategy);

  return {
    any: {
      enter: (node, ctx) => {
        filter(node, ctx, filterInCriteria);
      },
    },
  };
};
