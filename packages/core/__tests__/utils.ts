import * as path from 'path';

import { Document, Source, NormalizedProblem, parseYaml, stringifyYaml } from '../src';
import { RuleConfig, LintConfig, Plugin } from '../src/config/config';
import { Oas3RuleSet } from '../src/oas-types';

export function parseYamlToDocument(body: string, absoluteRef: string = ''): Document {
  return {
    source: new Source(absoluteRef, body),
    parsed: parseYaml(body, { filename: absoluteRef }),
  };
}

export function replaceSourceWithRef(results: NormalizedProblem[], cwd?: string) {
  const cwdRegexp = cwd ? new RegExp(cwd + path.sep, 'g') : /$^/;
  return results.map((r) => {
    const mapped = {
      ...r,
      message: r.message.replace(cwdRegexp, ''),
      location: r.location.map((l) => ({
        ...l,
        source: cwd ? path.relative(cwd, l.source.absoluteRef) : l.source.absoluteRef,
      })),
    };
    if (mapped.from) {
      mapped.from = {
        ...mapped.from,
        source: cwd
          ? path.relative(cwd, mapped.from.source.absoluteRef)
          : (mapped.from.source.absoluteRef as any),
      };
    }
    return mapped;
  });
}

export const yamlSerializer = {
  test: () => {
    return true;
  },
  print: (val: any) => {
    return stringifyYaml(val);
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
