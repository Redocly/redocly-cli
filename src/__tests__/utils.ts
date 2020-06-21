import * as yaml from 'js-yaml';
import * as path from 'path';

import { Document, Source } from '../resolve';
import { NormalizedReportMessage } from '../walk';
import { RuleConfig, LintConfig, RawLintConfig } from '../config/config';
import { OAS3RuleSet } from '../validate';

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

export function makeConfigForRuleset(rules: OAS3RuleSet, config?: RawLintConfig, configFile?: string) {
  const rulesConf: Record<string, RuleConfig> = {};
  const ruleId = 'test';
  Object.keys(rules).forEach((name) => {
    rulesConf[`${ruleId}/${name}`] = 'error';
  });

  return new LintConfig({
    plugins: [
      {
        id: ruleId,
        rules: { oas3: rules },
      },
    ],
    extends: [],
    rules: rulesConf,
    ...config
  }, configFile);
}
