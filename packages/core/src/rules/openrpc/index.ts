import { Struct } from '../common/struct.js';
import { NoUnresolvedRefs } from '../common/no-unresolved-refs.js';
import { Assertions } from '../common/assertions/index.js';
import { NoUnusedComponents } from './no-unused-components.js';
import { InfoLicense } from '../common/info-license.js';
import { InfoContact } from '../common/info-contact.js';

import type { OpenRpc1RuleSet } from '../../oas-types.js';
import type { OpenRpc1Rule } from '../../visitors.js';

export const rules: OpenRpc1RuleSet<'built-in'> = {
  struct: Struct as OpenRpc1Rule,
  'no-unresolved-refs': NoUnresolvedRefs as OpenRpc1Rule,
  assertions: Assertions as OpenRpc1Rule,
  'info-license': InfoLicense as OpenRpc1Rule,
  'no-unused-components': NoUnusedComponents,
  'info-contact': InfoContact as OpenRpc1Rule,
};

export const preprocessors = {};
