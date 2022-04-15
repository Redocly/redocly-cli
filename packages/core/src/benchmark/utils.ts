import { parseYaml } from '../js-yaml';
import { Document, Source } from '../resolve';
import { Oas3RuleSet } from '../oas-types';
import { LintConfig, mergeExtends, resolvePlugins, transformLint } from '../config';

import type { RuleConfig, Plugin, TransformLintConfig, ResolvedLintConfig } from '../config/types';
import recommended from '../config/recommended';


export function parseYamlToDocument(body: string, absoluteRef: string = ''): Document {
  return {
    source: new Source(absoluteRef, body),
    parsed: parseYaml(body, { filename: absoluteRef }),
  };
}

export function makeConfigForRuleset(rules: Oas3RuleSet, plugin?: Partial<Plugin>) {
  const rulesConf: Record<string, RuleConfig> = {};
  const ruleId = 'test';
  Object.keys(rules).forEach((name) => {
    rulesConf[`${ruleId}/${name}`] = 'error';
  });
  const extendConfigs = [recommended, resolvePlugins([
    {
      ...plugin,
      id: ruleId,
      rules: { oas3: rules },
    },
  ]) as ResolvedLintConfig];
  if (rules) {
    extendConfigs.push({rules})
  }
  const lint = transformLint(mergeExtends(extendConfigs));

  return new LintConfig(lint as TransformLintConfig);
}
