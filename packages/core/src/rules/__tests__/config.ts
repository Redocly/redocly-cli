import { DecoratorConfig, LintConfig, RuleConfig } from '../../config/config';
import { defaultPlugin } from '../../config/builtIn';

export function makeConfig(rules: Record<string, RuleConfig>, decorators?:  Record<string, DecoratorConfig>) {
  return new LintConfig({
    plugins: [defaultPlugin],
    extends: [],
    rules,
    decorators,
  });
}
