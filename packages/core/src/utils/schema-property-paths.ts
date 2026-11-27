import { isPlainObject } from './is-plain-object.js';
import { isPropertyExcludedFromTarget, type MessageTarget } from './to-ajv-schema.js';

/**
 * Returns the path of every property that a dereferenced schema documents for a request or a response.
 * A path is relative to the value the schema describes, and `[]` marks the items of an array,
 * as in `items[].name`.
 * The `allOf`, `oneOf`, and `anyOf` branches add their properties under the same path, so a
 * property declared in several branches is listed once.
 * A recursive schema is followed until it repeats, and only where it first appears.
 */
export function getSchemaPropertyPaths(schema: unknown, target: MessageTarget): Set<string> {
  const paths = new Set<string>();
  collectSchemaPropertyPaths(schema, target, '', paths, new Set(), true, new Set());
  return paths;
}

/**
 * Returns the names of the properties of a dereferenced schema itself, without the nested ones.
 * A form sends its fields flat, so these are the fields that a form can carry.
 */
export function getSchemaPropertyNames(schema: unknown, target: MessageTarget): Set<string> {
  const names = new Set<string>();
  collectSchemaPropertyPaths(schema, target, '', names, new Set(), false, new Set());
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

// Returns whether the walk met a recursion in the schema or below it.
function collectSchemaPropertyPaths(
  schema: unknown,
  target: MessageTarget,
  path: string,
  paths: Set<string>,
  ancestors: Set<object>,
  nested: boolean,
  recursiveSchemas: Set<object>
): boolean {
  if (!isPlainObject(schema)) {
    return false;
  }
  // A dereferenced recursive schema is circular, so the walk stops when it meets an ancestor.
  if (ancestors.has(schema)) {
    return true;
  }
  // Schemas that reference each other multiply their paths with every place they are used in.
  // So a schema that leads to a recursion is walked in full once: where it appears again,
  // only its own properties are listed.
  let isRecursive = recursiveSchemas.has(schema);
  const followNested = nested && !isRecursive;
  const collect = (childSchema: unknown, childPath: string) => {
    const isChildRecursive = collectSchemaPropertyPaths(
      childSchema,
      target,
      childPath,
      paths,
      ancestors,
      followNested,
      recursiveSchemas
    );
    isRecursive ||= isChildRecursive;
  };
  ancestors.add(schema);

  for (const branches of [schema.allOf, schema.oneOf, schema.anyOf]) {
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        collect(branch, path);
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
      if (followNested) {
        collect(propertySchema, propertyPath);
      }
    }
  }

  if (followNested && isPlainObject(schema.items)) {
    collect(schema.items, `${path}[]`);
  }

  ancestors.delete(schema);
  if (isRecursive) {
    recursiveSchemas.add(schema);
  }

  return isRecursive;
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
