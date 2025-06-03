import { Struct } from '../common/struct.js';
import { Assertions } from '../common/assertions/index.js';
import { SourceDescriptionType } from '../arazzo/sourceDescription-type.js';
import { SourceDescriptionsNotEmpty } from './sourceDescriptions-not-empty.js';
import { RespectSupportedVersions } from '../respect/respect-supported-versions.js';
import { WorkflowIdUnique } from './workflowId-unique.js';
import { StepIdUnique } from './stepId-unique.js';
import { SourceDescriptionsNameUnique } from './sourceDescriptions-name-unique.js';
import { WorkflowDependsOn } from './workflow-dependsOn.js';
import { ParametersUnique } from './parameters-unique.js';
import { StepOnSuccessUnique } from './step-onSuccess-unique.js';
import { StepOnFailureUnique } from './step-onFailure-unique.js';
import { RequestBodyReplacementsUnique } from './requestBody-replacements-unique.js';
import { NoCriteriaXpath } from '../respect/no-criteria-xpath.js';
import { CriteriaUnique } from './criteria-unique.js';
import { NoXSecuritySchemeNameWithoutOpenAPI } from '../respect/no-x-security-scheme-name-without-openapi.js';
import { XSecuritySchemaRequiredValues } from '../respect/x-security-scheme-required-values.js';
import { NoXSecuritySchemeNameInWorkflow } from '../respect/no-x-security-scheme-name-in-workflow.js';

import type { Arazzo1Rule } from '../../visitors.js';
import type { Arazzo1RuleSet } from '../../oas-types.js';

export const rules: Arazzo1RuleSet<'built-in'> = {
  struct: Struct as Arazzo1Rule,
  assertions: Assertions as Arazzo1Rule,
  'sourceDescription-type': SourceDescriptionType,
  'respect-supported-versions': RespectSupportedVersions,
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
  'criteria-unique': CriteriaUnique,
  'no-x-security-scheme-name-without-openapi': NoXSecuritySchemeNameWithoutOpenAPI,
  'x-security-scheme-required-values': XSecuritySchemaRequiredValues,
  'no-x-security-scheme-name-in-workflow': NoXSecuritySchemeNameInWorkflow,
};

export const preprocessors = {};
