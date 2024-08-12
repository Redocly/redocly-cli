import { Spec } from '../common/spec';
import { Assertions } from '../common/assertions';

import type { ArazzoRule } from '../../visitors';
import type { ArazzoRuleSet } from '../../oas-types';

export const rules: ArazzoRuleSet<'built-in'> = {
  spec: Spec as ArazzoRule,
  assertions: Assertions as ArazzoRule,
};

export const preprocessors = {};
