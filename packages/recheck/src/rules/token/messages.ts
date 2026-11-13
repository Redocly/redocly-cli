import type { TokenRule, TokenRuleOnErrorInfo } from '../types.js';

export function formatTemplate(template: string, ...values: string[]): string {
  let result = '';
  let rest = template;
  for (const value of values) {
    const index = rest.indexOf('%s');
    if (index === -1) break;
    result += rest.slice(0, index) + value;
    rest = rest.slice(index + 2);
  }
  return result + rest;
}

export function formatTokenMessage(
  configMessage: string | undefined,
  rule: TokenRule,
  info: TokenRuleOnErrorInfo
): string {
  const base = configMessage ?? String(rule.defaults.message ?? rule.name);
  const substituted = info.context ? formatTemplate(base, info.context) : base;
  return info.detail && !substituted.includes(info.detail)
    ? `${substituted} (${info.detail})`
    : substituted;
}
