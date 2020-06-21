import * as yaml from 'js-yaml';
import * as path from 'path';

import { Document, Source } from '../resolve';
import { NormalizedReportMessage } from '../walk';
import { RuleConfig, LintConfig, Plugin } from '../config/config';
import { Oas3RuleSet } from '../validate';

export function parseYamlToDocument(body: string, absoluteRef: string = ''): Document {
  return {
    source: new Source(absoluteRef, body),
    parsed: yaml.safeLoad(body, { filename: absoluteRef }),
  };
}

export function replaceSourceWithRef(results: NormalizedReportMessage[], cwd?: string) {
  return results.map((r) => {
    return {
      ...r,
      location: r.location.map((l) => ({
        ...l,
        source: cwd ? path.relative(cwd, l.source.absoluteRef) : l.source.absoluteRef,
      })),
    };
  });
}

export const yamlSerializer = {
  test: () => {
    return true;
  },
  print: (val: any) => {
    return yaml.safeDump(val);
  },
};

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
