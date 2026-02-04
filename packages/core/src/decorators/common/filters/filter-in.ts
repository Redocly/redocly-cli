import { checkIfMatchByStrategy, filter } from './filter-helper.js';

import type { Oas2Decorator, Oas3Decorator } from '../../../visitors.js';

const DEFAULT_STRATEGY = 'any';

export const FilterIn: Oas3Decorator | Oas2Decorator = ({
  property,
  value,
  matchStrategy,
  applyTo,
}) => {
  const strategy = matchStrategy || DEFAULT_STRATEGY;
  const filterInCriteria = (item: any) =>
    item?.[property] && !checkIfMatchByStrategy(item?.[property], value, strategy);

  const visitor = applyTo || 'any';

  return {
    [visitor]: {
      enter: (node, ctx) => {
        filter(node, ctx, filterInCriteria);
      },
    },
  };
};
