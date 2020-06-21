import { RuleSet } from '../validate';
import { LintConfig } from './config';
import { notUndefined } from '../utils';

export function initRules<T extends Function, P extends RuleSet<T>>(
  rules: P[],
  config: LintConfig,
  transformersOnly: boolean = false,
) {
  return rules.flatMap((ruleset) =>
      // TODO: validate rules from config have corresponding rule defined for specific OAS version
      Object.keys(ruleset).map((ruleId) => {
        const rule = ruleset[ruleId];

        const transformerSettings = config.getTransformerSettings(ruleId);
        const ruleSettings = transformersOnly
          ? transformerSettings
          : config.getRuleSettings(ruleId) || transformerSettings;

        if (ruleSettings.severity === 'off') {
          return undefined;
        }

        const visitor = rule(ruleSettings.options);

        return {
          severity: ruleSettings.severity,
          ruleId,
          visitor,
        };
      }),
    )
    .filter(notUndefined);
}
