import { Struct } from '../common/struct.js';
import { Operation2xxResponse } from '../common/operation-2xx-response.js';
import { Operation4xxResponse } from '../common/operation-4xx-response.js';
import { Assertions } from '../common/assertions/index.js';
import { OperationIdUnique } from '../common/operation-operationId-unique.js';
import { OperationParametersUnique } from '../common/operation-parameters-unique.js';
import { PathParamsDefined } from '../common/path-params-defined.js';
import { OperationTagDefined } from '../common/operation-tag-defined.js';
import { NoExampleValueAndExternalValue } from './no-example-value-and-externalValue.js';
import { NoEnumTypeMismatch } from '../common/no-enum-type-mismatch.js';
import { NoPathTrailingSlash } from '../common/no-path-trailing-slash.js';
import { PathDeclarationMustExist } from '../common/path-declaration-must-exist.js';
import { OperationIdUrlSafe } from '../common/operation-operationId-url-safe.js';
import { TagsAlphabetical } from '../common/tags-alphabetical.js';
import { NoServerExample } from './no-server-example.com.js';
import { NoServerTrailingSlash } from './no-server-trailing-slash.js';
import { TagDescription } from '../common/tag-description.js';
import { InfoContact } from '../common/info-contact.js';
import { InfoLicense } from '../common/info-license.js';
import { InfoLicenseUrl } from '../common/info-license-url.js';
import { InfoLicenseStrict } from '../common/info-license-strict.js';
import { OperationDescription } from '../common/operation-description.js';
import { NoUnusedComponents } from './no-unused-components.js';
import { PathNotIncludeQuery } from '../common/path-not-include-query.js';
import { ParameterDescription } from '../common/parameter-description.js';
import { OperationSingularTag } from '../common/operation-singular-tag.js';
import { SecurityDefined } from '../common/security-defined.js';
import { NoUnresolvedRefs } from '../no-unresolved-refs.js';
import { BooleanParameterPrefixes } from './boolean-parameter-prefixes.js';
import { PathsKebabCase } from '../common/paths-kebab-case.js';
import { PathHttpVerbsOrder } from '../common/path-http-verbs-order.js';
import { NoEmptyServers } from './no-empty-servers.js';
import { ValidContentExamples } from './no-invalid-media-type-examples.js';
import { NoIdenticalPaths } from '../common/no-identical-paths.js';
import { NoUndefinedServerVariable } from './no-undefined-server-variable.js';
import { OperationOperationId } from '../common/operation-operationId.js';
import { OperationSummary } from '../common/operation-summary.js';
import { NoAmbiguousPaths } from '../common/no-ambiguous-paths.js';
import { NoServerVariablesEmptyEnum } from './no-server-variables-empty-enum.js';
import { NoHttpVerbsInPaths } from '../common/no-http-verbs-in-paths.js';
import { RequestMimeType } from './request-mime-type.js';
import { ResponseMimeType } from './response-mime-type.js';
import { PathSegmentPlural } from '../common/path-segment-plural.js';
import { PathExcludesPatterns } from '../common/path-excludes-patterns.js';
import { NoInvalidSchemaExamples } from '../common/no-invalid-schema-examples.js';
import { NoInvalidParameterExamples } from '../common/no-invalid-parameter-examples.js';
import { ResponseContainsHeader } from '../common/response-contains-header.js';
import { ResponseContainsProperty } from './response-contains-property.js';
import { ScalarPropertyMissingExample } from '../common/scalar-property-missing-example.js';
import { SpecComponentsInvalidMapName } from './spec-components-invalid-map-name.js';
import { Operation4xxProblemDetailsRfc7807 } from './operation-4xx-problem-details-rfc7807.js';
import { RequiredStringPropertyMissingMinLength } from '../common/required-string-property-missing-min-length.js';
import { SpecStrictRefs } from '../common/spec-strict-refs.js';
import { ComponentNameUnique } from './component-name-unique.js';
import { ArrayParameterSerialization } from './array-parameter-serialization.js';
import { NoRequiredSchemaPropertiesUndefined } from '../common/no-required-schema-properties-undefined.js';
import { NoSchemaTypeMismatch } from '../common/no-schema-type-mismatch.js';
import { NoDuplicatedTagNames } from '../common/no-duplicated-tag-names.js';
import { NullableTypeSibling } from './nullable-type-sibling.js';

import type { Oas3RuleSet } from '../../oas-types.js';
import type { Oas3Rule } from '../../visitors.js';

export const rules: Oas3RuleSet<'built-in'> = {
  struct: Struct as Oas3Rule,
  'info-contact': InfoContact as Oas3Rule,
  'info-license': InfoLicense as Oas3Rule,
  'info-license-url': InfoLicenseUrl as Oas3Rule,
  'info-license-strict': InfoLicenseStrict as Oas3Rule,
  'operation-2xx-response': Operation2xxResponse as Oas3Rule,
  'operation-4xx-response': Operation4xxResponse as Oas3Rule,
  'operation-4xx-problem-details-rfc7807': Operation4xxProblemDetailsRfc7807,
  assertions: Assertions as Oas3Rule,
  'operation-operationId-unique': OperationIdUnique as Oas3Rule,
  'operation-parameters-unique': OperationParametersUnique as Oas3Rule,
  'operation-tag-defined': OperationTagDefined as Oas3Rule,
  'no-example-value-and-externalValue': NoExampleValueAndExternalValue,
  'no-enum-type-mismatch': NoEnumTypeMismatch as Oas3Rule,
  'no-path-trailing-slash': NoPathTrailingSlash as Oas3Rule,
  'no-empty-servers': NoEmptyServers,
  'path-declaration-must-exist': PathDeclarationMustExist as Oas3Rule,
  'operation-operationId-url-safe': OperationIdUrlSafe as Oas3Rule,
  'operation-operationId': OperationOperationId as Oas3Rule,
  'operation-summary': OperationSummary as Oas3Rule,
  'tags-alphabetical': TagsAlphabetical as Oas3Rule,
  'no-server-example.com': NoServerExample,
  'no-server-trailing-slash': NoServerTrailingSlash,
  'tag-description': TagDescription as Oas3Rule,
  'operation-description': OperationDescription as Oas3Rule,
  'no-unused-components': NoUnusedComponents,
  'path-not-include-query': PathNotIncludeQuery as Oas3Rule,
  'path-parameters-defined': PathParamsDefined as Oas3Rule,
  'path-params-defined': PathParamsDefined as Oas3Rule,
  'parameter-description': ParameterDescription as Oas3Rule,
  'operation-singular-tag': OperationSingularTag as Oas3Rule,
  'security-defined': SecurityDefined as Oas3Rule,
  'no-unresolved-refs': NoUnresolvedRefs,
  'paths-kebab-case': PathsKebabCase as Oas3Rule,
  'boolean-parameter-prefixes': BooleanParameterPrefixes,
  'path-http-verbs-order': PathHttpVerbsOrder as Oas3Rule,
  'no-invalid-media-type-examples': ValidContentExamples,
  'no-identical-paths': NoIdenticalPaths as Oas3Rule,
  'no-ambiguous-paths': NoAmbiguousPaths as Oas3Rule,
  'no-undefined-server-variable': NoUndefinedServerVariable,
  'no-server-variables-empty-enum': NoServerVariablesEmptyEnum,
  'no-http-verbs-in-paths': NoHttpVerbsInPaths as Oas3Rule,
  'path-excludes-patterns': PathExcludesPatterns as Oas3Rule,
  'request-mime-type': RequestMimeType,
  'response-mime-type': ResponseMimeType,
  'path-segment-plural': PathSegmentPlural as Oas3Rule,
  'no-invalid-schema-examples': NoInvalidSchemaExamples as Oas3Rule,
  'no-invalid-parameter-examples': NoInvalidParameterExamples,
  'response-contains-header': ResponseContainsHeader as Oas3Rule,
  'response-contains-property': ResponseContainsProperty,
  'scalar-property-missing-example': ScalarPropertyMissingExample as Oas3Rule,
  'spec-components-invalid-map-name': SpecComponentsInvalidMapName,
  'required-string-property-missing-min-length': RequiredStringPropertyMissingMinLength,
  'spec-strict-refs': SpecStrictRefs as Oas3Rule,
  'component-name-unique': ComponentNameUnique as Oas3Rule,
  'array-parameter-serialization': ArrayParameterSerialization,
  'no-required-schema-properties-undefined': NoRequiredSchemaPropertiesUndefined as Oas3Rule,
  'no-schema-type-mismatch': NoSchemaTypeMismatch as Oas3Rule,
  'no-duplicated-tag-names': NoDuplicatedTagNames as Oas3Rule,
  'nullable-type-sibling': NullableTypeSibling,
};

export const preprocessors = {};
