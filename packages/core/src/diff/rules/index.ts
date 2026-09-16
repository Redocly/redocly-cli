import type { Impact } from '../types.js';
import { async3Rules } from './async3.js';
import { oas3Rules } from './oas3.js';

export { async3Rules, oas3Rules };

export type DiffRuleId = keyof typeof oas3Rules | keyof typeof async3Rules;

export const diffRuleIds: string[] = [
  ...new Set([...Object.keys(oas3Rules), ...Object.keys(async3Rules)]),
];

export type DiffRuleMap = Partial<Record<DiffRuleId, Impact | 'off'>>;

/** The built-in preset: every rule is a major, which is what "breaking" meant. */
export const recommendedDiffRules: Record<DiffRuleId, Impact | 'off'> = {
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
