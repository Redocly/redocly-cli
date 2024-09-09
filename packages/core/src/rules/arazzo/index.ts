import { Spec } from '../common/spec';
import { Assertions } from '../common/assertions';
import { ParametersNotInBody } from '../spot/parameters-not-in-body';
import { SourceDescriptionType } from '../arazzo/source-description-type';
import { VersionEnum } from '../spot/version-enum';
import { WorkflowIdUnique } from './workflowId-unique';
import { StepIdUnique } from './stepId-unique';
import { SourceDescriptionsNameUnique } from './sourceDescriptions-name-unique';
import { WorkflowDependsOn } from './workflow-dependsOn';
import { ParametersUnique } from './parameters-unique';
import { StepOnSuccessUnique } from './step-onSuccess-unique';
import { StepOnFailureUnique } from './step-onFailure-unique';
import { RequestBodyReplacementsUnique } from './requestBody-replacements-unique';
import { NoCriteriaXpath } from '../spot/no-criteria-xpath';
import { NoActionsTypeEnd } from '../spot/no-actions-type-end';
import { CriteriaUnique } from './criteria-unique';

import type { ArazzoRule } from '../../visitors';
import type { ArazzoRuleSet } from '../../oas-types';

export const rules: ArazzoRuleSet<'built-in'> = {
  spec: Spec as ArazzoRule,
  assertions: Assertions as ArazzoRule,
  'parameters-not-in-body': ParametersNotInBody as ArazzoRule,
  'sourceDescription-type': SourceDescriptionType as ArazzoRule,
  'version-enum': VersionEnum as ArazzoRule,
  'workflowId-unique': WorkflowIdUnique as ArazzoRule,
  'stepId-unique': StepIdUnique as ArazzoRule,
  'sourceDescription-name-unique': SourceDescriptionsNameUnique as ArazzoRule,
  'workflow-dependsOn': WorkflowDependsOn as ArazzoRule,
  'parameters-unique': ParametersUnique as ArazzoRule,
  'step-onSuccess-unique': StepOnSuccessUnique as ArazzoRule,
  'step-onFailure-unique': StepOnFailureUnique as ArazzoRule,
  'requestBody-replacements-unique': RequestBodyReplacementsUnique as ArazzoRule,
  'no-criteria-xpath': NoCriteriaXpath as ArazzoRule,
  'no-actions-type-end': NoActionsTypeEnd as ArazzoRule,
  'criteria-unique': CriteriaUnique as ArazzoRule,
};

export const preprocessors = {};
