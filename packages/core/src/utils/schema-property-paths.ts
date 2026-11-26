import { isPlainObject } from './is-plain-object.js';
import { isPropertyExcludedFromTarget, type MessageTarget } from './to-ajv-schema.js';

/**
 * Returns the path of every property that a dereferenced schema documents for a request or a response.
 * A path is relative to the value the schema describes, and `[]` marks the items of an array,
 * as in `items[].name`.
 * The `allOf`, `oneOf`, and `anyOf` branches add their properties under the same path, so a
 * property declared in several branches is listed once.
 */
export function getSchemaPropertyPaths(schema: unknown, target: MessageTarget): Set<string> {
  const paths = new Set<string>();
  collectSchemaPropertyPaths(schema, target, '', paths, new Set(), true);
  return paths;
}

/**
 * Returns the names of the properties of a dereferenced schema itself, without the nested ones.
 * A form sends its fields flat, so these are the fields that a form can carry.
 */
export function getSchemaPropertyNames(schema: unknown, target: MessageTarget): Set<string> {
  const names = new Set<string>();
  collectSchemaPropertyPaths(schema, target, '', names, new Set(), false);
  return names;
}

/**
 * Returns the paths of the documented properties that a value carries, in the form of
 * `getSchemaPropertyPaths`.
 * Every `allOf`, `oneOf`, and `anyOf` branch is entered: only the properties present in the value
 * are listed, so a branch adds only a property the value really has.
 */
export function getValuePropertyPaths(
  value: unknown,
  schema: unknown,
  target: MessageTarget
): Set<string> {
  const paths = new Set<string>();
  collectValuePropertyPaths(value, schema, target, '', paths, new Set());
  return paths;
}

function collectSchemaPropertyPaths(
  schema: unknown,
  target: MessageTarget,
  path: string,
  paths: Set<string>,
  ancestors: Set<object>,
  nested: boolean
): void {
  // A dereferenced recursive schema is circular, so the walk stops when it meets an ancestor.
  if (!isPlainObject(schema) || ancestors.has(schema)) {
    return;
  }
  ancestors.add(schema);

  for (const branches of [schema.allOf, schema.oneOf, schema.anyOf]) {
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        collectSchemaPropertyPaths(branch, target, path, paths, ancestors, nested);
      }
    }
  }

  if (isPlainObject(schema.properties)) {
    for (const [name, propertySchema] of Object.entries(schema.properties)) {
      if (isPropertyExcludedFromTarget(propertySchema, target)) {
        continue;
      }
      const propertyPath = path ? `${path}.${name}` : name;
      paths.add(propertyPath);
      if (nested) {
        collectSchemaPropertyPaths(propertySchema, target, propertyPath, paths, ancestors, nested);
      }
    }
  }

  if (nested && isPlainObject(schema.items)) {
    collectSchemaPropertyPaths(schema.items, target, `${path}[]`, paths, ancestors, nested);
  }

  ancestors.delete(schema);
}

function collectValuePropertyPaths(
  value: unknown,
  schema: unknown,
  target: MessageTarget,
  path: string,
  paths: Set<string>,
  ancestors: Set<object>
): void {
  if (!isPlainObject(schema) || ancestors.has(schema)) {
    return;
  }
  ancestors.add(schema);

  for (const branches of [schema.allOf, schema.oneOf, schema.anyOf]) {
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        collectValuePropertyPaths(value, branch, target, path, paths, ancestors);
      }
    }
  }

  if (isPlainObject(schema.properties) && isPlainObject(value)) {
    for (const [name, propertySchema] of Object.entries(schema.properties)) {
      if (value[name] === undefined || isPropertyExcludedFromTarget(propertySchema, target)) {
        continue;
      }
      const propertyPath = path ? `${path}.${name}` : name;
      paths.add(propertyPath);
      collectValuePropertyPaths(
        value[name],
        propertySchema,
        target,
        propertyPath,
        paths,
        ancestors
      );
    }
  }

  if (isPlainObject(schema.items) && Array.isArray(value)) {
    for (const element of value) {
      collectValuePropertyPaths(element, schema.items, target, `${path}[]`, paths, ancestors);
    }
  }

  ancestors.delete(schema);
}
