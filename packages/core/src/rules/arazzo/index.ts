import { ArazzoRule } from '../../visitors';
import { Spec } from '../common/spec';
import type { ArazzoRuleSet } from '../../oas-types';
import { Assertions } from '../common/assertions';

export const rules: ArazzoRuleSet<'built-in'> = {
  spec: Spec as ArazzoRule,
  assertions: Assertions as ArazzoRule,
};

export const preprocessors = {};
