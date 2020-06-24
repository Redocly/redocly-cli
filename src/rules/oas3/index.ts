import { Oas3RuleSet } from '../../validate';

import { Oas3Spec } from './spec';
import { Operation2xxResponse } from './operation-2xx-response';
import { OperationIdUnique } from './operation-operationId-unique';
import { OperationParametersUnique } from './operation-parameters-unique';
import { PathParamsDefined } from './path-params-defined';
import { OperationTagDefined } from './operation-tag-defined';
import { NoExampleValueAndExternalValue } from './no-example-value-and-externalValue';
import { NoEnumTypeMismatch } from './no-enum-type-mismatch';
import { NoPathTrailingSlash } from './no-path-trailing-slash';
import { PathDeclarationMustExist } from './path-declaration-must-exist';
import { OperationIdValidUrl } from './operation-operationId-valid-in-url';
import { TagsAlphabetical } from './tags-alphabetical';
import { NoServerExample } from './no-server-example.com';
import { NoServerTrailingSlash } from './no-server-trailing-slash';
import { InfoDescription } from './info-description';
import { TagDescription } from './tag-description';
import { InfoContact } from './info-contact';
import { InfoLicense } from './info-license';
import { OperationDescription } from './operation-description';
import { NoUnusedComponents } from './no-unused-components';
import { PathNotIncludeQuery } from './path-not-include-query';
import { ParameterDescription } from './parameter-description';
import { OperationSingularTag } from './operation-singular-tag';
import { InfoLicenseUrl } from './license-url';
import { OperationSecurityDefined } from './operation-security-defined';
import { NoUnresolvedRefs } from '../no-unresolved-refs';
import { BooleanParameterPrefixes } from './boolean-parameter-prefixes';
import { PathsKebabCase } from './paths-kebab-case';
import { PathHttpVerbsOrder } from './path-http-verbs-order';
import { NoEmptyServers } from './no-empty-servers';

export default {
  spec: Oas3Spec,
  'operation-2xx-response': Operation2xxResponse,
  'operation-operationId-unique': OperationIdUnique,
  'operation-parameters-unique': OperationParametersUnique,
  'path-parameters-defined': PathParamsDefined,
  'operation-tag-defined': OperationTagDefined,
  'no-example-value-and-externalValue': NoExampleValueAndExternalValue,
  'no-enum-type-mismatch': NoEnumTypeMismatch,
  'no-path-trailing-slash': NoPathTrailingSlash,
  'no-empty-servers': NoEmptyServers,
  'path-declaration-must-exist': PathDeclarationMustExist,
  'operationId-valid-in-url': OperationIdValidUrl,
  'tags-alphabetical': TagsAlphabetical,
  'no-server-example.com': NoServerExample,
  'no-server-trailing-slash': NoServerTrailingSlash,
  'info-description': InfoDescription,
  'tag-description': TagDescription,
  'info-contact': InfoContact,
  'info-license': InfoLicense,
  'operation-description': OperationDescription,
  'operation-operationId-valid-in-url': OperationIdValidUrl,
  'no-unused-components': NoUnusedComponents,
  'path-not-include-query': PathNotIncludeQuery,
  'path-params-defined': PathParamsDefined,
  'parameter-description': ParameterDescription,
  'operation-singular-tag': OperationSingularTag,
  'info-license-url': InfoLicenseUrl,
  'operation-security-defined': OperationSecurityDefined,
  'no-unresolved-refs': NoUnresolvedRefs,
  'paths-kebab-case': PathsKebabCase,
  'boolean-parameter-prefixes': BooleanParameterPrefixes,
  'path-http-verbs-order': PathHttpVerbsOrder
} as Oas3RuleSet;
