// Recheck's own YAML-serializable Markdoc schema format, deliberately not
// Markdoc's own `Config['tags']` shape: class-typed attributes and `validate()`
// functions cannot round-trip through a user's recheck.yaml or be diffed and
// committed as plain data. This module holds the types, the resolver that turns
// the boolean or object config form into `{ enabled, schema }`, and the one
// place that reads a schema back out for the pairing pass. Converting a real
// Markdoc `Config['tags']` map into this format happens elsewhere, in
// `scripts/generate-markdoc-schema.mjs`, which produces the committed
// `src/data/markdoc-realm-schema.ts` re-exported below.
import { MARKDOC_REALM_SCHEMA } from '../../data/markdoc-realm-schema.js';
import { isPlainObject } from '../../utils/is-plain-object.js';

/**
 * One attribute's statically-checkable facets. `type` is limited to the three
 * JSON primitives recheck can compare a parsed literal against; anything richer
 * upstream (objects, arrays, union types, custom attribute classes) has no
 * faithful representative here and gets `dynamic: true` instead.
 */
export interface MarkdocAttributeSchema {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: string | number | boolean;
  /** Markdoc's `matches` array, renamed for recheck's own vocabulary. */
  enum?: readonly string[];
  /**
   * Set when the upstream attribute's type isn't one of the three JSON
   * primitives, or when the tag's schema carries a `validate()` function.
   * Recheck's value-shape checks (type and enum) skip such an attribute rather
   * than guess at business logic they cannot run. `required` is deliberately not
   * skipped: upstream enforces it purely by presence, independently of `type`,
   * `matches`, and `validate()`, even for a custom-class-typed attribute, so
   * `markdoc-attributes` checks it unconditionally. The attribute's name is known
   * either way, so unknown-attribute checks are unaffected.
   */
  dynamic?: boolean;
}

export interface MarkdocTagSchema {
  selfClosing?: boolean;
  attributes?: Record<string, MarkdocAttributeSchema>;
}

export interface MarkdocSchema {
  tags: Record<string, MarkdocTagSchema>;
}

/**
 * The object form of the `markdoc` config key. `schema` is required here: the
 * boolean shorthand `true` unambiguously means `{ schema: 'realm' }`, but an
 * object with `schema` omitted has no default this format defines, so
 * `config/schema.ts` rejects it rather than guessing.
 */
export interface MarkdocUserConfig {
  schema: 'realm' | false;
  // `tagsFile` names a YAML file of tag-name -> tag schema, resolved and
  // shape-checked by the config loader (config/validate.ts) rather than here:
  // this module has no filesystem access, so it only ever sees the file's
  // tags already loaded, via `resolveMarkdocConfig`'s `resolvedExtend`
  // parameter below. At least one of `tags`/`tagsFile` is required, enforced
  // by config/schema.ts's AJV shape.
  extend?: { tags?: Record<string, MarkdocTagSchema>; tagsFile?: string };
}

/**
 * The already-loaded view of `extend` that `config/validate.ts` builds after
 * reading and shape-checking `tagsFile` (if any): `fileTags` is that file's
 * tags, `tags` is the config's own inline `extend.tags`. Kept as two separate
 * fields, not pre-merged, so `mergeExtend` alone owns the precedence order.
 */
export interface ResolvedExtend {
  fileTags?: Record<string, MarkdocTagSchema>;
  tags?: Record<string, MarkdocTagSchema>;
}

/**
 * Merges a user's tags over a base schema's tags, in precedence order
 * base -> file -> inline: inline `extend.tags` wins a collision with a
 * `tagsFile` entry, which in turn wins over a built-in tag, since the more
 * specific/local a source is, the more likely a project meant it to override.
 * A name collision replaces the whole tag rather than deep-merging attribute
 * by attribute, which matches how Markdoc's own `mergeConfig` composes its
 * built-in tags with a project's: a tag definition is an atomic unit there,
 * and `extend` follows the same rule rather than inventing a different merge
 * granularity.
 */
function mergeExtend(base: MarkdocSchema, extend: ResolvedExtend | undefined): MarkdocSchema {
  if (!extend) return base;
  const { fileTags, tags } = extend;
  const hasFileTags = fileTags && Object.keys(fileTags).length > 0;
  const hasTags = tags && Object.keys(tags).length > 0;
  if (!hasFileTags && !hasTags) return base;
  return { tags: { ...base.tags, ...fileTags, ...tags } };
}

/**
 * Normalizes the raw `markdoc` config value (boolean shorthand or object form)
 * into `{ enabled, schema }`. It is called from `config/validate.ts` after AJV
 * structural validation, but the check order there means it still sees the raw
 * value when validation failed, so it must never throw on a malformed shape
 * (`{ schema: 'bogus' }`, a bare string): anything unrecognized normalizes to
 * disabled.
 *
 * `schema: false` deliberately is not "fully off". Parsing and pairing still
 * run, and only the schema-dependent rules (unknown tag, and the
 * unknown/required/enum attribute checks) go inert for lack of anything to check
 * against. `extend` alongside `schema: false` is accepted structurally but has
 * no effect, since there is no base to merge over.
 *
 * `resolvedExtend`, when passed, is the caller's already-loaded view of
 * `extend` (`tagsFile` read and shape-checked, see config/validate.ts) and
 * takes over from `raw.extend` entirely -- this module never reads a
 * `tagsFile` itself, so a caller that resolved one has strictly more
 * information than `raw.extend` alone.
 */
export function resolveMarkdocConfig(
  raw: boolean | MarkdocUserConfig | undefined,
  resolvedExtend?: ResolvedExtend
): {
  enabled: boolean;
  schema: MarkdocSchema | null;
} {
  if (raw === true) {
    return { enabled: true, schema: MARKDOC_REALM_SCHEMA };
  }
  if (isPlainObject<MarkdocUserConfig>(raw)) {
    if (raw.schema === false) {
      return { enabled: true, schema: null };
    }
    if (raw.schema === 'realm') {
      return {
        enabled: true,
        schema: mergeExtend(MARKDOC_REALM_SCHEMA, resolvedExtend ?? raw.extend),
      };
    }
    // Malformed object (e.g. `schema: 'bogus'`). AJV already reports this as a
    // structural error, so defensively disable rather than throw.
    return { enabled: false, schema: null };
  }
  // `undefined`, `false`, or any invalid non-boolean/non-object value.
  return { enabled: false, schema: null };
}

/**
 * Tag names a schema declares self-closing, in the plain `Set<string>` shape
 * `pairing.ts` consumes so the pairing pass depends on none of this module's
 * types.
 */
export function selfClosingTagNames(schema: MarkdocSchema): ReadonlySet<string> {
  const names = new Set<string>();
  for (const [name, tag] of Object.entries(schema.tags)) {
    if (tag.selfClosing) names.add(name);
  }
  return names;
}
