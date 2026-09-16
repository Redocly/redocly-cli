import type { DiffRule } from '../types.js';
import { OperationRemoved, PathRemoved } from './operation.js';
import {
  ParameterAddedRequired,
  ParameterBecameRequired,
  ParameterRemoved,
  ParameterSerializationChanged,
} from './parameter.js';
import { RefTargetChanged } from './ref.js';
import { RequestBodyBecameRequired, RequestBodyRemoved } from './request-body.js';
import { MediaTypeRemoved, ResponseHeaderRemoved, ResponseRemoved } from './response.js';
import { schemaRules } from './schema.js';
import {
  SecurityRequirementAdded,
  SecuritySchemeChanged,
  SecuritySchemeRemoved,
  SecurityScopesAdded,
} from './security.js';

export const oas3Rules = {
  'operation-removed': OperationRemoved,
  'path-removed': PathRemoved,
  'parameter-removed': ParameterRemoved,
  'parameter-added-required': ParameterAddedRequired,
  'parameter-became-required': ParameterBecameRequired,
  'parameter-serialization-changed': ParameterSerializationChanged,
  'request-body-removed': RequestBodyRemoved,
  'request-body-became-required': RequestBodyBecameRequired,
  'response-removed': ResponseRemoved,
  'response-header-removed': ResponseHeaderRemoved,
  'media-type-removed': MediaTypeRemoved,
  'security-requirement-added': SecurityRequirementAdded,
  'security-scopes-added': SecurityScopesAdded,
  'security-scheme-changed': SecuritySchemeChanged,
  'security-scheme-removed': SecuritySchemeRemoved,
  'ref-target-changed': RefTargetChanged,
  ...schemaRules,
} satisfies Record<string, DiffRule>;
