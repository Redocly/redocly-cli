// Per-generator options (`client.options.<name>`), validated against the schema each
// generator declares. Validation runs once per run, before any file is written, so a
// typo in the config fails with the generator name and the offending key instead of
// reaching `run` — and a generator reads its options without re-checking them.

import { isPlainObject, logger } from '@redocly/openapi-core';

import { NotSupportedError } from '../errors.js';
import type {
  GeneratorDescriptor,
  GeneratorOptionSchema,
  GeneratorOptionsSchema,
} from './types.js';

/**
 * The validated options for every selected generator, keyed by name. Entries for
 * generators this run didn't select are ignored: one config may serve several runs.
 */
export function resolveGeneratorOptions(
  names: string[],
  registry: Map<string, Omit<GeneratorDescriptor, 'run'> | GeneratorDescriptor>,
  configured: Record<string, Record<string, unknown>> | undefined
): Map<string, Record<string, unknown>> {
  const resolved = new Map<string, Record<string, unknown>>();
  for (const name of names) {
    const schema = registry.get(name)?.options;
    const values = configured?.[name];
    if (schema === undefined) {
      if (values !== undefined) {
        logger.warn(
          `generate-client: the "${name}" generator declares no options, so client.options.${name} is ignored.\n`
        );
      }
      resolved.set(name, {});
      continue;
    }
    resolved.set(name, validate(name, schema, values));
  }
  return resolved;
}

function validate(
  name: string,
  schema: GeneratorOptionsSchema,
  values: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (values !== undefined && !isPlainObject(values)) {
    throw new NotSupportedError(
      `The "${name}" generator's options must be a map of option names to values.`
    );
  }
  const given = values ?? {};
  const declared = Object.keys(schema.properties);
  if (schema.additionalProperties !== true) {
    for (const key of Object.keys(given)) {
      if (!declared.includes(key)) {
        throw new NotSupportedError(
          `The "${name}" generator got an unknown option "${key}". Declared options: ${declared.join(', ') || '(none)'}.`
        );
      }
    }
  }
  for (const key of schema.required ?? []) {
    if (given[key] === undefined) {
      throw new NotSupportedError(`The "${name}" generator requires the "${key}" option.`);
    }
  }
  const result: Record<string, unknown> = { ...given };
  for (const [key, property] of Object.entries(schema.properties)) {
    if (result[key] === undefined) {
      if (property.default !== undefined) result[key] = property.default;
      continue;
    }
    const problem = describeMismatch(property, result[key]);
    if (problem !== undefined) {
      throw new NotSupportedError(`The "${name}" generator's "${key}" ${problem}.`);
    }
  }
  return result;
}

/** How a value fails its option schema, phrased to complete `"<key>" …`; undefined when it fits. */
function describeMismatch(property: GeneratorOptionSchema, value: unknown): string | undefined {
  if ('enum' in property) {
    return property.enum.includes(value as string | number | boolean)
      ? undefined
      : `must be one of: ${property.enum.join(', ')}`;
  }
  if (property.type === 'array') {
    const itemType = property.items.type;
    return Array.isArray(value) && value.every((item) => typeof item === itemType)
      ? undefined
      : `must be an array of ${itemType}`;
  }
  return typeof value === property.type ? undefined : `must be a ${property.type}`;
}
