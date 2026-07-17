import { type Config as OpenApiTsConfig } from '@redocly/client-generator';
import { type Config, HandledError, isPlainObject, logger, pluralize } from '@redocly/openapi-core';
import { blue, gray, yellow } from 'colorette';
import { basename, dirname, extname, isAbsolute, resolve as resolvePath } from 'node:path';

import { getFallbackApisOrExit } from '../utils/miscellaneous.js';
import { type CommandArgs } from '../wrapper.js';

export type GenerateClientCommandArgv = {
  api?: string;
  output?: string;
  config?: string;
  'server-url'?: string;
  'enum-style'?: 'union' | 'const-object';
  'output-mode'?: 'single' | 'split';
  runtime?: 'inline' | 'package';
  'args-style'?: 'flat' | 'grouped';
  'error-mode'?: 'throw' | 'result';
  'date-type'?: 'string' | 'Date';
  'query-framework'?: 'react' | 'vue' | 'svelte' | 'solid';
  'mock-data'?: 'baked' | 'faker';
  'mock-seed'?: number;
  generator?: string[];
  setup?: string;
};

type ClientConfig = Partial<OpenApiTsConfig>;

type Job = {
  name: string;
  api: string;
  aliasConfig: Config;
  clientOutput?: string;
  client: ClientConfig;
};

// Two+ letter scheme, so Windows drive paths (`C:\...`) don't match.
const URL_SCHEME = /^[a-z][a-z0-9+.-]+:/i;

function resolveSetup(client: ClientConfig, configDir: string): ClientConfig {
  const { setup } = client;
  if (typeof setup !== 'string') return client;
  if (URL_SCHEME.test(setup)) {
    throw new HandledError(
      `\n❌  \`client.setup\` must be a local file path — remote setup modules are not supported.\n   Got: ${setup}\n`
    );
  }
  if (!isAbsolute(setup)) {
    return { ...client, setup: resolvePath(configDir, setup) };
  }
  return client;
}

function fileNameFor(name: string): string {
  return `${name.replace(/[\\/]/g, '_')}.client.ts`;
}

// Accepts an absolute http(s) URL or a root-relative path; rejects bare hostnames,
// protocol-relative `//host`, and non-http(s) schemes.
function isValidServerUrl(value: string): boolean {
  if (value.startsWith('//')) return false;
  if (value.startsWith('/')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export async function handleGenerateClient({
  argv,
  config,
}: CommandArgs<GenerateClientCommandArgv>) {
  const { generateClient, mergeConfig } = await import('@redocly/client-generator');

  const configDir = config.configPath ? dirname(config.configPath) : process.cwd();
  const apisCfg = config.resolvedConfig.apis ?? {};

  const cliFlags: ClientConfig = {
    serverUrl: argv['server-url'],
    enumStyle: argv['enum-style'],
    outputMode: argv['output-mode'],
    runtime: argv.runtime,
    argsStyle: argv['args-style'],
    errorMode: argv['error-mode'],
    dateType: argv['date-type'],
    queryFramework: argv['query-framework'],
    mockData: argv['mock-data'],
    mockSeed: argv['mock-seed'],
    generators: argv.generator,
    setup:
      argv.setup === undefined
        ? undefined
        : resolveSetup({ setup: argv.setup }, process.cwd()).setup,
  };

  const optedIn = Object.keys(apisCfg).filter(
    (name) => isPlainObject(apisCfg[name].client) || apisCfg[name].clientOutput !== undefined
  );
  if (argv.api === undefined) {
    if (argv.output) {
      throw new HandledError(
        `\n❌  --output can't target multiple APIs. Set \`clientOutput\` under each api in redocly.yaml, or pass a single <api>.\n`
      );
    }
    if (optedIn.length === 0) {
      throw new HandledError(
        `\n❌  No API to generate. Add a \`client\` block or \`clientOutput\` under an \`apis:\` entry, or pass <api> (a file/URL or an \`apis:\` alias).\n`
      );
    }
  }
  const entrypoints = await getFallbackApisOrExit(
    argv.api === undefined ? optedIn : [argv.api],
    config
  );

  const jobs: Job[] = entrypoints.map(({ path, alias }) => {
    const aliasConfig = config.forAlias(alias);
    const { client } = aliasConfig.resolvedConfig;
    return {
      name: alias ?? basename(path, extname(path)),
      api: path,
      aliasConfig,
      clientOutput: alias === undefined ? undefined : apisCfg[alias]?.clientOutput,
      client: resolveSetup((isPlainObject(client) ? client : {}) as ClientConfig, configDir),
    };
  });

  const seenOutputs = new Set<string>();

  for (const job of jobs) {
    const merged = mergeConfig(job.client, cliFlags);

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
    if (seenOutputs.has(outputPath)) {
      throw new HandledError(
        `\n❌  Two APIs resolve to the same output path: ${outputPath}.\n   Give each api a distinct \`clientOutput\`.\n`
      );
    }
    seenOutputs.add(outputPath);
    if (merged.serverUrl !== undefined && !isValidServerUrl(merged.serverUrl)) {
      throw new HandledError(
        `\n❌  --server-url must be an absolute URL (https://api.example.com) or a root-relative path (/v1).\n   Got: ${merged.serverUrl}\n`
      );
    }

    try {
      logger.info(gray(`\n  Generating TypeScript client for ${job.name}... \n`));
      const result = await generateClient({
        ...merged,
        api: job.api,
        output: outputPath,
        config: job.aliasConfig,
        configDir,
      });
      const fileCount = `${result.files.length} ${pluralize('file', result.files.length)}`;
      const summary = `TypeScript client successfully generated: ${fileCount} (${
        result.bytes
      } bytes) at ${yellow(result.outputPath)}.`;
      logger.info('\n' + blue(summary) + '\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HandledError(
        `\n❌  Failed to generate TypeScript client for ${job.name}.\n   ${message}\n`
      );
    }
  }
}
