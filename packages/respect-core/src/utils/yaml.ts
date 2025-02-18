// TODO: add a type for "types" https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/js-yaml/index.d.ts
// @ts-ignore

import { JSON_SCHEMA, types, load, dump } from 'js-yaml';
import { readFileSync } from 'fs';

import type { LoadOptions, DumpOptions } from 'js-yaml';

const DEFAULT_SCHEMA_WITHOUT_TIMESTAMP = JSON_SCHEMA.extend({
  implicit: [types.merge],
  explicit: [types.binary, types.omap, types.pairs, types.set],
});

export function parseYaml(str: string, opts?: LoadOptions): unknown {
  return load(str, { schema: DEFAULT_SCHEMA_WITHOUT_TIMESTAMP, ...opts });
}

export function stringifyYaml(obj: any, opts?: DumpOptions): string {
  return dump(obj, opts);
}

export function readYaml(path: string): unknown {
  return parseYaml(readFileSync(path, 'utf-8'));
}
