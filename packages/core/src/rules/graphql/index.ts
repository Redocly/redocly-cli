import { GraphqlAssertions } from '../../graphql/assertions.js';
import type { GraphqlRule } from '../../graphql/visitor.js';
import type { GraphqlRuleSet } from '../../oas-types.js';
import { Struct } from './struct.js';
import { TypeDescription } from './type-description.js';

export const rules: GraphqlRuleSet<'built-in'> = {
  struct: Struct,
  assertions: GraphqlAssertions as GraphqlRule,
  'type-description': TypeDescription,
};
