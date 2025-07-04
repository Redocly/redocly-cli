// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore broken types for js-yaml
import { JSON_SCHEMA, types, load } from 'js-yaml';
import { readFileSync } from 'fs';

import type { LoadOptions } from 'js-yaml';

const DEFAULT_SCHEMA_WITHOUT_TIMESTAMP = JSON_SCHEMA.extend({
  implicit: [types.merge],
  explicit: [types.binary, types.omap, types.pairs, types.set],
});

export function parseYaml(str: string, opts?: LoadOptions): unknown {
  return load(str, { schema: DEFAULT_SCHEMA_WITHOUT_TIMESTAMP, ...opts });
}

export function readYaml(path: string): unknown {
  return parseYaml(readFileSync(path, 'utf-8'));
}
