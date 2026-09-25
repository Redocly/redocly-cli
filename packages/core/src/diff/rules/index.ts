import type { DiffRule } from '../types.js';
import { AdditionalPropertiesChanged } from './additional-properties-changed.js';
import { ChannelAddressChanged } from './channel-address-changed.js';
import { ChannelRemoved } from './channel-removed.js';
import { EnumValuesAdded } from './enum-values-added.js';
import { EnumValuesRemoved } from './enum-values-removed.js';
import { MediaTypeRemoved } from './media-type-removed.js';
import { MessageContentTypeChanged } from './message-content-type-changed.js';
import { MessageRemoved } from './message-removed.js';
import { NumericRangeChanged } from './numeric-range-changed.js';
import { OperationActionChanged } from './operation-action-changed.js';
import { OperationRemoved } from './operation-removed.js';
import { ParameterBecameRequired } from './parameter-became-required.js';
import { ParameterRemoved } from './parameter-removed.js';
import { ParameterSerializationChanged } from './parameter-serialization-changed.js';
import { PathRemoved } from './path-removed.js';
import { PropertyRemoved } from './property-removed.js';
import { RefTargetChanged } from './ref-target-changed.js';
import { RequestBodyBecameRequired } from './request-body-became-required.js';
import { RequestBodyRemoved } from './request-body-removed.js';
import { RequiredPropertiesAdded } from './required-properties-added.js';
import { RequiredPropertiesRemoved } from './required-properties-removed.js';
import { ResponseHeaderRemoved } from './response-header-removed.js';
import { ResponseRemoved } from './response-removed.js';
import { SchemaCombinatorChanged } from './schema-combinator-changed.js';
import { SchemaFormatChanged } from './schema-format-changed.js';
import { SchemaTypeChanged } from './schema-type-changed.js';
import { SecurityRequirementChanged } from './security-requirement-changed.js';
import { SecuritySchemeChanged } from './security-scheme-changed.js';
import { SecuritySchemeRemoved } from './security-scheme-removed.js';
import { ServerRemoved } from './server-removed.js';
import { StringConstraintChanged } from './string-constraint-changed.js';

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
  'property-removed': PropertyRemoved,
  'numeric-range-changed': NumericRangeChanged,
  'string-constraint-changed': StringConstraintChanged,
  'schema-format-changed': SchemaFormatChanged,
  'additional-properties-changed': AdditionalPropertiesChanged,
} satisfies Record<string, DiffRule>;

export const oas3Rules = {
  'operation-removed': OperationRemoved,
  'path-removed': PathRemoved,
  'parameter-removed': ParameterRemoved,
  'parameter-became-required': ParameterBecameRequired,
  'parameter-serialization-changed': ParameterSerializationChanged,
  'request-body-removed': RequestBodyRemoved,
  'request-body-became-required': RequestBodyBecameRequired,
  'response-removed': ResponseRemoved,
  'response-header-removed': ResponseHeaderRemoved,
  'media-type-removed': MediaTypeRemoved,
  'security-requirement-changed': SecurityRequirementChanged,
  'security-scheme-changed': SecuritySchemeChanged,
  'security-scheme-removed': SecuritySchemeRemoved,
  'server-removed': ServerRemoved,
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

/** The specification families diff rules exist for. */
export const diffRuleSets = { oas3: oas3Rules, async3: async3Rules };

export type DiffRuleSets = typeof diffRuleSets;
export type DiffFamily = keyof DiffRuleSets;
export type DiffRuleId = {
  [Family in DiffFamily]: keyof DiffRuleSets[Family] & string;
}[DiffFamily];

export function isDiffFamily(family: string): family is DiffFamily {
  return Object.hasOwn(diffRuleSets, family);
}

export const diffRuleIds: string[] = [
  ...new Set(Object.values(diffRuleSets).flatMap((rules) => Object.keys(rules))),
];
