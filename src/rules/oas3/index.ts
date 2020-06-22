import { Oas3RuleSet } from '../../validate';

import { Oas3Schema } from './schema';
import { Operation2xxResponse } from './operation-2xx-response';
import { OperationIdUnique } from './operation-operationId-unique';
import { OperationParametersUnique } from './operation-parameters-unique';
import { PathParamsDefined } from './path-params-defined';
import { OperationTagDefined } from './operation-tag-defined';
import { ExampleValueOrExternalValue } from './examples-value-or-externalValue';
import { TypedEnum } from './typed-enum';
import { NoPathTrailingSlash } from './no-path-trailing-slash';
import { PathDeclarationMustExist } from './path-declaration-must-exist';
import { OperationIdValidUrl } from './operation-operationId-valid-in-url';
import { OpenapiTagsAlphabetical } from './openapi-tags-alphabetical';
import { NoServerExample } from './no-server-example.com';
import { NoServerTrailingSlash } from './no-server-trailing-slash';
import { OperationDescription } from './operation-description';
import { NoUnusedComponents } from './no-unused-components';
import { PathNotIncludeQuery } from './path-not-include-query';
import { ParameterDescription } from './parameter-description';
import { OperationSingularTag } from './operation-singular-tag';
import { OperationSecurityDefined } from './operation-security-defined';
import { NoUnresolvedRefs } from '../no-unresolved-refs';
import { BooleanParameterPrefixes } from './boolean-parameter-prefixes';
import { PathsKebabCase } from './paths-kebab-case';
import { PathHttpVerbsOrder } from './path-http-verbs-order';
import { NoEmptyServers } from './no-empty-servers';
import { NoEmptyString } from './no-empty-string';

export default {
  schema: Oas3Schema,
  'operation-2xx-response': Operation2xxResponse,
  'operation-operationId-unique': OperationIdUnique,
  'operation-parameters-unique': OperationParametersUnique,
  'path-parameters-defined': PathParamsDefined,
  'operation-tag-defined': OperationTagDefined,
  'examples-value-or-externalValue': ExampleValueOrExternalValue,
  'typed-enum': TypedEnum,
  'no-path-trailing-slash': NoPathTrailingSlash,
  'no-empty-servers': NoEmptyServers,
  'path-declaration-must-exist': PathDeclarationMustExist,
  'operationId-valid-in-url': OperationIdValidUrl,
  'openapi-tags-alphabetical': OpenapiTagsAlphabetical,
  'no-server-example.com': NoServerExample,
  'no-server-trailing-slash': NoServerTrailingSlash,
  'operation-description': OperationDescription,
  'operation-operationId-valid-in-url': OperationIdValidUrl,
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
  'defined-and-no-empty-string': NoEmptyString,
} as Oas3RuleSet;
