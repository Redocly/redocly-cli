import { Assertions } from '../common/assertions/index.js';
import { InfoContact } from '../common/info-contact.js';
import { NoUnresolvedRefs } from '../common/no-unresolved-refs.js';
import { Struct } from '../common/struct.js';
import type { Overlay1RuleSet } from '../../oas-types.js';
import type { Overlay1Rule } from '../../visitors.js';

export const rules: Overlay1RuleSet<'built-in'> = {
  'info-contact': InfoContact as Overlay1Rule,
  struct: Struct as Overlay1Rule,
  'no-unresolved-refs': NoUnresolvedRefs as Overlay1Rule,
  assertions: Assertions as Overlay1Rule,
};

export const preprocessors = {};
