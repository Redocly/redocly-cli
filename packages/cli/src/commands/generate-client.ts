import { type Config as OpenApiTsConfig } from '@redocly/client-generator';
import { HandledError, isPlainObject, logger, pluralize } from '@redocly/openapi-core';
import { blue, gray, yellow } from 'colorette';
import { basename, dirname, extname, isAbsolute, resolve as resolvePath } from 'node:path';

import { getAliasOrPath } from '../utils/miscellaneous.js';
import { type CommandArgs } from '../wrapper.js';

export type GenerateClientCommandArgv = {
  api?: string;
  output?: string;
  config?: string;
  'server-url'?: string;
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
  // Path to a publisher setup module baked into the generated client.
  setup?: string;
};

type ClientConfig = Partial<OpenApiTsConfig>;

/** A single client to generate: which API to read, where to write it, and its per-API `client` block. */
type Job = { name: string; api: string; clientOutput?: string; perApiClient: ClientConfig };

/** Resolve a `client` block's relative `setup` path against the config dir (URLs/absolute left as-is). */
function resolveSetup(client: ClientConfig, configDir: string): ClientConfig {
  const { setup } = client;
  if (typeof setup === 'string' && !isAbsolute(setup) && !/^https?:\/\//i.test(setup)) {
    return { ...client, setup: resolvePath(configDir, setup) };
  }
  return client;
}

/** Make an API name safe as a filename segment (path separators would escape the target dir). */
function fileNameFor(name: string): string {
  return `${name.replace(/[\\/]/g, '_')}.client.ts`;
}

export async function handleGenerateClient({
  argv,
  config,
}: CommandArgs<GenerateClientCommandArgv>) {
  const { generateClient } = await import('@redocly/client-generator');
  const { mergeConfig } = await import('@redocly/client-generator/config-file');

  const { client, apis } = config.resolvedConfig;
  const configDir = config.configPath ? dirname(config.configPath) : process.cwd();
  // Top-level `client` block: shared defaults (relative `setup` resolved against the config dir).
  const topClient = resolveSetup((isPlainObject(client) ? client : {}) as ClientConfig, configDir);
  const apisCfg = apis ?? {};

  // CLI setting flags override both the top-level and per-API `client` blocks. `--setup` is
  // relative to the cwd (like `--output`); `api`/`output` are not settings and stay out of the merge.
  const cliFlags: ClientConfig = {
    serverUrl: argv['server-url'],
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
    setup: argv.setup === undefined ? undefined : resolvePath(argv.setup),
  };

  const perApiJob = (name: string): Job => {
    const apiCfg = apisCfg[name];
    return {
      name,
      api: getAliasOrPath(config, name).path,
      clientOutput: apiCfg?.clientOutput,
      perApiClient: isPlainObject(apiCfg?.client)
        ? resolveSetup(apiCfg.client as ClientConfig, configDir)
        : {},
    };
  };

  // Three invocation modes, keyed off the positional argument.
  const jobs: Job[] = [];
  if (argv.api === undefined) {
    // Fan-out: generate for every API that opts in with a `client` block.
    if (argv.output) {
      throw new HandledError(
        `\n❌  --output can't target multiple APIs. Set \`clientOutput\` under each api in redocly.yaml, or pass a single <api>.\n`
      );
    }
    for (const [name, apiCfg] of Object.entries(apisCfg)) {
      if (isPlainObject(apiCfg.client)) jobs.push(perApiJob(name));
    }
    if (jobs.length === 0) {
      throw new HandledError(
        `\n❌  No API to generate. Add a \`client\` block under an \`apis:\` entry, or pass <api> (a file/URL or an \`apis:\` alias).\n`
      );
    }
  } else if (apisCfg[argv.api]) {
    // Named `apis:` alias: use its root, its `client` block (if any), and its `clientOutput`.
    jobs.push(perApiJob(argv.api));
  } else {
    // Plain file/URL: ignore the `apis:` registry; use the top-level `client` defaults only.
    jobs.push({ name: basename(argv.api, extname(argv.api)), api: argv.api, perApiClient: {} });
  }

  for (const job of jobs) {
    const merged = mergeConfig(mergeConfig(topClient, job.perApiClient), cliFlags);

    // Output: an explicit `--output` (single-API modes) wins; else the per-API `clientOutput`
    // (config-dir-relative); else `<name>.client.ts` in the config dir.
    const outputPath =
      argv.output !== undefined
        ? resolvePath(argv.output)
        : job.clientOutput !== undefined
          ? resolvePath(configDir, job.clientOutput)
          : resolvePath(configDir, fileNameFor(job.name));

    if (!outputPath.endsWith('.ts')) {
      throw new HandledError(
        `\n❌  output must point at a TypeScript file (ending in .ts).\n   Got: ${outputPath}\n`
      );
    }
    if (merged.serverUrl !== undefined) {
      try {
        // Accept absolute URLs (https://api.example.com) and relative bases (/v1): OpenAPI allows
        // relative `servers[].url`, and the runtime concatenates serverUrl + path.
        new URL(merged.serverUrl, 'http://localhost');
      } catch {
        throw new HandledError(
          `\n❌  --server-url must be a valid URL — absolute (https://api.example.com) or relative (/v1).\n   Got: ${merged.serverUrl}\n`
        );
      }
    }

    try {
      logger.info(gray(`\n  Generating TypeScript client${job.name ? ` for ${job.name}` : ''}... \n`));
      const result = await generateClient({
        ...merged,
        api: job.api,
        output: outputPath,
        config,
        configDir,
      });
      const fileCount = `${result.files.length} ${pluralize('file', result.files.length)}`;
      const summary = `TypeScript client successfully generated: ${fileCount} (${result.bytes} bytes) at ${yellow(result.outputPath)}.`;
      logger.info('\n' + blue(summary) + '\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HandledError(
        '\n' +
          `❌  Failed to generate TypeScript client${job.name ? ` for ${job.name}` : ''}.\n   ${message}\n` +
          '   Check the API description file path and that the OpenAPI document is valid.'
      );
    }
  }
}
