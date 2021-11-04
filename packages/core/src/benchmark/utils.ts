import { parseYaml } from '../js-yaml';
import { Document, Source } from '../resolve';
import { Oas3RuleSet } from '../oas-types';
import { RuleConfig, LintConfig, Plugin } from '../config/config';

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

  return new LintConfig({
    plugins: [
      {
        ...plugin,
        id: ruleId,
        rules: { oas3: rules },
      },
    ],
    extends: [],
    rules: rulesConf,
  });
}
