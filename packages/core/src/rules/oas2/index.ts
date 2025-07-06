import { Struct } from '../common/struct.js';
import { NoInvalidSchemaExamples } from '../common/no-invalid-schema-examples.js';
import { NoInvalidParameterExamples } from '../common/no-invalid-parameter-examples.js';
import { InfoContact } from '../common/info-contact.js';
import { InfoLicense } from '../common/info-license.js';
import { InfoLicenseUrl } from '../common/info-license-url.js';
import { InfoLicenseStrict } from '../common/info-license-strict.js';
import { BooleanParameterPrefixes } from './boolean-parameter-prefixes.js';
import { TagDescription } from '../common/tag-description.js';
import { TagsAlphabetical } from '../common/tags-alphabetical.js';
import { PathsKebabCase } from '../common/paths-kebab-case.js';
import { NoEnumTypeMismatch } from '../common/no-enum-type-mismatch.js';
import { NoPathTrailingSlash } from '../common/no-path-trailing-slash.js';
import { Operation2xxResponse } from '../common/operation-2xx-response.js';
import { Operation4xxResponse } from '../common/operation-4xx-response.js';
import { Assertions } from '../common/assertions/index.js';
import { OperationIdUnique } from '../common/operation-operationId-unique.js';
import { OperationParametersUnique } from '../common/operation-parameters-unique.js';
import { PathParamsDefined } from '../common/path-params-defined.js';
import { OperationTagDefined } from '../common/operation-tag-defined.js';
import { PathDeclarationMustExist } from '../common/path-declaration-must-exist.js';
import { OperationIdUrlSafe } from '../common/operation-operationId-url-safe.js';
import { OperationDescription } from '../common/operation-description.js';
import { PathNotIncludeQuery } from '../common/path-not-include-query.js';
import { ParameterDescription } from '../common/parameter-description.js';
import { OperationSingularTag } from '../common/operation-singular-tag.js';
import { SecurityDefined } from '../common/security-defined.js';
import { NoUnresolvedRefs } from '../no-unresolved-refs.js';
import { PathHttpVerbsOrder } from '../common/path-http-verbs-order.js';
import { NoIdenticalPaths } from '../common/no-identical-paths.js';
import { OperationOperationId } from '../common/operation-operationId.js';
import { OperationSummary } from '../common/operation-summary.js';
import { NoAmbiguousPaths } from '../common/no-ambiguous-paths.js';
import { NoHttpVerbsInPaths } from '../common/no-http-verbs-in-paths.js';
import { PathExcludesPatterns } from '../common/path-excludes-patterns.js';
import { RequestMimeType } from './request-mime-type.js';
import { ResponseMimeType } from './response-mime-type.js';
import { PathSegmentPlural } from '../common/path-segment-plural.js';
import { ResponseContainsHeader } from '../common/response-contains-header.js';
import { ResponseContainsProperty } from './response-contains-property.js';
import { ScalarPropertyMissingExample } from '../common/scalar-property-missing-example.js';
import { RequiredStringPropertyMissingMinLength } from '../common/required-string-property-missing-min-length.js';
import { SpecStrictRefs } from '../common/spec-strict-refs.js';
import { NoRequiredSchemaPropertiesUndefined } from '../common/no-required-schema-properties-undefined.js';
import { NoSchemaTypeMismatch } from '../common/no-schema-type-mismatch.js';
import { NoDuplicatedTagNames } from '../common/no-duplicated-tag-names.js';

import type { Oas2Rule } from '../../visitors.js';
import type { Oas2RuleSet } from '../../oas-types.js';

export const rules: Oas2RuleSet<'built-in'> = {
  struct: Struct as Oas2Rule,
  'no-invalid-schema-examples': NoInvalidSchemaExamples as Oas2Rule,
  'no-invalid-parameter-examples': NoInvalidParameterExamples,
  'info-contact': InfoContact as Oas2Rule,
  'info-license': InfoLicense as Oas2Rule,
  'info-license-url': InfoLicenseUrl as Oas2Rule,
  'info-license-strict': InfoLicenseStrict as Oas2Rule,
  'tag-description': TagDescription as Oas2Rule,
  'tags-alphabetical': TagsAlphabetical as Oas2Rule,
  'paths-kebab-case': PathsKebabCase as Oas2Rule,
  'no-enum-type-mismatch': NoEnumTypeMismatch as Oas2Rule,
  'boolean-parameter-prefixes': BooleanParameterPrefixes as Oas2Rule,
  'no-path-trailing-slash': NoPathTrailingSlash as Oas2Rule,
  'operation-2xx-response': Operation2xxResponse as Oas2Rule,
  'operation-4xx-response': Operation4xxResponse as Oas2Rule,
  assertions: Assertions as Oas2Rule,
  'operation-operationId-unique': OperationIdUnique as Oas2Rule,
  'operation-parameters-unique': OperationParametersUnique as Oas2Rule,
  'path-parameters-defined': PathParamsDefined as Oas2Rule,
  'operation-tag-defined': OperationTagDefined as Oas2Rule,
  'path-declaration-must-exist': PathDeclarationMustExist as Oas2Rule,
  'operation-operationId-url-safe': OperationIdUrlSafe as Oas2Rule,
  'operation-operationId': OperationOperationId as Oas2Rule,
  'operation-summary': OperationSummary as Oas2Rule,
  'operation-description': OperationDescription as Oas2Rule,
  'path-not-include-query': PathNotIncludeQuery as Oas2Rule,
  'path-params-defined': PathParamsDefined as Oas2Rule,
  'parameter-description': ParameterDescription as Oas2Rule,
  'operation-singular-tag': OperationSingularTag as Oas2Rule,
  'security-defined': SecurityDefined as Oas2Rule,
  'no-unresolved-refs': NoUnresolvedRefs as Oas2Rule,
  'no-identical-paths': NoIdenticalPaths as Oas2Rule,
  'no-ambiguous-paths': NoAmbiguousPaths as Oas2Rule,
  'path-http-verbs-order': PathHttpVerbsOrder as Oas2Rule,
  'no-http-verbs-in-paths': NoHttpVerbsInPaths as Oas2Rule,
  'path-excludes-patterns': PathExcludesPatterns as Oas2Rule,
  'request-mime-type': RequestMimeType as Oas2Rule,
  'response-mime-type': ResponseMimeType as Oas2Rule,
  'path-segment-plural': PathSegmentPlural as Oas2Rule,
  'response-contains-header': ResponseContainsHeader as Oas2Rule,
  'response-contains-property': ResponseContainsProperty as Oas2Rule,
  'scalar-property-missing-example': ScalarPropertyMissingExample as Oas2Rule,
  'required-string-property-missing-min-length': RequiredStringPropertyMissingMinLength as Oas2Rule,
  'spec-strict-refs': SpecStrictRefs as Oas2Rule,
  'no-required-schema-properties-undefined': NoRequiredSchemaPropertiesUndefined as Oas2Rule,
  'no-schema-type-mismatch': NoSchemaTypeMismatch as Oas2Rule,
  'no-duplicated-tag-names': NoDuplicatedTagNames as Oas2Rule,
};

export const preprocessors = {};
