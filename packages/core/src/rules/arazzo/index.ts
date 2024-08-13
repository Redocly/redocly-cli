import { Spec } from '../common/spec.js';
import { Assertions } from '../common/assertions/index.js';

import type { ArazzoRule } from '../../visitors.js';
import type { ArazzoRuleSet } from '../../oas-types.js';

export const rules: ArazzoRuleSet<'built-in'> = {
  spec: Spec as ArazzoRule,
  assertions: Assertions as ArazzoRule,
};

export const preprocessors = {};
