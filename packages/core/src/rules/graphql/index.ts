import type { GraphqlRuleSet } from '../../oas-types.js';
import { Struct } from './struct.js';
import { TypeDescription } from './type-description.js';
import { TypePascalCase } from './type-pascal-case.js';

export const rules: GraphqlRuleSet<'built-in'> = {
  struct: Struct,
  'type-description': TypeDescription,
  'type-pascal-case': TypePascalCase,
};

export const preprocessors = {};
