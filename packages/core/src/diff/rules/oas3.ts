import type { DiffRuleRegistry } from '../types.js';
import { operationRemoved, pathRemoved } from './operation.js';
import {
  parameterAddedRequired,
  parameterBecameRequired,
  parameterRemoved,
  parameterSerializationChanged,
} from './parameter.js';
import { refTargetChanged } from './ref.js';
import { requestBodyBecameRequired, requestBodyRemoved } from './request-body.js';
import { mediaTypeRemoved, responseHeaderRemoved, responseRemoved } from './response.js';
import { schemaRules } from './schema.js';
import {
  securityRequirementAdded,
  securitySchemeChanged,
  securitySchemeRemoved,
  securityScopesAdded,
} from './security.js';

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
