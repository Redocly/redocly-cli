import { isRef } from '../../../ref-utils.js';
import { isPlainObject } from '../../../utils/is-plain-object.js';
import { type Oas3Visitor, type Oas2Decorator, type Oas3Decorator } from '../../../visitors.js';
import { checkIfMatchByStrategy, filter } from './filter-helper.js';

const DEFAULT_STRATEGY = 'any';

export const FilterIn: Oas3Decorator | Oas2Decorator = ({
  property,
  value,
  matchStrategy,
  applyTo: target,
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
                if (!shouldKeep) {
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
            if (!shouldKeep) {
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
