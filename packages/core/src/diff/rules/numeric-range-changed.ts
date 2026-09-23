import { constraintRule } from './utils.js';

export const NumericRangeChanged = constraintRule([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
]);
