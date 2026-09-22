import type { DiffRuleId } from '../diff/rules/index.js';
import type { Impact } from '../diff/types.js';
import { type RawGovernanceConfig } from './types.js';

export const defaultDiffRules: Record<DiffRuleId, Impact | 'off'> = {
  'additional-properties-changed': 'major',
  'channel-address-changed': 'major',
  'channel-removed': 'major',
  'enum-values-added': 'major',
  'enum-values-removed': 'major',
  'media-type-removed': 'major',
  'message-content-type-changed': 'major',
  'message-removed': 'major',
  'numeric-range-changed': 'major',
  'operation-action-changed': 'major',
  'operation-removed': 'major',
  'parameter-added-required': 'major',
  'parameter-became-required': 'major',
  'parameter-removed': 'major',
  'parameter-serialization-changed': 'major',
  'path-removed': 'major',
  'property-removed-from-response': 'major',
  'ref-target-changed': 'major',
  'request-body-became-required': 'major',
  'request-body-removed': 'major',
  'required-properties-added': 'major',
  'required-properties-removed': 'major',
  'response-header-removed': 'major',
  'response-removed': 'major',
  'schema-combinator-changed': 'major',
  'schema-format-changed': 'major',
  'schema-type-changed': 'major',
  'security-requirement-added': 'major',
  'security-scheme-changed': 'major',
  'security-scheme-removed': 'major',
  'security-scopes-added': 'major',
  'server-removed': 'major',
  'string-length-changed': 'major',
};

const diffRecommended: RawGovernanceConfig<'built-in'> = {
  diff: defaultDiffRules,
};

export default diffRecommended;
