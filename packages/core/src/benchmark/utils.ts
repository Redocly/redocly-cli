import { parseYaml } from '../js-yaml/index.js';
import { Source } from '../resolve.js';
import { StyleguideConfig, mergeExtends, resolvePlugins } from '../config/index.js';

import type { Document } from '../resolve.js';
import type { Oas3RuleSet } from '../oas-types.js';
import type { RuleConfig, Plugin, ResolvedStyleguideConfig } from '../config/types.js';

export function parseYamlToDocument(body: string, absoluteRef: string = ''): Document {
  return {
    source: new Source(absoluteRef, body),
    parsed: parseYaml(body, { filename: absoluteRef }),
  };
}

export async function makeConfigForRuleset(rules: Oas3RuleSet, plugin?: Partial<Plugin>) {
  const rulesConf: Record<string, RuleConfig> = {};
  const ruleId = 'test';
  Object.keys(rules).forEach((name) => {
    rulesConf[`${ruleId}/${name}`] = 'error';
  });
  const extendConfigs = [
    (await resolvePlugins([
      {
        ...plugin,
        id: ruleId,
        rules: { oas3: rules },
      },
    ])) as ResolvedStyleguideConfig,
  ];
  if (rules) {
    extendConfigs.push({ rules });
  }
  const styleguide = mergeExtends(extendConfigs);

  return new StyleguideConfig(styleguide);
}
