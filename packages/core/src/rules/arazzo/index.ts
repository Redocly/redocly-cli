import { Struct } from '../common/struct';
import { Assertions } from '../common/assertions';
import { ParametersNotInBody } from '../spot/parameters-not-in-body';
import { SourceDescriptionType } from '../arazzo/sourceDescription-type';
import { SourceDescriptionsNotEmpty } from './sourceDescriptions-not-empty';
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

import type { Arazzo1Rule } from '../../visitors';
import type { Arazzo1RuleSet } from '../../oas-types';

export const rules: Arazzo1RuleSet<'built-in'> = {
  struct: Struct as Arazzo1Rule,
  assertions: Assertions as Arazzo1Rule,
  'parameters-not-in-body': ParametersNotInBody,
  'sourceDescription-type': SourceDescriptionType,
  'version-enum': VersionEnum,
  'workflowId-unique': WorkflowIdUnique,
  'stepId-unique': StepIdUnique,
  'sourceDescription-name-unique': SourceDescriptionsNameUnique,
  'sourceDescriptions-not-empty': SourceDescriptionsNotEmpty,
  'workflow-dependsOn': WorkflowDependsOn,
  'parameters-unique': ParametersUnique,
  'step-onSuccess-unique': StepOnSuccessUnique,
  'step-onFailure-unique': StepOnFailureUnique,
  'requestBody-replacements-unique': RequestBodyReplacementsUnique,
  'no-criteria-xpath': NoCriteriaXpath,
  'no-actions-type-end': NoActionsTypeEnd,
  'criteria-unique': CriteriaUnique,
};

export const preprocessors = {};
