import type { AnySchema } from '@redocly/ajv/dist/2020.js';

import { isPlainObject } from './is-plain-object.js';

// The keywords of a Schema Object that hold a schema or a list of schemas.
const SCHEMA_KEYWORDS = new Set([
  'items',
  'prefixItems',
  'contains',
  'additionalProperties',
  'unevaluatedItems',
  'unevaluatedProperties',
  'propertyNames',
  'allOf',
  'anyOf',
  'oneOf',
  'not',
  'if',
  'then',
  'else',
  'contentSchema',
]);

// The keywords of a Schema Object that hold a map of schemas.
const SCHEMA_MAP_KEYWORDS = new Set([
  'properties',
  'patternProperties',
  'dependentSchemas',
  '$defs',
  'definitions',
]);

// Ajv reports the undeclared properties of a schema under these keywords only when the schema is referenced.
const COMPOSITE_KEYWORDS = new Set(['anyOf', 'oneOf', 'not', 'if', 'contains', 'propertyNames']);

type MessageTarget = 'request' | 'response';

/**
 * Returns a schema of a dereferenced API description in the form that Ajv can compile and run.
 * A dereferenced description has a copy of the target in place of every `$ref`.
 *
 * - A recursive schema contains a copy of itself then, so it is moved to `$defs` and referenced.
 * - A discriminator variant with several values is moved to `$defs` and referenced too. Ajv writes
 *   the validation code of an inlined variant once per value, and the validation function becomes
 *   too large to run. A variant under a composite keyword stays inlined to keep the result the same.
 * - A discriminator without `oneOf` or `anyOf` is left out, because Ajv stops on it. OpenAPI allows
 *   it on the parent schema of the `allOf` form, and there it is not used for validation.
 * - Specification extensions are left out. Ajv does not use them, and a dereferenced extension can
 *   contain the schema itself.
 * - With a `target`, the properties that are not part of that message are left out of `required`:
 *   the `readOnly` ones for a request, and the `writeOnly` ones for a response.
 */
export function toAjvSchema(
  schema: AnySchema,
  { target }: { target?: MessageTarget } = {}
): AnySchema {
  const names = new Map<object, string>();
  const definitions: Record<string, unknown> = {};
  const ancestors: Record<string, unknown>[] = [];

  const getName = (target: object): string => {
    const name = names.get(target) ?? String(names.size);
    names.set(target, name);
    return name;
  };

  const convert = (node: unknown, isUnderComposite: boolean, isReferenced = false): unknown => {
    if (!isPlainObject(node)) {
      return node;
    }

    const ancestor = ancestors.find((candidate) => isCopy(candidate, node));
    if (ancestor) {
      return { $ref: `#/$defs/${getName(ancestor)}` };
    }

    const variantsKeyword = node.oneOf ? 'oneOf' : node.anyOf ? 'anyOf' : undefined;
    const tagName =
      isPlainObject(node.discriminator) && typeof node.discriminator.propertyName === 'string'
        ? node.discriminator.propertyName
        : undefined;
    const hadName = names.has(node);

    ancestors.push(node);
    const converted = Object.fromEntries(
      Object.entries(node)
        .filter(
          ([keyword]) =>
            !keyword.startsWith('x-') &&
            (keyword !== 'discriminator' || variantsKeyword !== undefined)
        )
        .map(([keyword, value]) => {
          // The variants of a discriminator are not compiled as a composite keyword.
          const isVariants = tagName !== undefined && keyword === variantsKeyword;
          const isComposite = isUnderComposite || (COMPOSITE_KEYWORDS.has(keyword) && !isVariants);
          const convertItem = (item: unknown) =>
            convert(
              item,
              isComposite,
              isVariants && !isComposite && hasSeveralValues(item, tagName)
            );

          if (SCHEMA_MAP_KEYWORDS.has(keyword) && isPlainObject(value)) {
            return [
              keyword,
              Object.fromEntries(
                Object.entries(value).map(([key, item]) => [key, convertItem(item)])
              ),
            ];
          }
          if (SCHEMA_KEYWORDS.has(keyword)) {
            return [keyword, Array.isArray(value) ? value.map(convertItem) : convertItem(value)];
          }
          return [keyword, value];
        })
    );
    ancestors.pop();

    // The flags are read from the dereferenced schema: a recursive property is only a `$ref` here.
    if (target && Array.isArray(node.required)) {
      converted.required = node.required.filter(
        (name) => typeof name !== 'string' || !isRequiredNameExcludedFromTarget(node, name, target)
      );
    }

    // The schema got a name when a copy of it was found below.
    const isRecursive = !hadName && names.has(node);
    if (!isReferenced && !isRecursive) {
      return converted;
    }
    const name = getName(node);
    definitions[name] = converted;
    return { $ref: `#/$defs/${name}` };
  };

  const converted = convert(schema, false);
  // A boolean schema has nothing to convert.
  if (!isPlainObject(converted)) {
    return schema;
  }
  if (names.size === 0) {
    return converted;
  }

  const ownDefinitions = isPlainObject(converted.$defs) ? converted.$defs : {};
  return { ...converted, $defs: { ...ownDefinitions, ...definitions } };
}

/**
 * A `readOnly` property is not part of a request, and a `writeOnly` property is not part of a
 * response. OpenAPI 3.0 often attaches the flag through `allOf: [{ $ref }, { readOnly: true }]`,
 * so the `allOf` branches count as well.
 */
export function isPropertyExcludedFromTarget(
  propertySchema: unknown,
  target: MessageTarget
): boolean {
  if (!isPlainObject(propertySchema)) {
    return false;
  }
  const flag = target === 'request' ? 'readOnly' : 'writeOnly';
  return (
    propertySchema[flag] === true ||
    (Array.isArray(propertySchema.allOf) &&
      propertySchema.allOf.some((branch) => isPlainObject(branch) && branch[flag] === true))
  );
}

// The property can be declared in the schema itself or in a branch of `allOf`, `oneOf` or `anyOf`.
function isRequiredNameExcludedFromTarget(
  schema: unknown,
  name: string,
  target: MessageTarget,
  seen = new WeakSet<object>()
): boolean {
  if (!isPlainObject(schema) || seen.has(schema)) {
    return false;
  }
  seen.add(schema);

  const properties = schema.properties;
  if (isPlainObject(properties) && isPropertyExcludedFromTarget(properties[name], target)) {
    return true;
  }

  return [schema.allOf, schema.oneOf, schema.anyOf].some(
    (branches) =>
      Array.isArray(branches) &&
      branches.some((branch) => isRequiredNameExcludedFromTarget(branch, name, target, seen))
  );
}

// Dereferencing replaces a `$ref` with a shallow copy of its target, so a copy holds the same values.
function isCopy(target: Record<string, unknown>, node: Record<string, unknown>): boolean {
  const keys = Object.keys(target);
  return keys.length === Object.keys(node).length && keys.every((key) => target[key] === node[key]);
}

// Ajv takes the values of a variant from its discriminator property, which can also be inside `allOf`.
function hasSeveralValues(variant: unknown, tagName: string): boolean {
  if (!isPlainObject(variant)) {
    return false;
  }

  const tagSchema = [variant, ...(Array.isArray(variant.allOf) ? variant.allOf : [])]
    .map((schema) =>
      isPlainObject(schema) && isPlainObject(schema.properties)
        ? schema.properties[tagName]
        : undefined
    )
    .find(Boolean);

  return (
    isPlainObject(tagSchema) &&
    !tagSchema.const &&
    Array.isArray(tagSchema.enum) &&
    tagSchema.enum.length > 1
  );
}
