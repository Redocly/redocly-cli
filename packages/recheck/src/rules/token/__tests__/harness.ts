import { applyFixesToContent } from '../../../core/auto-fix.js';
import { runRules, type RunnerOptions } from '../../../core/runner.js';
import { parseMarkdown } from '../../../parser/index.js';
import type { Fix, NormalizedRule, Problem } from '../../../types/index.js';
import type { TokenRule } from '../../types.js';
import { formatTokenMessage } from '../messages.js';

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

/** Like `tokenRuleHarness`, but calls `TokenRule.check()` directly without the rule resolver. */
export function tokenRuleUnitHarness(rule: TokenRule, options: Record<string, unknown> = {}) {
  const build = (md: string) => {
    const tree = parseMarkdown(md);
    const lines = md.split('\n');
    const problems: Problem[] = [];
    const fixInfos: Omit<Fix, 'file' | 'ruleName'>[] = [];
    rule.check({
      tree,
      lines,
      filePath: 't.md',
      config: { ...rule.defaults, ...options },
      onError(info) {
        problems.push({
          file: 't.md',
          line: info.line,
          column: info.column ?? 1,
          text: lines[info.line - 1] ?? '',
          match: info.context ?? '',
          ruleName: rule.name,
          severity: 'error',
          message: formatTokenMessage(undefined, rule, info),
        });
        if (info.fixInfo) fixInfos.push(info.fixInfo);
      },
    });
    return { problems, fixInfos };
  };
  return {
    lint: (md: string) => build(md).problems,
    fix: (md: string) => {
      const { fixInfos } = build(md);
      const fixes: Fix[] = fixInfos.map((f) => ({ file: 't.md', ruleName: rule.name, ...f }));
      return applyFixesToContent(md, fixes).content;
    },
  };
}
