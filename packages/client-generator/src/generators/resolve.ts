// Resolves a `generators` selection (a mix of built-in names, inline custom generators, and import
// specifiers) into a registry keyed by name plus the ordered list of names to run. This is the only
// async, side-effecting step in the generator pipeline: a specifier that is neither a built-in nor an
// already-registered custom name is dynamically `import()`ed (a standard Node ESM dynamic import), its
// default (or `generator`) export validated, and registered under its declared name. Built-ins are
// seeded fresh per call (see `builtinGenerators`), so registration never mutates the built-in table.

import { isAbsoluteUrl, isPlainObject, logger } from '@redocly/openapi-core';
import { isAbsolute, resolve as resolvePath } from 'node:path';
import { pathToFileURL } from 'node:url';

import { NotSupportedError } from '../errors.js';
import { GENERATOR_CONTRACT } from './contract.js';
import { BUILTIN_META, type BuiltinMeta } from './meta.js';
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
  // Built-ins are loaded lazily through BUILTIN_META so a selection without a
  // TypeScript-emitting generator never loads the `typescript` package.
  const registry = new Map<string, GeneratorDescriptor>();
  for (const custom of options.customGenerators ?? []) register(registry, custom);

  const selected: string[] = [];
  // A prerequisite is pulled in rather than demanded: selecting `cli` should give a
  // working CLI without the user knowing which other generators provide its parts.
  const entriesWithPrerequisites = expandPrerequisites(entries, options.customGenerators);
  for (const entry of entriesWithPrerequisites) {
    if (registry.has(entry)) {
      selected.push(entry);
      continue;
    }
    const meta = (BUILTIN_META as Record<string, BuiltinMeta>)[entry];
    if (meta !== undefined) {
      const { load, ...compatibility } = meta;
      registry.set(entry, { ...compatibility, ...(await load()) });
      selected.push(entry);
      continue;
    }
    const custom = await importGenerator(entry, options.configDir ?? process.cwd());
    register(registry, custom);
    selected.push(custom.name);
  }
  return { selected, registry };
}

/**
 * The selection with every declared prerequisite included, each before the generator that
 * needs it. Only BUILT-IN prerequisites are added: a custom generator's `requires` may
 * name anything, and inventing a resolution for it would be guesswork.
 */
function expandPrerequisites(entries: string[], customs: CustomGenerator[] = []): string[] {
  const requirementsOf = (name: string): string[] => {
    const meta = (BUILTIN_META as Record<string, BuiltinMeta>)[name];
    if (meta !== undefined) return meta.requires ?? [];
    return customs.find((custom) => custom.name === name)?.requires ?? [];
  };
  const out: string[] = [];
  const visiting = new Set<string>();
  const add = (name: string): void => {
    if (out.includes(name) || visiting.has(name)) return;
    visiting.add(name);
    for (const required of requirementsOf(name)) {
      // Only auto-add a prerequisite we know how to load; anything else stays the
      // user's problem and is reported by `validateSelection`.
      if (required in BUILTIN_META) add(required);
    }
    visiting.delete(name);
    if (!out.includes(name)) out.push(name);
  };
  for (const entry of entries) add(entry);
  return out;
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
  // A declared contract must match exactly — the number only moves on breaking
  // changes, so any difference means the generator and this CLI disagree on the IR.
  if (custom.contract !== undefined && custom.contract !== GENERATOR_CONTRACT) {
    throw new NotSupportedError(
      `Generator "${custom.name}" declares generator contract ${custom.contract}; this CLI provides ${GENERATOR_CONTRACT}. ` +
        (custom.contract > GENERATOR_CONTRACT
          ? 'Update @redocly/cli.'
          : 'Update the generator — `redocly eject-generator <name> --update` for ejected files, or upgrade the package.')
    );
  }
  // A custom generator MAY take over a built-in name — that's how an ejected
  // generator replaces its origin without a config rename. Announce the takeover.
  if (custom.name in BUILTIN_META) {
    logger.warn(
      `generate-client: custom generator "${custom.name}" takes over the built-in generator of the same name.\n`
    );
  }
  registry.set(custom.name, {
    run: custom.run,
    sample: custom.sample,
    requires: custom.requires,
    errorModes: custom.errorModes,
    dateTypes: custom.dateTypes,
    runtimes: custom.runtimes,
  });
}

/** Dynamically import a generator from a path (resolved against `configDir`) or package specifier. */
async function importGenerator(specifier: string, configDir: string): Promise<CustomGenerator> {
  // Like core's plugin loading: a URL specifier would reach `import()` — and a `data:`
  // URL executes inline code straight from the config.
  if (isAbsoluteUrl(specifier)) {
    throw new NotSupportedError(
      `Remote generator modules are not supported — use a local path or a package name. Got: ${specifier}`
    );
  }
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
