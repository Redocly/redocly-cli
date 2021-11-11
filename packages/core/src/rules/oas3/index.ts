import { Oas3RuleSet } from '../../oas-types';
import { Oas3Decorator } from '../../visitors';
import { OasSpec } from '../common/spec';
import { Operation2xxResponse } from '../common/operation-2xx-response';
import { Operation4xxResponse } from '../common/operation-4xx-response';
import { OperationIdUnique } from '../common/operation-operationId-unique';
import { OperationParametersUnique } from '../common/operation-parameters-unique';
import { PathParamsDefined } from '../common/path-params-defined';
import { OperationTagDefined } from '../common/operation-tag-defined';
import { NoExampleValueAndExternalValue } from './no-example-value-and-externalValue';
import { NoEnumTypeMismatch } from '../common/no-enum-type-mismatch';
import { NoPathTrailingSlash } from '../common/no-path-trailing-slash';
import { PathDeclarationMustExist } from '../common/path-declaration-must-exist';
import { OperationIdUrlSafe } from '../common/operation-operationId-url-safe';
import { TagsAlphabetical } from '../common/tags-alphabetical';
import { NoServerExample } from './no-server-example.com';
import { NoServerTrailingSlash } from './no-server-trailing-slash';
import { InfoDescription } from '../common/info-description';
import { TagDescription } from '../common/tag-description';
import { InfoContact } from '../common/info-contact';
import { InfoLicense } from '../common/info-license-url';
import { OperationDescription } from '../common/operation-description';
import { NoUnusedComponents } from './no-unused-components';
import { PathNotIncludeQuery } from '../common/path-not-include-query';
import { ParameterDescription } from '../common/parameter-description';
import { OperationSingularTag } from '../common/operation-singular-tag';
import { InfoLicenseUrl } from '../common/license-url';
import { OperationSecurityDefined } from '../common/operation-security-defined';
import { NoUnresolvedRefs } from '../no-unresolved-refs';
import { BooleanParameterPrefixes } from './boolean-parameter-prefixes';
import { PathsKebabCase } from '../common/paths-kebab-case';
import { PathHttpVerbsOrder } from '../common/path-http-verbs-order';
import { NoEmptyServers } from './no-empty-servers';
import { ValidContentExamples } from './no-invalid-media-type-examples';
import { RegistryDependencies } from '../common/registry-dependencies';
import { NoIdenticalPaths } from '../common/no-identical-paths';
import { NoUndefinedServerVariable } from './no-undefined-server-variable';
import { OperationOperationId } from '../common/operation-operationId';
import { OperationSummary } from '../common/operation-summary';
import { NoAmbiguousPaths } from '../common/no-ambiguous-paths';
import { NoEmptyEnumServers } from './no-servers-empty-enum';
import { NoHttpVerbsInPaths } from '../common/no-http-verbs-in-paths';
import { RequestMimeType } from './request-mime-type';
import { ResponseMimeType } from './response-mime-type';
import { PathSegmentPlural } from '../common/path-segment-plural';
import { OperationDescriptionOverride } from '../common/operation-description-override';
import { TagDescriptionOverride } from '../common/tag-description-override';
import { InfoDescriptionOverride } from '../common/info-description-override';
import { PathExcludesPatterns } from '../common/path-excludes-patterns';

export const rules = {
  spec: OasSpec,
  'info-description': InfoDescription,
  'info-contact': InfoContact,
  'info-license': InfoLicense,
  'info-license-url': InfoLicenseUrl,
  'operation-2xx-response': Operation2xxResponse,
  'operation-4xx-response': Operation4xxResponse,
  'operation-operationId-unique': OperationIdUnique,
  'operation-parameters-unique': OperationParametersUnique,
  'path-parameters-defined': PathParamsDefined,
  'operation-tag-defined': OperationTagDefined,
  'no-example-value-and-externalValue': NoExampleValueAndExternalValue,
  'no-enum-type-mismatch': NoEnumTypeMismatch,
  'no-path-trailing-slash': NoPathTrailingSlash,
  'no-empty-servers': NoEmptyServers,
  'path-declaration-must-exist': PathDeclarationMustExist,
  'operation-operationId-url-safe': OperationIdUrlSafe,
  'operation-operationId': OperationOperationId,
  'operation-summary': OperationSummary,
  'tags-alphabetical': TagsAlphabetical,
  'no-server-example.com': NoServerExample,
  'no-server-trailing-slash': NoServerTrailingSlash,
  'tag-description': TagDescription,
  'operation-description': OperationDescription,
  'no-unused-components': NoUnusedComponents,
  'path-not-include-query': PathNotIncludeQuery,
  'path-params-defined': PathParamsDefined,
  'parameter-description': ParameterDescription,
  'operation-singular-tag': OperationSingularTag,
  'operation-security-defined': OperationSecurityDefined,
  'no-unresolved-refs': NoUnresolvedRefs,
  'paths-kebab-case': PathsKebabCase,
  'boolean-parameter-prefixes': BooleanParameterPrefixes,
  'path-http-verbs-order': PathHttpVerbsOrder,
  'no-invalid-media-type-examples': ValidContentExamples,
  'no-identical-paths': NoIdenticalPaths,
  'no-ambiguous-paths': NoAmbiguousPaths,
  'no-undefined-server-variable': NoUndefinedServerVariable,
  'no-servers-empty-enum': NoEmptyEnumServers,
  'no-http-verbs-in-paths': NoHttpVerbsInPaths,
  'path-excludes-patterns': PathExcludesPatterns,
  'request-mime-type': RequestMimeType,
  'response-mime-type': ResponseMimeType,
  'path-segment-plural': PathSegmentPlural,
} as Oas3RuleSet;

export const preprocessors = {};

export const decorators = {
  'registry-dependencies': RegistryDependencies as Oas3Decorator,
  'operation-description-override': OperationDescriptionOverride as Oas3Decorator,
  'tag-description-override': TagDescriptionOverride as Oas3Decorator,
  'info-description-override': InfoDescriptionOverride as Oas3Decorator,
};
