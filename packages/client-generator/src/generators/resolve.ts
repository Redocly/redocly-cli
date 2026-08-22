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
import { GENERATOR_VERSION, satisfiesGeneratorRange } from './compatibility.js';
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

  // Load every selected entry first: an import specifier's declared name and `requires`
  // are only known once it is imported, and an ejected generator carries the same
  // `requires` as the built-in it replaces.
  const names: string[] = [];
  for (const entry of entries) {
    names.push(await loadEntry(entry, registry, options.configDir));
  }

  // A prerequisite is pulled in rather than demanded: selecting `cli` should give a
  // working CLI without the user knowing which other generators provide its parts.
  const selected: string[] = [];
  const visiting = new Set<string>();
  const add = async (name: string): Promise<void> => {
    if (selected.includes(name) || visiting.has(name)) return;
    visiting.add(name);
    for (const required of registry.get(name)!.requires ?? []) {
      // Only pull in a prerequisite we know how to load — an already-registered
      // generator or a built-in. Anything else stays the user's problem and is
      // reported by `validateSelection`.
      if (registry.has(required) || required in BUILTIN_META) {
        await add(await loadEntry(required, registry, options.configDir));
      }
    }
    visiting.delete(name);
    selected.push(name);
  };
  for (const name of names) await add(name);
  return { selected, registry };
}

/**
 * Load one entry — an already-registered name, a built-in name, or an import specifier —
 * into the registry, and return the name it is registered under.
 */
async function loadEntry(
  entry: string,
  registry: Map<string, GeneratorDescriptor>,
  configDir?: string
): Promise<string> {
  if (registry.has(entry)) return entry;
  const meta = (BUILTIN_META as Record<string, BuiltinMeta>)[entry];
  if (meta !== undefined) {
    const { load, ...compatibility } = meta;
    registry.set(entry, { ...compatibility, ...(await load()) });
    return entry;
  }
  // Without this, the old name falls through to `import('sdk')` and fails with a
  // module-load error that hides the rename.
  if (entry === 'sdk') {
    throw new NotSupportedError(
      'The "sdk" generator is now named "typescript". Update the `generators` list or the --generator flag.'
    );
  }
  const custom = await importGenerator(entry, configDir ?? process.cwd());
  register(registry, custom);
  return custom.name;
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
  // The model and the helpers change under semver, so a declared range that excludes the
  // running version means the generator and this CLI disagree on the contract.
  if (custom.requiresGenerator !== undefined) {
    const satisfied = satisfiesGeneratorRange(GENERATOR_VERSION, custom.requiresGenerator);
    if (satisfied === undefined) {
      throw new NotSupportedError(
        `Generator "${custom.name}" declares requiresGenerator "${custom.requiresGenerator}", which is not a range we read. Use ^1.2.0, ~1.2.0, >=1.2.0, or an exact version.`
      );
    }
    if (!satisfied) {
      throw new NotSupportedError(
        `Generator "${custom.name}" needs @redocly/client-generator ${custom.requiresGenerator}; this CLI ships ${GENERATOR_VERSION}. ` +
          'Upgrade @redocly/cli if the generator is newer, or update the generator — `redocly eject-generator <name> --update` for an ejected file, or upgrade its package.'
      );
    }
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
    // `docs` and `notApplicable` are part of the contract the ejected files export —
    // dropping either makes an ejected generator quietly do less than the built-in it
    // replaced (`--docs` writes no page, ignored options stop warning).
    docs: custom.docs,
    notApplicable: custom.notApplicable,
    options: custom.options,
    requires: custom.requires,
    errorModes: custom.errorModes,
    dateTypes: custom.dateTypes,
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
  // An ejected generator is TypeScript source, run through Node's own type stripping —
  // absent that, `import()` would die with ERR_UNKNOWN_FILE_EXTENSION deep in the loader.
  if (isPath && specifier.endsWith('.ts') && !process.features.typescript) {
    throw new NotSupportedError(
      `Generator "${specifier}" is TypeScript, which this Node cannot run directly — use Node 22.18, 23.6, or newer.`
    );
  }
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
