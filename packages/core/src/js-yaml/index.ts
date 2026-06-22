import jsYaml, {
  DEFAULT_SCHEMA,
  JSON_SCHEMA,
  Type,
  load,
  dump,
  type LoadOptions,
  type DumpOptions,
} from 'js-yaml';

// `types` (the built-in tag instances) is not declared in @types/js-yaml.
// TODO: add a type for "types" https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/types/js-yaml/index.d.ts
const types = (jsYaml as unknown as { types: Record<string, Type> }).types;

const DEFAULT_SCHEMA_WITHOUT_TIMESTAMP = JSON_SCHEMA.extend({
  implicit: [types.merge],
  explicit: [types.binary, types.omap, types.pairs, types.set],
});

// TODO: remove this after js-yaml update.
// js-yaml >=4.2.0 stopped resolving numbers with underscores (e.g. `12_34`, `1_000`, `0x1_2`,
// `1_2.3`) as numeric scalars (https://github.com/nodeca/js-yaml/issues/627). As a side effect
// the dumper no longer quotes strings that look like such numbers, so YAML 1.1 parsers read
// them back as numbers, losing type information.
// This implicit type matches those underscore-number-like strings so the dumper quotes them; it
// is only used to influence quoting and never constructs or represents a value.
const underscoreNumberLike = new Type('tag:redocly.com,2026:underscore-number', {
  kind: 'scalar',
  resolve: (data: unknown): boolean => {
    if (typeof data !== 'string' || !data.includes('_')) return false;
    const stripped = data.replace(/_/g, '');
    return types.int.resolve(stripped) || types.float.resolve(stripped);
  },
  predicate: (): boolean => false,
});

// Extend js-yaml's default dump schema (the one `dump` uses when no schema is given) so the
// only added behavior is quoting underscore-number-like strings; everything else, including
// quoting of date-like strings via the timestamp type, is preserved.
const DUMP_SCHEMA = DEFAULT_SCHEMA.extend({ implicit: [underscoreNumberLike] });

export const parseYaml = (str: string, opts?: LoadOptions): unknown =>
  load(str, { schema: DEFAULT_SCHEMA_WITHOUT_TIMESTAMP, ...opts });

export const stringifyYaml = (obj: any, opts?: DumpOptions): string =>
  dump(obj, { schema: DUMP_SCHEMA, ...opts });
