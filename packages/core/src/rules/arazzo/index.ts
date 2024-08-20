import { Spec } from '../common/spec';
import { Assertions } from '../common/assertions';
import { ParametersNoBodyInsideIn } from '../spot/parameters-no-body-inside-in';
import { StrictSourceDescriptionType } from '../arazzo/strict-source-description-type';
import { ArazzoVersionEnum } from '../spot/arazzo-version-enum';
import { WorkflowWorkflowIdUnique } from './workflow-workflowId-unique';

import type { ArazzoRule } from '../../visitors';
import type { ArazzoRuleSet } from '../../oas-types';

export const rules: ArazzoRuleSet<'built-in'> = {
  spec: Spec as ArazzoRule,
  assertions: Assertions as ArazzoRule,
  'parameters-no-body-inside-in': ParametersNoBodyInsideIn as ArazzoRule,
  'strict-source-description-type': StrictSourceDescriptionType as ArazzoRule,
  'arazzo-version-enum': ArazzoVersionEnum as ArazzoRule,
  'workflow-workflowId-unique': WorkflowWorkflowIdUnique as ArazzoRule,
};

export const preprocessors = {};
