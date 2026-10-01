// Turns a real Markdoc tag map into recheck's `MarkdocSchema`, keeping only what can
// be checked statically. Used by the generator for the built-in `realm` schema (in the
// Redocly monorepo) and by `src/actions/markdoc-schema.ts`.
//
// The raw types below are loose on purpose, so this file does not import
// `@markdoc/markdoc`, which is only a dev dependency.

import type { MarkdocAttributeSchema, MarkdocTagSchema, MarkdocSchema } from './schema.js';

/** Enough of a real Markdoc `Config['tags'][name]['attributes'][name]` entry to extract statics from. */
export interface RawMarkdocAttribute {
  type?: unknown;
  required?: boolean;
  default?: unknown;
  matches?: unknown;
}

/** Enough of a real Markdoc `Config['tags'][name]` entry to extract statics from. */
export interface RawMarkdocTag {
  selfClosing?: boolean;
  attributes?: Record<string, RawMarkdocAttribute>;
  validate?: unknown;
}

export type RawMarkdocTagMap = Record<string, RawMarkdocTag>;

// The attribute types recheck can represent. Any other type (`Object`, `Array`, a union,
// a custom class, or no type) is marked `dynamic: true`.
const PRIMITIVE_TYPE_NAMES = new Map<unknown, MarkdocAttributeSchema['type']>([
  [String, 'string'],
  [Number, 'number'],
  [Boolean, 'boolean'],
]);

/**
 * Converts one raw Markdoc attribute into a `MarkdocAttributeSchema`.
 *
 * If the tag has a `validate()` function (`tagHasValidate`), every attribute is marked
 * `dynamic`, because that function could reject any of them.
 */
export function extractAttribute(
  rawAttribute: RawMarkdocAttribute,
  tagHasValidate: boolean
): MarkdocAttributeSchema {
  const rawType = rawAttribute.type;
  const primitiveName =
    typeof rawType === 'function' ? PRIMITIVE_TYPE_NAMES.get(rawType) : undefined;
  // `type` is required, so use 'string' for anything that is not a primitive.
  // That is fine because dynamic attributes are never checked by type.
  const out: MarkdocAttributeSchema = { type: primitiveName ?? 'string' };

  if (rawAttribute.required === true) out.required = true;
  // `default` can only be a string, number or boolean, so other defaults (like an array)
  // are dropped. Those attributes are already `dynamic`.
  const defaultType = typeof rawAttribute.default;
  if (defaultType === 'string' || defaultType === 'number' || defaultType === 'boolean') {
    out.default = rawAttribute.default as string | number | boolean;
  }
  // `matches` can also be a RegExp or a function. Those become `dynamic`.
  // Array entries that are not strings are converted with `String(...)`, since the
  // enum check compares text.
  if (rawAttribute.matches !== undefined) {
    if (Array.isArray(rawAttribute.matches)) {
      if (rawAttribute.matches.length > 0) {
        out.enum = rawAttribute.matches.map((value) => String(value));
      }
    } else {
      out.dynamic = true;
    }
  }
  if (primitiveName === undefined || tagHasValidate) out.dynamic = true;

  return out;
}

/**
 * Merges three raw tag maps and converts them to a `MarkdocSchema`. Theme tags win
 * over portal tags, which win over Markdoc's built-in tags.
 */
export function extractStatics(
  themeTagMap: RawMarkdocTagMap,
  markdocBuiltinTags: RawMarkdocTagMap,
  portalBuiltInTagMap: RawMarkdocTagMap
): MarkdocSchema {
  const composed = { ...markdocBuiltinTags, ...portalBuiltInTagMap, ...themeTagMap };
  const tagNames = Object.keys(composed).sort();
  const tags: Record<string, MarkdocTagSchema> = {};

  for (const tagName of tagNames) {
    const rawSchema = composed[tagName];
    const tagHasValidate = typeof rawSchema.validate === 'function';
    const tagOut: MarkdocTagSchema = {};

    if (rawSchema.selfClosing === true) tagOut.selfClosing = true;

    const rawAttributes = rawSchema.attributes;
    if (rawAttributes) {
      const attributeNames = Object.keys(rawAttributes).sort();
      if (attributeNames.length > 0) {
        const attributesOut: Record<string, MarkdocAttributeSchema> = {};
        for (const attributeName of attributeNames) {
          attributesOut[attributeName] = extractAttribute(
            rawAttributes[attributeName],
            tagHasValidate
          );
        }
        tagOut.attributes = attributesOut;
      }
    }

    tags[tagName] = tagOut;
  }

  return { tags };
}
