import { Assertions } from '../common/assertions';
import { InfoContact } from '../common/info-contact';
import { Struct } from '../common/struct';

import type { Overlay1RuleSet } from '../../oas-types';
import type { Overlay1Rule } from '../../visitors';

export const rules: Overlay1RuleSet<'built-in'> = {
  'info-contact': InfoContact as Overlay1Rule,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore TODO: This is deprecated property `spec` and should be removed in the future
  spec: Struct as Overlay1Rule,
  struct: Struct as Overlay1Rule,
  assertions: Assertions as Overlay1Rule,
};
