import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import type { EmitOptions } from './emitters/client.js';
import { bakeSetup } from './emitters/setup-bake.js';
import { builtinGenerators, validateGenerators } from './generators/index.js';
import { resolveGenerators } from './generators/resolve.js';
import type { GeneratorDescriptor } from './generators/types.js';
import { buildApiModel } from './intermediate-representation/build.js';
import type { ApiModel } from './intermediate-representation/model.js';
import { normalizeSwagger2 } from './intermediate-representation/normalize-swagger2.js';
import { loadSpec } from './loader.js';
import type { GenerateClientOptions, GenerateClientResult } from './types.js';
import type { GeneratedFile, OutputMode } from './writers/types.js';

export { NotSupportedError } from './errors.js';
export { defineClientSetup } from './runtime-contract.js';
export type {
  ClientSetup,
  ClientSetupConfig,
  Middleware,
  OperationContext,
  RequestContext,
  RetryConfig,
  RetryContext,
  RetryStrategy,
} from './runtime-contract.js';
export type { Config } from './config.js';
export type { GenerateClientOptions, GenerateClientResult, LoadResult } from './types.js';
export { mergeConfig } from './config-file.js';
// The custom-generator plugin API + codegen toolkit + IR types (also re-exports the shared
// `Generator`/`GeneratedFile`/`OutputMode`/`ArgsStyle`/`Facade` types).
export * from './plugin.js';

/**
 * Validate the generator selection (see `validateGenerators`), then run each
 * configured generator against the IR and concatenate their files. Throws on a
 * duplicate output path so two generators can't silently clobber each other.
 */
export function collectGeneratedFiles(
  model: ApiModel,
  options: {
    outputPath: string;
    outputMode: OutputMode;
    emit: EmitOptions;
    generators: string[];
    /** The resolved registry (built-ins + custom). Defaults to the built-ins. */
    registry?: Map<string, GeneratorDescriptor>;
  }
): GeneratedFile[] {
  const registry = options.registry ?? builtinGenerators();
  // Fail fast on an incompatible selection (missing prerequisite, unsupported
  // facade/error-mode) before producing any file.
  validateGenerators(options.generators, options.emit, registry);
  const files: GeneratedFile[] = [];
  const seen = new Set<string>();
  for (const name of options.generators) {
    const generator = registry.get(name)!;
    for (const file of generator.run({
      model,
      outputPath: options.outputPath,
      outputMode: options.outputMode,
      emit: options.emit,
    })) {
      if (seen.has(file.path)) {
        throw new Error(`Generator conflict: ${file.path} already emitted by an earlier generator`);
      }
      seen.add(file.path);
      files.push(file);
    }
  }
  return files;
}

export async function generateClient(
  options: GenerateClientOptions
): Promise<GenerateClientResult> {
  const outputPath = resolve(options.output);
  const { document, version } = await loadSpec(options.api, options.config);
  const normalized =
    version === 'oas2'
      ? normalizeSwagger2(document as unknown as Record<string, unknown>)
      : document;
  const model = buildApiModel(normalized);

  // A publisher `--setup` module is read, validated, and transformed into the neutral setup
  // expression baked into the client. Applied per facade and across all output modes by the emitter.
  let setupBlock: string | undefined;
  if (options.setup) {
    // Resolve a relative setup path against the cwd, consistent with `output` above.
    // The CLI pre-resolves it (relative to cwd, like --output) and a config-file
    // `setup` is pre-resolved against the config dir, so both arrive absolute here.
    const setupPath = resolve(options.setup);
    setupBlock = bakeSetup(await readFile(setupPath, 'utf-8'));
  }

  // Resolve the selection into a registry: built-in names pass through, inline `customGenerators`
  // register, and any other entry is imported as a plugin specifier (path/package).
  // An empty list (e.g. `generators: []` in config, or `--generators ,`) means
  // "unspecified" — fall back to the default sdk client rather than emitting nothing.
  const requested = options.generators?.length ? options.generators : ['sdk'];
  const { selected, registry } = await resolveGenerators(requested, {
    customGenerators: options.customGenerators,
    configDir: options.configDir,
  });

  const files = collectGeneratedFiles(model, {
    outputPath,
    outputMode: options.outputMode ?? 'single',
    emit: {
      serverUrl: options.serverUrl,
      enumStyle: options.enumStyle,
      facade: options.facade,
      argsStyle: options.argsStyle,
      name: options.name,
      errorMode: options.errorMode,
      dateType: options.dateType,
      queryFramework: options.queryFramework,
      mockData: options.mockData,
      mockSeed: options.mockSeed,
      setup: setupBlock,
    },
    generators: selected,
    registry,
  });

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
