import { RuleSet, OasVersion } from '../oas-types';
import { LintConfig } from './config';
import { notUndefined } from '../utils';

export function initRules<T extends Function, P extends RuleSet<T>>(
  rules: P[],
  config: LintConfig,
  type: 'rules' | 'preprocessors' | 'decorators',
  oasVersion: OasVersion,
) {
  return rules
    .flatMap((ruleset) =>
      Object.keys(ruleset).map((ruleId) => {
        const rule = ruleset[ruleId];

        const ruleSettings =
          type === 'rules'
            ? config.getRuleSettings(ruleId, oasVersion)
            : type === 'preprocessors'
            ? config.getPreprocessorSettings(ruleId, oasVersion)
            : config.getDecoratorSettings(ruleId, oasVersion);

        if (ruleSettings.severity === 'off') {
          return undefined;
        }

        const visitors = rule(ruleSettings);

        if (Array.isArray(visitors)) {
          return visitors.map((visitor: any) => ({
            severity: ruleSettings.severity,
            ruleId,
            visitor: visitor,
          }))
        }

        return {
          severity: ruleSettings.severity,
          ruleId,
          visitor: visitors, // note: actually it is only one visitor object
        };
      }),
    )
    .flatMap(visitor => visitor)
    .filter(notUndefined);
}
