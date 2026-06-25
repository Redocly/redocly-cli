import {
  CORE_SCHEMA,
  mergeTag,
  binaryTag,
  omapTag,
  pairsTag,
  setTag,
  loadAll,
  dump,
  YAMLException,
  type LoadOptions,
  type DumpOptions,
} from 'js-yaml';

const DEFAULT_SCHEMA_WITHOUT_TIMESTAMP = CORE_SCHEMA.withTags(
  mergeTag,
  binaryTag,
  omapTag,
  pairsTag,
  setTag
);

export const parseYaml = (str: string, opts?: LoadOptions): unknown => {
  const documents = loadAll(str, { schema: DEFAULT_SCHEMA_WITHOUT_TIMESTAMP, ...opts });
  if (documents.length === 0) {
    return str.trim() === '' ? undefined : null;
  }
  if (documents.length > 1) {
    throw new YAMLException('expected a single document in the stream, but found more');
  }
  return documents[0];
};

export const stringifyYaml = (obj: any, opts?: DumpOptions): string => dump(obj, opts);
