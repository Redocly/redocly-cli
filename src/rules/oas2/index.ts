import { OasSpec } from "../common/spec";
import { InfoDescription } from "../common/info-description";
import { InfoContact } from "../common/info-contact";
import { InfoLicense } from "../common/info-license-url";
import { InfoLicenseUrl } from "../common/license-url";

import { BooleanParameterPrefixes } from "./boolean-parameter-prefixes";
import { TagDescription } from "../common/tag-description";
import { TagsAlphabetical } from "../common/tags-alphabetical";
import { PathsKebabCase } from "../common/paths-kebab-case";
import { NoEnumTypeMismatch } from "../common/no-enum-type-mismatch";
import { NoPathTrailingSlash } from "../common/no-path-trailing-slash";
import { Operation2xxResponse } from "../common/operation-2xx-response";
import { OperationIdUnique } from "../common/operation-operationId-unique";
import { OperationParametersUnique } from "../common/operation-parameters-unique";
import { PathParamsDefined } from "../common/path-params-defined";
import { OperationTagDefined } from "../common/operation-tag-defined";
import { PathDeclarationMustExist } from "../common/path-declaration-must-exist";
import { OperationIdUrlSafe } from "../common/operation-operationId-url-safe";
import { OperationDescription } from "../common/operation-description";
import { PathNotIncludeQuery } from "../common/path-not-include-query";
import { ParameterDescription } from "../common/parameter-description";
import { OperationSingularTag } from "../common/operation-singular-tag";
import { OperationSecurityDefined } from "../common/operation-security-defined";
import { NoUnresolvedRefs } from "../no-unresolved-refs";
import { PathHttpVerbsOrder } from "../common/path-http-verbs-order";

export const rules = {
  'info-description': InfoDescription,
  'info-contact': InfoContact,
  'info-license': InfoLicense,
  'info-license-url': InfoLicenseUrl,

  'tag-description': TagDescription,
  'tags-alphabetical': TagsAlphabetical,

  'paths-kebab-case': PathsKebabCase,
  'no-enum-type-mismatch': NoEnumTypeMismatch,

  'boolean-parameter-prefixes': BooleanParameterPrefixes,
  'no-path-trailing-slash': NoPathTrailingSlash,
  'operation-2xx-response': Operation2xxResponse,

  'operation-operationId-unique': OperationIdUnique,
  'operation-parameters-unique': OperationParametersUnique,
  'path-parameters-defined': PathParamsDefined,
  'operation-tag-defined': OperationTagDefined,

  'path-declaration-must-exist': PathDeclarationMustExist,
  'operationId-valid-in-url': OperationIdUrlSafe,

  'operation-description': OperationDescription,
  'operation-operationId-url-safe': OperationIdUrlSafe,
  'path-not-include-query': PathNotIncludeQuery,
  'path-params-defined': PathParamsDefined,
  'parameter-description': ParameterDescription,
  'operation-singular-tag': OperationSingularTag,
  'operation-security-defined': OperationSecurityDefined,
  'no-unresolved-refs': NoUnresolvedRefs,

  'path-http-verbs-order': PathHttpVerbsOrder,
  spec: OasSpec,
}

export const preprocessors = {
}
export const decorators = {
}