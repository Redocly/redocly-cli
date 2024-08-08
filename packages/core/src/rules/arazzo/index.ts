import { ArazzoRule } from '../../visitors';
import { Spec } from '../common/spec';
import type { ArazzoRuleSet } from '../../oas-types';
import { Assertions } from '../common/assertions';
import { ParametersNoBodyInsideIn } from '../spot/parameters-no-body-inside-in';

export const rules: ArazzoRuleSet<'built-in'> = {
  spec: Spec as ArazzoRule,
  assertions: Assertions as ArazzoRule,
  'parameters-no-body-inside-in': ParametersNoBodyInsideIn as ArazzoRule,
};

export const preprocessors = {};
