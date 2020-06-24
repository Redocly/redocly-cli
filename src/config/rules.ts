import { RuleSet } from '../validate';
import { LintConfig } from './config';
import { notUndefined } from '../utils';

export function initRules<T extends Function, P extends RuleSet<T>>(
  rules: P[],
  config: LintConfig,
  transformers: boolean = false,
) {
  return rules
    .flatMap((ruleset) =>
      // TODO: validate rules from config have corresponding rule defined for specific Oas version
      Object.keys(ruleset).map((ruleId) => {
        const rule = ruleset[ruleId];

        const transformerSettings = config.getTransformerSettings(ruleId);
        const ruleSetting = config.getRuleSettings(ruleId);
        const ruleSettings = transformers ? transformerSettings : ruleSetting;

        if (ruleSettings.severity === 'off') {
          return undefined;
        }

        const visitor = rule(ruleSettings);

        return {
          severity: ruleSettings.severity,
          ruleId,
          visitor,
        };
      }),
    )
    .filter(notUndefined);
}
