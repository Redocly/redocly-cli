import type { DiffRuleRegistry } from '../types.js';
import { operationRemoved, pathRemoved } from './rules/operation-rules.js';
import {
  parameterAddedRequired,
  parameterBecameRequired,
  parameterRemoved,
  parameterSerializationChanged,
} from './rules/parameter-rules.js';
import { refTargetChanged } from './rules/ref-rules.js';
import { requestBodyBecameRequired, requestBodyRemoved } from './rules/request-body-rules.js';
import {
  mediaTypeRemoved,
  responseHeaderRemoved,
  responseRemoved,
} from './rules/response-rules.js';
import {
  additionalPropertiesChanged,
  enumValuesAdded,
  enumValuesRemoved,
  numericRangeChanged,
  propertyRemovedFromResponse,
  requiredPropertiesAdded,
  requiredPropertiesRemoved,
  schemaCombinatorChanged,
  schemaFormatChanged,
  schemaTypeChanged,
  stringLengthChanged,
} from './rules/schema-rules.js';
import {
  securityRequirementAdded,
  securitySchemeChanged,
  securitySchemeRemoved,
} from './rules/security-rules.js';

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
  Response: [responseRemoved, refTargetChanged],
  Header: [responseHeaderRemoved, refTargetChanged],
  HeadersMap: [responseHeaderRemoved],
  MediaType: [mediaTypeRemoved, refTargetChanged],
  RequestBody: [requestBodyRemoved, requestBodyBecameRequired, refTargetChanged],
  SecurityRequirementList: [securityRequirementAdded],
  SecurityScheme: [securitySchemeChanged, securitySchemeRemoved, refTargetChanged],
  Schema: [
    schemaTypeChanged,
    enumValuesRemoved,
    enumValuesAdded,
    requiredPropertiesAdded,
    requiredPropertiesRemoved,
    propertyRemovedFromResponse,
    numericRangeChanged,
    stringLengthChanged,
    schemaFormatChanged,
    additionalPropertiesChanged,
    schemaCombinatorChanged,
    refTargetChanged,
  ],
};
