import { type Config, HandledError, isPlainObject, logger } from '@redocly/openapi-core';
import { type Config as OpenApiTsConfig } from '@redocly/client-generator';
import { blue, gray, yellow } from 'colorette';
import { dirname, isAbsolute, resolve as resolvePath } from 'node:path';

import { getAliasOrPath } from '../utils/miscellaneous.js';
import { type CommandArgs } from '../wrapper.js';

/**
 * Read generate-client settings from a `redocly.yaml`'s `x-client-generator`
 * extension block (the auto-discovered config, or the one at `--config`). Relative
 * `input`/`output` are resolved against the config file's directory so they mean the
 * same thing regardless of the current working directory. Returns `{}` when the block
 * is absent. (A URL/registry `input` is left untouched.)
 */
function readRedoclyExtension(config: Config): Record<string, unknown> {
  const raw = (config.resolvedConfig as Record<string, unknown>)['x-client-generator'];
  if (!isPlainObject(raw)) return {};
  const ext: Record<string, unknown> = { ...raw };
  const baseDir = config.configPath ? dirname(config.configPath) : undefined;
  if (baseDir) {
    if (
      typeof ext.input === 'string' &&
      !isAbsolute(ext.input) &&
      !/^https?:\/\//i.test(ext.input)
    ) {
      ext.input = resolvePath(baseDir, ext.input);
    }
    if (typeof ext.output === 'string' && !isAbsolute(ext.output)) {
      ext.output = resolvePath(baseDir, ext.output);
    }
  }
  return ext;
}

export type GenerateClientCommandArgv = {
  input?: string;
  output?: string;
  config?: string;
  'base-url'?: string;
  'enum-style'?: 'union' | 'const-object';
  'output-mode'?: 'single' | 'split' | 'tags' | 'tags-split';
  facade?: 'functions' | 'service-class';
  'args-style'?: 'flat' | 'grouped';
  'error-mode'?: 'throw' | 'result';
  'date-type'?: 'string' | 'Date';
  'query-framework'?: 'react' | 'vue' | 'svelte' | 'solid';
  'mock-data'?: 'baked' | 'faker';
  'mock-seed'?: number;
  name?: string;
  // Built-in names, inline custom-generator names, or plugin import specifiers (path/package).
  generators?: string[];
};

export async function handleGenerateClient({
  argv,
  config,
}: CommandArgs<GenerateClientCommandArgv>) {
  const { generateClient } = await import('@redocly/client-generator');
  const { mergeConfig } = await import('@redocly/client-generator/config-file');

  // Config sources, lowest → highest precedence: the `redocly.yaml` `x-client-generator`
  // block (located via the standard `--config` flag, else discovered in cwd) → CLI flags.
  const redoclyExtension = readRedoclyExtension(config);
  const merged = mergeConfig(redoclyExtension as Partial<OpenApiTsConfig>, {
    input: argv.input,
    output: argv.output,
    baseUrl: argv['base-url'],
    enumStyle: argv['enum-style'],
    outputMode: argv['output-mode'],
    facade: argv.facade,
    argsStyle: argv['args-style'],
    errorMode: argv['error-mode'],
    dateType: argv['date-type'],
    queryFramework: argv['query-framework'],
    mockData: argv['mock-data'],
    mockSeed: argv['mock-seed'],
    name: argv.name,
    generators: argv.generators,
  });

  if (!merged.input)
    throw new HandledError(`\n❌  No input. Pass <input> or set it in a config file.\n`);
  if (!merged.output)
    throw new HandledError(`\n❌  No output. Pass --output or set it in a config file.\n`);

  // Resolve `<input>` as a `redocly.yaml` `apis:` alias when it matches one (to the
  // alias's `root`, relative to the config dir); a plain path/URL passes through.
  const input = getAliasOrPath(config, merged.input).path;
  const outputPath = resolvePath(merged.output);

  // Relative-path generator specifiers (and inline plugins) resolve against the
  // `redocly.yaml` directory (the config's location), else the working directory.
  const configDir = config.configPath ? dirname(config.configPath) : process.cwd();

  if (!outputPath.endsWith('.ts')) {
    throw new HandledError(
      `\n❌  output must point at a TypeScript file (ending in .ts).\n   Got: ${outputPath}\n`
    );
  }
  if (merged.baseUrl !== undefined) {
    try {
      new URL(merged.baseUrl);
    } catch {
      throw new HandledError(
        `\n❌  --base-url must be a valid URL (parseable by \`new URL(...)\`).\n   Got: ${merged.baseUrl}\n`
      );
    }
  }

  try {
    logger.info(gray('\n  Generating TypeScript client... \n'));
    const result = await generateClient({
      ...merged,
      input,
      output: outputPath,
      config,
      configDir,
    });
    const summary =
      result.files.length === 1
        ? `TypeScript client successfully generated to ${yellow(result.outputPath)} (${result.bytes} bytes).`
        : `TypeScript client successfully generated: ${result.files.length} files (${result.bytes} bytes), entry at ${yellow(result.outputPath)}.`;
    logger.info('\n' + blue(summary) + '\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new HandledError(
      '\n' +
        `❌  Failed to generate TypeScript client.\n   ${message}\n` +
        '   Check the input file path and that the OpenAPI document is valid.'
    );
  }
}
