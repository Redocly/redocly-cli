// @ts-ignore
import { JSON_SCHEMA, types, LoadOptions, DumpOptions, load, dump  } from 'js-yaml';

const DEFAULT_SCHEMA_WITHOUT_TIMESTAMP = JSON_SCHEMA.extend({
  implicit: [types.merge],
  explicit: [
    types.binary,
    types.omap,
    types.pairs,
    types.set,
  ],
});

export const convertYamlToJson = (str: string, opts?: LoadOptions): unknown =>
  load(str, {schema: DEFAULT_SCHEMA_WITHOUT_TIMESTAMP, ...opts});

export const convertJsonToYaml = (obj: any, opts?: DumpOptions): string =>
  dump(obj, {schema: DEFAULT_SCHEMA_WITHOUT_TIMESTAMP, ...opts});
