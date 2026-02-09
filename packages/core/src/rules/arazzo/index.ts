import { SourceDescriptionType } from '../arazzo/sourceDescription-type.js';
import { Assertions } from '../common/assertions/index.js';
import { NoEnumTypeMismatch } from '../common/no-enum-type-mismatch.js';
import { NoRequiredSchemaPropertiesUndefined } from '../common/no-required-schema-properties-undefined.js';
import { NoSchemaTypeMismatch } from '../common/no-schema-type-mismatch.js';
import { NoUnresolvedRefs } from '../common/no-unresolved-refs.js';
import { Struct } from '../common/struct.js';
import { NoCriteriaXpath } from '../respect/no-criteria-xpath.js';
import { NoXSecurityBothSchemeAndSchemeName } from '../respect/no-x-security-both-scheme-and-scheme-name.js';
import { NoXSecuritySchemeNameWithoutOpenAPI } from '../respect/no-x-security-scheme-name-without-openapi.js';
import { RespectSupportedVersions } from '../respect/respect-supported-versions.js';
import { XSecuritySchemeNameReference } from '../respect/x-security-scheme-name-reference.js';
import { OutputsDefined } from './outputs-defined.js';

import type { Arazzo1RuleSet } from '../../oas-types.js';
import type { Arazzo1Rule } from '../../visitors.js';

export const rules: Arazzo1RuleSet<'built-in'> = {
  assertions: Assertions as Arazzo1Rule,
  'criteria-unique': CriteriaUnique,
  'no-criteria-xpath': NoCriteriaXpath,
  'no-enum-type-mismatch': NoEnumTypeMismatch as Arazzo1Rule,
  'no-required-schema-properties-undefined': NoRequiredSchemaPropertiesUndefined as Arazzo1Rule,
  'no-schema-type-mismatch': NoSchemaTypeMismatch as Arazzo1Rule,
  'no-unresolved-refs': NoUnresolvedRefs as Arazzo1Rule,
  'no-x-security-both-scheme-and-scheme-name': NoXSecurityBothSchemeAndSchemeName,
  'no-x-security-scheme-name-without-openapi': NoXSecuritySchemeNameWithoutOpenAPI,
  'outputs-defined': OutputsDefined,
  'parameters-unique': ParametersUnique,
  'requestBody-replacements-unique': RequestBodyReplacementsUnique,
  'respect-supported-versions': RespectSupportedVersions,
  'sourceDescription-name-unique': SourceDescriptionsNameUnique,
  'sourceDescription-type': SourceDescriptionType,
  'sourceDescriptions-not-empty': SourceDescriptionsNotEmpty,
  'step-onFailure-unique': StepOnFailureUnique,
  'step-onSuccess-unique': StepOnSuccessUnique,
  'stepId-unique': StepIdUnique,
  struct: Struct as Arazzo1Rule,
  'workflow-dependsOn': WorkflowDependsOn,
  'workflowId-unique': WorkflowIdUnique,
  'x-security-scheme-name-reference': XSecuritySchemeNameReference,
  'x-security-scheme-required-values': XSecuritySchemaRequiredValues,
};

export const preprocessors = {};
