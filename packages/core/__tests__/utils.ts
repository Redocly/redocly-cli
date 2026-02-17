import * as path from 'path';

import { type Document, Source, type NormalizedProblem, parseYaml, stringifyYaml } from '../src/index.js';

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
