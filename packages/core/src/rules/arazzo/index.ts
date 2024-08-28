import { Spec } from '../common/spec';
import { Assertions } from '../common/assertions';
import { ParametersNoBodyInsideIn } from '../spot/parameters-no-body-inside-in';
import { SourceDescriptionType } from '../arazzo/source-description-type';
import { ArazzoVersionEnum } from '../spot/arazzo-version-enum';
import { WorkflowWorkflowIdUnique } from './workflow-workflowId-unique';
import { StepStepIdUnique } from './step-stepId-unique';
import { SourceDescriptionsNameUnique } from './sourceDescriptions-name-unique';
import { WorkflowDependsOn } from './workflow-dependsOn';
import { ParametersUnique } from './parameters-unique';
import { StepOnSuccessUnique } from './step-onSuccess-unique';
import { StepOnFailureUnique } from './step-onFailure-unique';
import { RequestBodyReplacementsUnique } from './requestBody-replacements-unique';

import type { ArazzoRule } from '../../visitors';
import type { ArazzoRuleSet } from '../../oas-types';

export const rules: ArazzoRuleSet<'built-in'> = {
  spec: Spec as ArazzoRule,
  assertions: Assertions as ArazzoRule,
  'parameters-no-body-inside-in': ParametersNoBodyInsideIn as ArazzoRule,
  'source-description-type': SourceDescriptionType as ArazzoRule,
  'arazzo-version-enum': ArazzoVersionEnum as ArazzoRule,
  'workflow-workflowId-unique': WorkflowWorkflowIdUnique as ArazzoRule,
  'step-stepId-unique': StepStepIdUnique as ArazzoRule,
  'sourceDescription-name-unique': SourceDescriptionsNameUnique as ArazzoRule,
  'workflow-dependsOn': WorkflowDependsOn as ArazzoRule,
  'parameters-unique': ParametersUnique as ArazzoRule,
  'step-onSuccess-unique': StepOnSuccessUnique as ArazzoRule,
  'step-onFailure-unique': StepOnFailureUnique as ArazzoRule,
  'requestBody-replacements-unique': RequestBodyReplacementsUnique as ArazzoRule,
};

export const preprocessors = {};
