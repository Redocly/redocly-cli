import type { DiffRuleRegistry } from '../types.js';
import { operationRemoved, pathRemoved } from './rules/operation.js';
import {
  parameterAddedRequired,
  parameterBecameRequired,
  parameterRemoved,
  parameterSerializationChanged,
} from './rules/parameter.js';
import { refTargetChanged } from './rules/ref.js';
import { requestBodyBecameRequired, requestBodyRemoved } from './rules/request-body.js';
import { mediaTypeRemoved, responseHeaderRemoved, responseRemoved } from './rules/response.js';
import { schemaRules } from './rules/schema.js';
import {
  securityRequirementAdded,
  securitySchemeChanged,
  securitySchemeRemoved,
  securityScopesAdded,
} from './rules/security.js';

export const oas3Rules: DiffRuleRegistry = {
  Operation: [operationRemoved],
  PathItem: [pathRemoved, refTargetChanged],
  Parameter: [
    parameterRemoved,
    parameterAddedRequired,
    parameterBecameRequired,
    parameterSerializationChanged,
    refTargetChanged,
  ],
  ParameterList: [parameterRemoved, parameterAddedRequired],
  Response: [responseRemoved, refTargetChanged],
  Header: [responseHeaderRemoved, refTargetChanged],
  HeadersMap: [responseHeaderRemoved],
  MediaType: [mediaTypeRemoved, refTargetChanged],
  RequestBody: [requestBodyRemoved, requestBodyBecameRequired, refTargetChanged],
  SecurityRequirementList: [securityRequirementAdded],
  SecurityRequirement: [securityRequirementAdded, securityScopesAdded],
  SecurityScheme: [securitySchemeChanged, securitySchemeRemoved, refTargetChanged],
  Schema: [...schemaRules, refTargetChanged],
};
