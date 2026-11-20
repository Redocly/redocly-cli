import type { Arazzo1RuleSet } from '../../oas-types.js';
import type { Arazzo1Rule } from '../../visitors.js';
import { SourceDescriptionType } from '../arazzo/sourceDescription-type.js';
import { Assertions } from '../common/assertions/index.js';
import { NoDuplicatedEnumValues } from '../common/no-duplicated-enum-values.js';
import { NoEnumTypeMismatch } from '../common/no-enum-type-mismatch.js';
import { NoMixedNumberRangeConstraints } from '../common/no-mixed-number-range-constraints.js';
import { NoRequiredSchemaPropertiesUndefined } from '../common/no-required-schema-properties-undefined.js';
import { NoSchemaTypeMismatch } from '../common/no-schema-type-mismatch.js';
import { NoUnresolvedRefs } from '../common/no-unresolved-refs.js';
import { NoUnsafeMarkdown } from '../common/no-unsafe-markdown.js';
import { Struct } from '../common/struct.js';
import { NoCriteriaXpath } from '../respect/no-criteria-xpath.js';
import { NoXSecurityBothSchemeAndSchemeName } from '../respect/no-x-security-both-scheme-and-scheme-name.js';
import { NoXSecuritySchemeNameWithoutOpenAPI } from '../respect/no-x-security-scheme-name-without-openapi.js';
import { XSecuritySchemeNameReference } from '../respect/x-security-scheme-name-reference.js';
import { XSecuritySchemaRequiredValues } from '../respect/x-security-scheme-required-values.js';
import { CriteriaUnique } from './criteria-unique.js';
import { OutputsDefined } from './outputs-defined.js';
import { ParametersUnique } from './parameters-unique.js';
import { RequestBodyReplacementsUnique } from './requestBody-replacements-unique.js';
import { SourceDescriptionsNameUnique } from './sourceDescriptions-name-unique.js';
import { SourceDescriptionsNotEmpty } from './sourceDescriptions-not-empty.js';
import { SpecActionMutuallyExclusiveFields } from './spec-action-mutually-exclusive-fields.js';
import { SpecActionStepIdDefined } from './spec-action-stepId-defined.js';
import { SpecActionWorkflowIdDefined } from './spec-action-workflowId-defined.js';
import { SpecOutputsInvalidMapName } from './spec-outputs-invalid-map-name.js';
import { SpecQuerystringParameters } from './spec-querystring-parameters.js';
import { SpecSourceDescriptionsDefined } from './spec-sourceDescriptions-defined.js';
import { SpecStepMutuallyExclusiveFields } from './spec-step-mutually-exclusive-fields.js';
import { SpecStepOperationIdResolved } from './spec-step-operationId-resolved.js';
import { SpecStepParametersInRequired } from './spec-step-parameters-in-required.js';
import { SpecStepWorkflowIdDefined } from './spec-step-workflowId-defined.js';
import { StepOnFailureUnique } from './step-onFailure-unique.js';
import { StepOnSuccessUnique } from './step-onSuccess-unique.js';
import { StepIdUnique } from './stepId-unique.js';
import { WorkflowDependsOn } from './workflow-dependsOn.js';
import { WorkflowIdUnique } from './workflowId-unique.js';

export const rules: Arazzo1RuleSet<'built-in'> = {
  struct: Struct as Arazzo1Rule,
  assertions: Assertions as Arazzo1Rule,
  'criteria-unique': CriteriaUnique,
  'no-criteria-xpath': NoCriteriaXpath,
  'no-duplicated-enum-values': NoDuplicatedEnumValues as Arazzo1Rule,
  'no-unsafe-markdown': NoUnsafeMarkdown as Arazzo1Rule,
  'no-enum-type-mismatch': NoEnumTypeMismatch as Arazzo1Rule,
  'no-mixed-number-range-constraints': NoMixedNumberRangeConstraints as Arazzo1Rule,
  'no-required-schema-properties-undefined': NoRequiredSchemaPropertiesUndefined as Arazzo1Rule,
  'no-schema-type-mismatch': NoSchemaTypeMismatch as Arazzo1Rule,
  'no-unresolved-refs': NoUnresolvedRefs as Arazzo1Rule,
  'no-x-security-both-scheme-and-scheme-name': NoXSecurityBothSchemeAndSchemeName,
  'no-x-security-scheme-name-without-openapi': NoXSecuritySchemeNameWithoutOpenAPI,
  'outputs-defined': OutputsDefined,
  'parameters-unique': ParametersUnique,
  'requestBody-replacements-unique': RequestBodyReplacementsUnique,
  'sourceDescription-name-unique': SourceDescriptionsNameUnique,
  'sourceDescription-type': SourceDescriptionType,
  'sourceDescriptions-not-empty': SourceDescriptionsNotEmpty,
  'spec-action-mutually-exclusive-fields': SpecActionMutuallyExclusiveFields,
  'spec-action-stepId-defined': SpecActionStepIdDefined,
  'spec-action-workflowId-defined': SpecActionWorkflowIdDefined,
  'spec-outputs-invalid-map-name': SpecOutputsInvalidMapName,
  'spec-sourceDescriptions-defined': SpecSourceDescriptionsDefined,
  'spec-querystring-parameters': SpecQuerystringParameters,
  'spec-step-mutually-exclusive-fields': SpecStepMutuallyExclusiveFields,
  'spec-step-operationId-resolved': SpecStepOperationIdResolved,
  'spec-step-parameters-in-required': SpecStepParametersInRequired,
  'spec-step-workflowId-defined': SpecStepWorkflowIdDefined,
  'step-onFailure-unique': StepOnFailureUnique,
  'step-onSuccess-unique': StepOnSuccessUnique,
  'stepId-unique': StepIdUnique,
  'workflow-dependsOn': WorkflowDependsOn,
  'workflowId-unique': WorkflowIdUnique,
  'x-security-scheme-name-reference': XSecuritySchemeNameReference,
  'x-security-scheme-required-values': XSecuritySchemaRequiredValues,
};

export const preprocessors = {};
