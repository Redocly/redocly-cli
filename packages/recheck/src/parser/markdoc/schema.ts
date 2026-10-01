// Recheck's own Markdoc schema format. It is plain data that can be written in
// YAML, unlike Markdoc's `Config['tags']`, which can hold classes and functions.
// This file has the types and the code that turns the `markdoc` config value into
// `{ enabled, schema }`.
import { MARKDOC_REALM_SCHEMA } from '../../data/markdoc-realm-schema.js';
import { isPlainObject } from '../../utils/is-plain-object.js';

/** What recheck can check statically about one attribute. */
export interface MarkdocAttributeSchema {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: string | number | boolean;
  /** Markdoc's `matches` array. */
  enum?: readonly string[];
  /**
   * Set when the attribute's type is not a string, number or boolean, or when the
   * tag has a `validate()` function. The type and enum checks skip these attributes.
   * The `required` and unknown-attribute checks still apply.
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
 * The object form of the `markdoc` config key. `schema` is required; `true` means `{ schema:
 * 'realm' }`.
 */
export interface MarkdocUserConfig {
  schema: 'realm' | false;
  // `tagsFile` is a YAML file of tag schemas. The config loader reads it and passes
  // the result as `resolvedExtend`. At least one of `tags` or `tagsFile` is required.
  extend?: { tags?: Record<string, MarkdocTagSchema>; tagsFile?: string };
}

/**
 * `extend` after `tagsFile` has been read: `fileTags` come from the file, `tags` are the inline
 * ones.
 */
export interface ResolvedExtend {
  fileTags?: Record<string, MarkdocTagSchema>;
  tags?: Record<string, MarkdocTagSchema>;
}

/**
 * Adds the user's tags to the base schema. Inline tags win over `tagsFile` tags,
 * which win over built-in tags. A tag with the same name replaces the whole tag,
 * like Markdoc's own `mergeConfig`.
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
 * Turns the raw `markdoc` config value into `{ enabled, schema }`. It does not
 * throw on an invalid value; it returns disabled instead.
 *
 * `schema: false` still parses and pairs tags. Only the rules that need a schema
 * (unknown tag and attribute checks) have nothing to check. `extend` is ignored then.
 *
 * `resolvedExtend`, when given, is used instead of `raw.extend`.
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
    // Invalid object, such as `schema: 'bogus'`. Config validation reports it.
    return { enabled: false, schema: null };
  }
  // `undefined`, `false` or any other invalid value.
  return { enabled: false, schema: null };
}

/** Names of the tags that the schema marks as self-closing. */
export function selfClosingTagNames(schema: MarkdocSchema): ReadonlySet<string> {
  const names = new Set<string>();
  for (const [name, tag] of Object.entries(schema.tags)) {
    if (tag.selfClosing) names.add(name);
  }
  return names;
}
