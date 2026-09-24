import * as path from 'path';

import {
  type Change,
  type Document,
  type JudgedChange,
  Source,
  type NormalizedProblem,
  parseYaml,
  stringifyYaml,
} from '../src/index.js';

export function parseYamlToDocument(body: string, absoluteRef: string = ''): Document {
  return {
    source: new Source(absoluteRef, body),
    parsed: parseYaml(body, { filename: absoluteRef }),
  };
}

export function replaceSourceWithRefInChanges(changes: Array<Change | JudgedChange>) {
  return changes.map(({ node: _node, ...change }) => {
    const mapped: Record<string, unknown> = { ...change };

    if ('base' in change) {
      mapped.base = { ...change.base, location: change.base.location.absolutePointer };
    }

    if ('revision' in change) {
      mapped.revision = { ...change.revision, location: change.revision.location.absolutePointer };
    }

    if ('verdicts' in change) {
      mapped.verdicts = change.verdicts.map((verdict) => ({
        ...verdict,
        location: verdict.location.absolutePointer,
      }));
    }

    return mapped;
  });
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
