import { runRules, type RunnerOptions } from '../../../core/runner.js';
import type { NormalizedRule } from '../../../types/index.js';

/**
 * Runs one rule with no `message` set, so tests use the rule's default message.
 * Markdoc is off unless `runnerOptions` turns it on.
 */
export const tokenRuleHarness = (
  ruleName: string,
  options: Record<string, unknown> = {},
  runnerOptions: Omit<RunnerOptions, 'fix'> = {}
) => {
  const config: NormalizedRule = {
    name: `recheck/${ruleName}`,
    shortName: ruleName,
    severity: 'error',
    assertions: { [ruleName]: options },
  };
  return {
    lint: async (md: string) =>
      (await runRules([{ path: 't.md', content: md }], [config], runnerOptions)).problems,
    fix: async (md: string) =>
      (
        await runRules([{ path: 't.md', content: md }], [config], {
          ...runnerOptions,
          fix: true,
        })
      ).fixedFiles.get('t.md') ?? md,
  };
};
