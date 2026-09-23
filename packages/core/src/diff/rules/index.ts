import type { DiffRule } from '../types.js';
import { ChannelAddressChanged, ChannelRemoved } from './channel.js';
import { MessageContentTypeChanged, MessageRemoved } from './message.js';
import { OperationActionChanged, OperationRemoved, PathRemoved } from './operation.js';
import {
  ParameterAddedRequired,
  ParameterBecameRequired,
  ParameterRemoved,
  ParameterSerializationChanged,
} from './parameter.js';
import { RefTargetChanged } from './ref.js';
import { RequestBodyBecameRequired, RequestBodyRemoved } from './request-body.js';
import { MediaTypeRemoved, ResponseHeaderRemoved, ResponseRemoved } from './response.js';
import {
  AdditionalPropertiesChanged,
  EnumValuesAdded,
  EnumValuesRemoved,
  NumericRangeChanged,
  PropertyRemovedFromResponse,
  RequiredPropertiesAdded,
  RequiredPropertiesRemoved,
  SchemaCombinatorChanged,
  SchemaFormatChanged,
  SchemaTypeChanged,
  StringLengthChanged,
} from './schema.js';
import {
  SecurityRequirementAdded,
  SecuritySchemeChanged,
  SecuritySchemeRemoved,
  SecurityScopesAdded,
} from './security.js';
import { ServerRemoved } from './server.js';

/**
 * Every rule over a `Schema` node, shared by both registries: an AsyncAPI payload is the same
 * node type, judged by the same questions.
 */
const schemaRules = {
  'schema-type-changed': SchemaTypeChanged,
  'enum-values-removed': EnumValuesRemoved,
  'enum-values-added': EnumValuesAdded,
  'required-properties-added': RequiredPropertiesAdded,
  'required-properties-removed': RequiredPropertiesRemoved,
  'property-removed-from-response': PropertyRemovedFromResponse,
  'numeric-range-changed': NumericRangeChanged,
  'string-length-changed': StringLengthChanged,
  'schema-format-changed': SchemaFormatChanged,
  'additional-properties-changed': AdditionalPropertiesChanged,
} satisfies Record<string, DiffRule>;

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
  'schema-combinator-changed': SchemaCombinatorChanged,
} satisfies Record<string, DiffRule>;

/**
 * An AsyncAPI 3 payload is a `Schema` node of the same shape the OpenAPI rules already judge,
 * so the whole schema rule set is reused. The combinator rule is not: the shared JSON Schema
 * type tree calls every combinator list `SchemaList`, so the keywords cannot be told apart.
 */
export const async3Rules = {
  'channel-removed': ChannelRemoved,
  'channel-address-changed': ChannelAddressChanged,
  'message-removed': MessageRemoved,
  'message-content-type-changed': MessageContentTypeChanged,
  'operation-removed': OperationRemoved,
  'operation-action-changed': OperationActionChanged,
  'server-removed': ServerRemoved,
  'ref-target-changed': RefTargetChanged,
  ...schemaRules,
} satisfies Record<string, DiffRule>;

export type Oas3DiffRuleId = keyof typeof oas3Rules;
export type Async3DiffRuleId = keyof typeof async3Rules;
export type DiffRuleId = Oas3DiffRuleId | Async3DiffRuleId;

export const diffRuleIds: string[] = [
  ...new Set([...Object.keys(oas3Rules), ...Object.keys(async3Rules)]),
];
