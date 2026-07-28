import type { TrafficRule } from '../types/index.js';
import { OwaspApiTop10Rule } from './builtins/owasp.js';
import { SchemaConsistencyRule } from './builtins/schema.js';
import { SecurityRule } from './builtins/security.js';
import { UndocumentedEndpointRule } from './builtins/undocumented-endpoint.js';

const BUILTIN_RULE_FACTORIES: Record<string, () => TrafficRule> = {
  'undocumented-endpoint': () => new UndocumentedEndpointRule(),
  'schema-consistency': () => new SchemaConsistencyRule(),
  'security-baseline': () => new SecurityRule(),
  'owasp-api-top10': () => new OwaspApiTop10Rule(),
};

export const BUILTIN_RULE_IDS = Object.keys(BUILTIN_RULE_FACTORIES);
const DEFAULT_BUILTIN_RULE_IDS = [
  'undocumented-endpoint',
  'schema-consistency',
  'security-baseline',
];

export function loadRules(activeRuleIds: string[] | undefined): TrafficRule[] {
  if (!activeRuleIds || activeRuleIds.length === 0) {
    return DEFAULT_BUILTIN_RULE_IDS.map((ruleId) => BUILTIN_RULE_FACTORIES[ruleId]());
  }

  return [...new Set(activeRuleIds)].map((ruleId) => {
    const factory = BUILTIN_RULE_FACTORIES[ruleId];
    if (!factory) {
      throw new Error(
        `Unknown rule id: "${ruleId}". Available rules: ${BUILTIN_RULE_IDS.join(', ')}`
      );
    }
    return factory();
  });
}
