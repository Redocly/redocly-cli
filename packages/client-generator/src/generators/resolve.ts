// Resolves a `generators` selection (a mix of built-in names, inline custom generators, and import
// specifiers) into a registry keyed by name plus the ordered list of names to run. This is the only
// async, side-effecting step in the generator pipeline: a specifier that is neither a built-in nor an
// already-registered custom name is dynamically `import()`ed (a standard Node ESM dynamic import), its
// default (or `generator`) export validated, and registered under its declared name. Built-ins are
// seeded fresh per call (see `builtinGenerators`), so registration never mutates the built-in table.

import { isPlainObject } from '@redocly/openapi-core';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';

import { NotSupportedError } from '../errors.js';
import { builtinGenerators } from './index.js';
import type { CustomGenerator, GeneratorDescriptor } from './types.js';

export type ResolvedGenerators = {
  /** Generator names to run, in selection order. */
  selected: string[];
  /** Every available generator (built-ins + registered customs) keyed by name. */
  registry: Map<string, GeneratorDescriptor>;
};

export type ResolveOptions = {
  /** Inline custom generators (via the programmatic `generateClient` API) registered before resolution. */
  customGenerators?: CustomGenerator[];
  /** Directory relative-path specifiers resolve against (the config's location). Defaults to cwd. */
  configDir?: string;
};

/**
 * Build the run list + registry for a `generators` selection. Each entry is, in order of preference,
 * a built-in name, an already-registered custom name, or an import specifier (path or package).
 */
export async function resolveGenerators(
  entries: string[],
  options: ResolveOptions = {}
): Promise<ResolvedGenerators> {
  const registry = builtinGenerators();
  for (const custom of options.customGenerators ?? []) register(registry, custom);

  const selected: string[] = [];
  for (const entry of entries) {
    if (registry.has(entry)) {
      selected.push(entry);
      continue;
    }
    const custom = await importGenerator(entry, options.configDir ?? process.cwd());
    register(registry, custom);
    selected.push(custom.name);
  }
  return { selected, registry };
}

/** Validate a custom generator and add it under its name, rejecting collisions. */
function register(registry: Map<string, GeneratorDescriptor>, custom: CustomGenerator): void {
  if (
    !isPlainObject(custom) ||
    typeof custom.name !== 'string' ||
    custom.name === '' ||
    typeof custom.run !== 'function'
  ) {
    throw new NotSupportedError(
      'Invalid custom generator: expected an object with a non-empty string `name` and a `run` function (build one with `defineGenerator`).'
    );
  }
  if (registry.has(custom.name)) {
    throw new NotSupportedError(
      `Generator name "${custom.name}" collides with an existing generator. Rename the custom generator.`
    );
  }
  registry.set(custom.name, {
    run: custom.run,
    requires: custom.requires,
    errorModes: custom.errorModes,
    dateTypes: custom.dateTypes,
    runtimes: custom.runtimes,
  });
}

/** Dynamically import a generator from a path (resolved against `configDir`) or package specifier. */
async function importGenerator(specifier: string, configDir: string): Promise<CustomGenerator> {
  const isPath = specifier.startsWith('.') || isAbsolute(specifier);
  const target = isPath ? pathToFileURL(resolvePath(configDir, specifier)).href : specifier;
  let module: Record<string, unknown>;
  try {
    module = (await import(target)) as Record<string, unknown>;
  } catch (cause) {
    throw new NotSupportedError(
      `Could not load generator "${specifier}": ${(cause as Error).message}`
    );
  }
  const generator = module.default ?? module.generator;
  if (generator === undefined) {
    throw new NotSupportedError(
      `Generator module "${specifier}" must export a generator (a default export or a \`generator\` export built with \`defineGenerator\`).`
    );
  }
  return generator as CustomGenerator;
}
