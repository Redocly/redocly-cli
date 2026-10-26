import type { Async3DiffRuleId, Oas3DiffRuleId } from '../diff/rules/index.js';
import type { Impact } from '../diff/types.js';
import { type RawGovernanceConfig } from './types.js';

const oas3Diff: Record<Oas3DiffRuleId, Impact | 'off'> = {
  'enum-values-added': 'major',
  'enum-values-removed': 'major',
  'media-type-removed': 'major',
  'operation-id-changed': 'major',
  'operation-removed': 'major',
  'parameter-became-required': 'major',
  'parameter-removed': 'major',
  'parameter-serialization-changed': 'major',
  'path-removed': 'major',
  'property-removed': 'major',
  'request-body-became-required': 'major',
  'request-body-removed': 'major',
  'required-properties-added': 'major',
  'required-properties-removed': 'major',
  'response-header-removed': 'major',
  'response-removed': 'major',
  'schema-combinator-changed': 'major',
  'schema-constraint-changed': 'major',
  'schema-type-changed': 'major',
  'security-requirement-changed': 'major',
  'security-scheme-changed': 'major',
  'server-removed': 'major',
};

const async3Diff: Record<Async3DiffRuleId, Impact | 'off'> = {
  'channel-address-changed': 'major',
  'channel-removed': 'major',
  'enum-values-added': 'major',
  'enum-values-removed': 'major',
  'message-content-type-changed': 'major',
  'message-removed': 'major',
  'operation-action-changed': 'major',
  'operation-removed': 'major',
  'property-removed': 'major',
  'required-properties-added': 'major',
  'required-properties-removed': 'major',
  'schema-constraint-changed': 'major',
  'schema-type-changed': 'major',
  'server-removed': 'major',
};

const diffRecommended: RawGovernanceConfig<'built-in'> = {
  oas3_0Diff: oas3Diff,
  oas3_1Diff: oas3Diff,
  oas3_2Diff: oas3Diff,
  async3Diff,
};

export default diffRecommended;
