import { readFileSync } from 'node:fs';

import { variantByPluginId } from './expected-plugins.mjs';

const report = JSON.parse(readFileSync(new URL('./lint-report.json', import.meta.url), 'utf-8'));
const reportedRuleIds = new Set(report.problems.map((problem) => problem.ruleId));
const missing = Object.keys(variantByPluginId).filter(
  (pluginId) => !reportedRuleIds.has(`${pluginId}/marker`)
);

if (missing.length) {
  const details = missing
    .map((pluginId) => `  - ${pluginId}: ${variantByPluginId[pluginId]}`)
    .join('\n');
  console.error(`These plugin variants did not run their rule:\n${details}`);
  process.exit(1);
}

console.log(`✅ All ${Object.keys(variantByPluginId).length} plugin variants ran their rule.`);
