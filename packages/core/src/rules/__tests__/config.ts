import { LintConfig, RuleConfig } from "../../config/config";
import { defaultPlugin } from '../../config/builtIn';

export function makeConfig(rules: Record<string, RuleConfig>) {
  return new LintConfig({
    plugins: [defaultPlugin],
    extends: [],
    rules
  });
}