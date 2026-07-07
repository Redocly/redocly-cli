import type { DiffRuleRegistry } from '../types.js';
import { operationRemoved, pathRemoved } from './rules/operation-rules.js';
import {
  parameterAddedRequired,
  parameterBecameRequired,
  parameterRemoved,
} from './rules/parameter-rules.js';
import { refTargetChanged } from './rules/ref-rules.js';
import { mediaTypeRemoved, responseRemoved } from './rules/response-rules.js';
import {
  enumValuesAdded,
  enumValuesRemoved,
  propertyRemovedFromResponse,
  requiredPropertiesAdded,
  requiredPropertiesRemoved,
  schemaTypeChanged,
} from './rules/schema-rules.js';

export const oas3Rules: DiffRuleRegistry = {
  Operation: [operationRemoved],
  PathItem: [pathRemoved, refTargetChanged],
  Parameter: [parameterRemoved, parameterAddedRequired, parameterBecameRequired, refTargetChanged],
  Response: [responseRemoved, refTargetChanged],
  MediaType: [mediaTypeRemoved, refTargetChanged],
  RequestBody: [refTargetChanged],
  Schema: [
    schemaTypeChanged,
    enumValuesRemoved,
    enumValuesAdded,
    requiredPropertiesAdded,
    requiredPropertiesRemoved,
    propertyRemovedFromResponse,
    refTargetChanged,
  ],
};
