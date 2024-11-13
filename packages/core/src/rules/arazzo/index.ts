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
  'parameters-not-in-body': ParametersNotInBody as Arazzo1Rule,
  'sourceDescription-type': SourceDescriptionType as Arazzo1Rule,
  'version-enum': VersionEnum as Arazzo1Rule,
  'workflowId-unique': WorkflowIdUnique as Arazzo1Rule,
  'stepId-unique': StepIdUnique as Arazzo1Rule,
  'sourceDescription-name-unique': SourceDescriptionsNameUnique as Arazzo1Rule,
  'sourceDescriptions-not-empty': SourceDescriptionsNotEmpty as Arazzo1Rule,
  'workflow-dependsOn': WorkflowDependsOn as Arazzo1Rule,
  'parameters-unique': ParametersUnique as Arazzo1Rule,
  'step-onSuccess-unique': StepOnSuccessUnique as Arazzo1Rule,
  'step-onFailure-unique': StepOnFailureUnique as Arazzo1Rule,
  'requestBody-replacements-unique': RequestBodyReplacementsUnique as Arazzo1Rule,
  'no-criteria-xpath': NoCriteriaXpath as Arazzo1Rule,
  'no-actions-type-end': NoActionsTypeEnd as Arazzo1Rule,
  'criteria-unique': CriteriaUnique as Arazzo1Rule,
};

export const preprocessors = {};
