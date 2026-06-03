import path from 'node:path';
import { pathToFileURL } from 'node:url';

import type { RulePlugin } from '../types/index.js';
import { OwaspApiTop10Rule } from './builtins/owasp.js';
import { SchemaConsistencyRule } from './builtins/schema.js';
import { SecurityRule } from './builtins/security.js';
import { UndocumentedEndpointRule } from './builtins/undocumented-endpoint.js';

const BUILTIN_RULE_FACTORIES: Record<string, () => RulePlugin> = {
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

function normalizeRuleExport(value: unknown): RulePlugin[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value as RulePlugin[];
  }

  return [value as RulePlugin];
}

export async function loadRulePlugins(
  activeRuleIds: string[] | undefined,
  pluginModules: string[]
): Promise<RulePlugin[]> {
  const selectedRuleIds =
    activeRuleIds && activeRuleIds.length > 0 ? activeRuleIds : DEFAULT_BUILTIN_RULE_IDS;

  const builtins: RulePlugin[] = selectedRuleIds.map((ruleId) => {
    const factory = BUILTIN_RULE_FACTORIES[ruleId];
    if (!factory) {
      throw new Error(`Unknown builtin rule id: ${ruleId}`);
    }

    return factory();
  });

  const externalPlugins: RulePlugin[] = [];
  for (const modulePath of pluginModules) {
    const absolutePath = path.resolve(process.cwd(), modulePath);
    const moduleUrl = pathToFileURL(absolutePath).toString();
    const loadedModule = await import(moduleUrl);
    const exportedRules = normalizeRuleExport(
      loadedModule.default ?? loadedModule.rules ?? loadedModule.rule
    );

    if (exportedRules.length === 0) {
      throw new Error(`Plugin module "${modulePath}" does not export a rule plugin`);
    }

    externalPlugins.push(...exportedRules);
  }

  const allRules = [...builtins, ...externalPlugins];
  for (const plugin of allRules) {
    if (!plugin || typeof plugin.id !== 'string' || typeof plugin.analyze !== 'function') {
      throw new Error('Invalid rule plugin. Expected shape: { id: string, analyze: function }.');
    }
  }

  return allRules;
}
