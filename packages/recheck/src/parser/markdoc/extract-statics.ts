// The single implementation of "a real Markdoc tag map -> recheck's
// statics-only MarkdocSchema". Two callers share it and must never define
// "what counts as a static facet" two different ways:
//   - `scripts/generate-markdoc-schema.mjs`, which resolves Realm's composed
//     built-in schema (markdoc + portal + theme) for the committed
//     `src/data/markdoc-realm-schema.ts`, and re-exports these functions
//     unchanged so its own drift test keeps working.
//   - `src/actions/markdoc-schema.ts`, the `redocly recheck --generate-markdoc-schema`
//     command, which extracts statics from a project's own schema module(s).
//
// Lives under `src/` (not `scripts/`) so the built CLI can import it at
// runtime: `scripts/`'s own generator imports `@redocly/theme` and
// `@redocly/portal`, both devDependencies-only, and this module must stay
// free of any such import so requiring it from a published package never
// drags those in.
//
// Raw tag/attribute shapes are typed loosely here rather than imported from
// `@markdoc/markdoc` (also a devDependency-only): this module's declaration
// file ships with the published package, and a type-only import still leaves
// a reference downstream consumers' own type-checking would need
// `@markdoc/markdoc` installed to resolve.

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

// The three attribute-type constructors recheck's own format can represent
// (see MarkdocAttributeSchema's doc comment in ./schema.ts). Every other
// upstream type -- `Object`, `Array`, a union like `[String, Number]`, a
// custom class implementing `CustomAttributeTypeInterface` (`RelativePath`,
// `PartialFile`, ...), or no `type` at all (`debug`'s bare `{ value: {} }`) --
// has no faithful single-primitive representative, so it's recorded
// `dynamic: true` instead of guessing.
const PRIMITIVE_TYPE_NAMES = new Map<unknown, MarkdocAttributeSchema['type']>([
  [String, 'string'],
  [Number, 'number'],
  [Boolean, 'boolean'],
]);

/**
 * Converts one raw Markdoc attribute definition into recheck's
 * `MarkdocAttributeSchema`.
 *
 * `tagHasValidate` forces `dynamic: true` regardless of this attribute's own
 * type. A tag-level `validate()` -- for example `img`'s src/srcSet/images
 * mutual-exclusivity check, `code-snippet`'s from/after and to/before checks,
 * or `diagram`'s type/align re-checks -- can read and reject any of the tag's
 * attributes for reasons this generator can't discover from the schema object
 * alone, since that would mean analyzing an arbitrary JS function body. So
 * every attribute of a `validate()`-carrying tag is conservatively marked
 * dynamic, even one with a plain `String`/`Number`/`Boolean` type and a
 * `matches` array (`img.align`, `diagram.type`).
 *
 * Recorded facets (`required`, `default`, `enum`) are kept even when dynamic:
 * `dynamic` only tells a value-checking rule to skip them, it doesn't make the
 * facet itself unknown.
 */
export function extractAttribute(
  rawAttribute: RawMarkdocAttribute,
  tagHasValidate: boolean
): MarkdocAttributeSchema {
  const rawType = rawAttribute.type;
  const primitiveName =
    typeof rawType === 'function' ? PRIMITIVE_TYPE_NAMES.get(rawType) : undefined;
  // `type` is non-optional in MarkdocAttributeSchema, and 'string' is the
  // placeholder for anything non-primitive. It's a faithful placeholder
  // rather than an arbitrary one: every custom attribute type in
  // packages/theme (RelativePath, PartialFile, CodeSnippetFile, ...)
  // implements `validate(value: string)`, so the wire value is always a
  // string even when the class does extra work with it. A dynamic attribute
  // is never value-checked anyway -- only the presence of `type` satisfies
  // the interface.
  const out: MarkdocAttributeSchema = { type: primitiveName ?? 'string' };

  if (rawAttribute.required === true) out.required = true;
  // `MarkdocAttributeSchema.default` can only hold a JSON primitive, and some
  // defaults aren't one: `connect-mcp`'s `options` attribute defaults to an
  // array (`['cursor', 'vscode', 'copy']`), which the interface has no slot
  // for. Recording it would produce a schema that doesn't type-check against
  // its own interface, so drop it rather than guess a representation.
  // Nothing is lost: a non-primitive default always pairs with a
  // non-primitive `type`, so the attribute is already `dynamic: true` and no
  // value check reads its default.
  const defaultType = typeof rawAttribute.default;
  if (defaultType === 'string' || defaultType === 'number' || defaultType === 'boolean') {
    out.default = rawAttribute.default as string | number | boolean;
  }
  // Markdoc's `matches` isn't always an array -- it can also be a RegExp or a
  // predicate function -- and even when it is an array, its entries aren't
  // guaranteed to be strings. `MarkdocAttributeSchema.enum` is
  // `readonly string[]`, so:
  //   - A non-array `matches` can't be represented as an enum at all, so it
  //     falls back to `dynamic: true` like a class-typed attribute or a
  //     `validate()`-carrying tag. Don't guess at a constraint this can't
  //     statically resolve.
  //   - An array `matches` with non-string entries is representable, just not
  //     verbatim, so coerce it with `String(...)` rather than marking it
  //     dynamic. The enum value check compares a parsed attribute literal's
  //     source text against the declared enum -- a string comparison either
  //     way -- so a coerced `'1'`/`'true'` is exactly what it needs.
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
 * Composes three raw Markdoc tag maps in caller-chosen precedence order
 * (later arguments win a name collision) and converts every tag to recheck's
 * statics-only `MarkdocSchema`. Both callers share this precedence-then-convert
 * shape: the built-in generator composes markdoc + portal + theme in Realm's
 * own override order; the `recheck --generate-markdoc-schema` action extracts one
 * project module's tags at a time and passes empty maps for the other two, so
 * the composition is a no-op and only that module's tags come out.
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
