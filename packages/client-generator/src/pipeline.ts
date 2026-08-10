// The generation pipeline: loadSpec → IR → resolve generators → run → write.
// This module must stay free of static `typescript` imports (pinned by
// pipeline-ts-free.test.ts): built-in generators load lazily through
// generators/meta.js, and the TS-specific setup baking loads on demand — so a
// run selecting only non-TypeScript generators never loads the `typescript`
// package. The `/generate` entry re-exports `generateClient` from here and
// layers the sync TS toolkit on top.

import { stringifyYaml } from '@redocly/openapi-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

import type { EmitOptions } from './emitters/emit-options.js';
import { NotSupportedError } from './errors.js';
import { validateSelection } from './generators/meta.js';
import { resolveGeneratorOptions } from './generators/options.js';
import { resolveGenerators } from './generators/resolve.js';
import type {
  CodeSample,
  GeneratedFile,
  GeneratorDescriptor,
  OutputMode,
} from './generators/types.js';
import { buildApiModel } from './intermediate-representation/build.js';
import { allOperations, type ApiModel } from './intermediate-representation/model.js';
import { normalizeSwagger2 } from './intermediate-representation/normalize-swagger2.js';
import { loadSpec } from './loader.js';
import type { GenerateClientOptions, GenerateClientResult } from './types.js';

/**
 * Run each generator of a fully-loaded registry against the IR and concatenate
 * their files. Throws on a duplicate output path so two generators can't
 * silently clobber each other. Validation is the caller's job (`validateSelection`).
 */
export function runGenerators(
  model: ApiModel,
  options: {
    outputPath: string;
    outputMode: OutputMode;
    emit: EmitOptions;
    generators: string[];
    registry: Map<string, GeneratorDescriptor>;
    /** Per-generator options, already validated (see `resolveGeneratorOptions`). */
    generatorOptions?: Map<string, Record<string, unknown>>;
  }
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const seen = new Set<string>();
  // Every emitted path must stay under the --output directory: generator modules are
  // user-chosen code, but a stray `../` or absolute path must not write elsewhere.
  const outputRoot = resolve(dirname(options.outputPath));
  for (const name of options.generators) {
    const generator = options.registry.get(name)!;
    let generated: GeneratedFile[];
    try {
      generated = generator.run({
        model,
        outputPath: options.outputPath,
        outputMode: options.outputMode,
        emit: options.emit,
        selected: options.generators,
        options: options.generatorOptions?.get(name) ?? {},
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Generator "${name}" failed: ${message}`);
    }
    if (
      !Array.isArray(generated) ||
      generated.some(
        (file) =>
          typeof file?.path !== 'string' || file.path === '' || typeof file.content !== 'string'
      )
    ) {
      throw new Error(
        `Generator "${name}" failed: run() must return an array of { path, content } files.`
      );
    }
    for (const file of generated) {
      const resolved = resolve(outputRoot, file.path);
      if (resolved !== outputRoot && !resolved.startsWith(outputRoot + sep)) {
        throw new Error(
          `Generator "${name}" failed: file path escapes the output directory: ${file.path}`
        );
      }
      if (seen.has(resolved)) {
        throw new Error(`Generator conflict: ${file.path} already emitted by an earlier generator`);
      }
      seen.add(resolved);
      // Carry the resolved path forward so the write goes where the guard looked —
      // a relative `file.path` would otherwise resolve against the cwd at write time.
      files.push({ path: resolved, content: file.content });
    }
  }
  return files;
}

/**
 * An OpenAPI Overlay (1.0.0) adding per-operation `x-codeSamples`, collected from
 * every selected generator that implements the `sample` hook; undefined when no
 * generator contributed a sample. Docs tooling applies it to the description —
 * generation stays side-effect-free on the source.
 */
function codeSamplesOverlay(
  model: ApiModel,
  emit: EmitOptions,
  selected: string[],
  registry: Map<string, GeneratorDescriptor>
): string | undefined {
  const actions = [];
  for (const op of allOperations(model.services)) {
    const samples = selected
      .map((name) => registry.get(name)?.sample?.(op, { model, emit }))
      .filter((sample): sample is CodeSample => sample !== undefined);
    if (samples.length > 0) {
      actions.push({
        target: `$.paths['${op.path.replaceAll("'", "''")}'].${op.method}`,
        update: { 'x-codeSamples': samples },
      });
    }
  }
  if (actions.length === 0) return undefined;
  return stringifyYaml({
    overlay: '1.0.0',
    info: { title: `Code samples for ${model.title}`, version: model.version },
    actions,
  });
}

export async function generateClient(
  options: GenerateClientOptions
): Promise<GenerateClientResult> {
  // A path segment that is literally "undefined"/"null" is the telltale of an
  // interpolation bug in the caller (`\`${dir}/client.ts\`` with `dir` unset) — reject
  // it instead of silently creating an `undefined/` directory.
  if (
    options.output.split(/[\\/]/).some((segment) => segment === 'undefined' || segment === 'null')
  ) {
    throw new Error(
      `output path "${options.output}" contains a literal "undefined" or "null" segment — this looks like an interpolation bug in the caller`
    );
  }
  // Setup is a LOCAL module (its code is baked into the generated client) — reject
  // URL-ish specifiers upfront, before any spec loading, instead of failing later as
  // an unreadable file path. Two+ letter scheme, so Windows drive paths don't match.
  if (options.setup && /^[a-z][a-z0-9+.-]+:/i.test(options.setup)) {
    throw new NotSupportedError(
      `setup must be a local file path — remote setup modules are not supported (got: ${options.setup})`
    );
  }
  const outputPath = resolve(options.output);
  const { document, version } = await loadSpec(options.api, options.config);
  const normalized =
    version === 'oas2'
      ? // loadSpec types the parsed document as OAS3 for the common path; a detected
        // swagger-2 document is re-viewed as raw data for normalization.
        normalizeSwagger2(document as unknown as Record<string, unknown>)
      : document;
  const model = buildApiModel(normalized);

  // A publisher `--setup` module is read, validated, and transformed into the neutral setup
  // expression baked into the client. Applied across all output modes by the emitter.
  // Baking parses TypeScript, so the module loads only when setup is actually used.
  let setupBlock: string | undefined;
  if (options.setup) {
    const { bakeSetup } = await import('./emitters/setup-bake.js');
    // A relative setup path resolves against `configDir` (cwd when absent), like
    // generator specifiers. The CLI pre-resolves its inputs, so they arrive absolute.
    const setupPath = resolve(options.configDir ?? process.cwd(), options.setup);
    setupBlock = bakeSetup(await readFile(setupPath, 'utf-8'));
  }

  // Resolve the selection into a registry: built-in names load lazily, inline
  // `customGenerators` register, and any other entry is imported as a plugin
  // specifier (path/package). An empty list (e.g. `generators: []` in config, or
  // no `--generator` flags) means "unspecified" — fall back to the default sdk
  // client rather than emitting nothing.
  const requested = options.generators?.length ? options.generators : ['sdk'];
  const { selected, registry } = await resolveGenerators(requested, {
    customGenerators: options.customGenerators,
    configDir: options.configDir,
  });

  const emit: EmitOptions = {
    serverUrl: options.serverUrl,
    argsStyle: options.argsStyle,
    errorMode: options.errorMode,
    dateType: options.dateType,
    mockData: options.mockData,
    mockSeed: options.mockSeed,
    queryKeyPrefix: options.queryKeyPrefix,
    setup: setupBlock,
    runtime: options.runtime,
    importExt: options.importExt,
    binName: options.binName,
    goPackage: options.goPackage,
    pagination: options.pagination,
  };
  // Fail fast on an incompatible selection (missing prerequisite, unsupported
  // error-mode/date-type/runtime) before producing any file, and warn about options a
  // selected generator can't apply.
  validateSelection(selected, emit, registry, options.outputMode);
  const generatorOptions = resolveGeneratorOptions(selected, registry, options.options);
  const files = runGenerators(model, {
    outputPath,
    outputMode: options.outputMode ?? 'single',
    emit,
    generators: selected,
    generatorOptions,
    registry,
  });

  if (options.codeSamples === true) {
    const overlay = codeSamplesOverlay(model, emit, selected, registry);
    if (overlay !== undefined) {
      files.push({ path: outputPath.replace(/\.[^.]+$/, '.code-samples.yaml'), content: overlay });
    }
  }

  const written: GenerateClientResult['files'] = [];
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content, 'utf-8');
    written.push({ path: file.path, bytes: Buffer.byteLength(file.content, 'utf-8') });
  }

  return {
    outputPath,
    bytes: written.reduce((sum, file) => sum + file.bytes, 0),
    files: written,
  };
}
