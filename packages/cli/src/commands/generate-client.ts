import type {
  GenerateClientConfig,
  generateClient as generateClientFunction,
  mergeConfig as mergeConfigFunction,
} from '@redocly/client-generator';
import { HandledError, isPlainObject, logger, pluralize } from '@redocly/openapi-core';
import { blue, gray, yellow } from 'colorette';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve as resolvePath,
} from 'node:path';

import {
  BUILTIN_GENERATOR_NAMES,
  categorizeGenerateClientError,
  collectToolkitImports,
  generateClientTelemetry,
  parseEjectedProvenance,
} from '../utils/client-generator-telemetry.js';
import { getFallbackApisOrExit } from '../utils/miscellaneous.js';
import { type CommandArgs } from '../wrapper.js';

export type GenerateClientCommandArgv = {
  api?: string;
  output?: string;
  config?: string;
  'server-url'?: string;
  'output-mode'?: 'single' | 'split';
  runtime?: 'inline' | 'package';
  'import-ext'?: 'js' | 'ts';
  'bin-name'?: string;
  'go-package'?: string;
  'args-style'?: 'flat' | 'grouped';
  'error-mode'?: 'throw' | 'result';
  'date-type'?: 'string' | 'Date';
  'mock-data'?: 'static' | 'faker';
  'mock-seed'?: number;
  generator?: string[];
  setup?: string;
};

// Two+ letter scheme, so Windows drive paths (`C:\...`) don't match.
const URL_SCHEME = /^[a-z][a-z0-9+.-]+:/i;

function resolveSetup(client: GenerateClientConfig, configDir: string): GenerateClientConfig {
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

type ClientGeneratorToolkit = {
  generateClient: typeof generateClientFunction;
  mergeConfig: typeof mergeConfigFunction;
  helperNames: readonly string[];
};

type GenerationRun = {
  config: CommandArgs<GenerateClientCommandArgv>['config'];
  configDir: string;
  cliFlags: GenerateClientConfig;
  outputFlag: string | undefined;
  toolkit: ClientGeneratorToolkit;
  /** Every path this run wrote or will write — collision guard across apis and the composed entry. */
  seenOutputs: Set<string>;
  /** Every api that emits a cli module, gathered for the composed entry (client.cliOutput). */
  composable: Array<{ alias: string; cliPath: string }>;
};

export async function handleGenerateClient({
  argv,
  config,
}: CommandArgs<GenerateClientCommandArgv>) {
  const { AUTHORING_HELPER_NAMES, generateClient, mergeConfig } =
    await import('@redocly/client-generator');

  const configDir = config.configPath ? dirname(config.configPath) : process.cwd();

  const cliFlags: GenerateClientConfig = {
    serverUrl: argv['server-url'],
    outputMode: argv['output-mode'],
    runtime: argv.runtime,
    importExt: argv['import-ext'],
    binName: argv['bin-name'],
    goPackage: argv['go-package'],
    argsStyle: argv['args-style'],
    errorMode: argv['error-mode'],
    dateType: argv['date-type'],
    mockData: argv['mock-data'],
    mockSeed: argv['mock-seed'],
    generators: argv.generator?.map((specifier) =>
      specifier.startsWith('.') ? resolvePath(specifier) : specifier
    ),
    setup:
      argv.setup === undefined
        ? undefined
        : resolveSetup({ setup: argv.setup }, process.cwd()).setup,
  };

  const apis = config.resolvedConfig.apis ?? {};
  const optedIn = Object.keys(apis).filter(
    (name) => isPlainObject(apis[name].client) || apis[name].clientOutput !== undefined
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

  const run: GenerationRun = {
    config,
    configDir,
    cliFlags,
    outputFlag: argv.output,
    toolkit: { generateClient, mergeConfig, helperNames: AUTHORING_HELPER_NAMES },
    seenOutputs: new Set<string>(),
    composable: [],
  };

  for (const entry of entrypoints) {
    await generateApiClient(entry, run);
  }

  // Top-level `client.cliOutput` only — a per-api block composes nothing — and only for
  // the run-everything form, where all the modules exist.
  const topLevelClient = (
    isPlainObject(config.resolvedConfig.client) ? config.resolvedConfig.client : {}
  ) as GenerateClientConfig;
  if (
    topLevelClient.cliOutput !== undefined &&
    argv.api === undefined &&
    run.composable.length > 0
  ) {
    await writeComposedCliEntry(topLevelClient.cliOutput, topLevelClient.binName, run);
  }
}

async function generateApiClient(
  entry: { path: string; alias?: string },
  { config, configDir, cliFlags, outputFlag, toolkit, seenOutputs, composable }: GenerationRun
): Promise<void> {
  const { path, alias } = entry;
  const name = alias ?? basename(path, extname(path));
  const aliasConfig = config.forAlias(alias);
  const { client, clientOutput } = aliasConfig.resolvedConfig;
  const clientBlock = resolveSetup(
    (isPlainObject(client) ? client : {}) as GenerateClientConfig,
    configDir
  );
  const clientConfig = toolkit.mergeConfig(clientBlock, cliFlags);
  collectGeneratorUsage(clientConfig.generators ?? [], toolkit.helperNames, configDir);

  const outputPath =
    outputFlag !== undefined
      ? resolvePath(outputFlag)
      : clientOutput !== undefined
        ? resolvePath(configDir, clientOutput)
        : resolvePath(configDir, fileNameFor(name));

  if (!outputPath.endsWith('.ts')) {
    throw new HandledError(
      `\n❌  output must point at a TypeScript file (ending in .ts).\n   Got: ${outputPath}\n`
    );
  }
  if (seenOutputs.has(outputPath)) {
    throw new HandledError(
      `\n❌  Two APIs write to the same path: ${outputPath}.\n   Give each api a distinct \`clientOutput\`.\n`
    );
  }
  seenOutputs.add(outputPath);
  if (clientConfig.serverUrl !== undefined && !isValidServerUrl(clientConfig.serverUrl)) {
    throw new HandledError(
      `\n❌  serverUrl must be an absolute URL (https://api.example.com) or a root-relative path (/v1) — set via --server-url or the \`client\` block in redocly.yaml.\n   Got: ${clientConfig.serverUrl}\n`
    );
  }

  try {
    logger.info(gray(`\n  Generating client for ${name}... \n`));
    const result = await toolkit.generateClient({
      ...clientConfig,
      api: path,
      output: outputPath,
      config: aliasConfig,
      configDir,
    });
    // The emitted module decides what composes: `cli` reaches a run as a built-in
    // name, a path to an ejected copy, or another generator's prerequisite.
    const cliModule = result.files.find((file) => file.path.endsWith('.cli.ts'));
    if (cliModule !== undefined) {
      const importExt = clientConfig.importExt ?? 'js';
      composable.push({
        alias: name,
        cliPath: cliModule.path.replace(/\.ts$/, importExt === 'ts' ? '.ts' : '.js'),
      });
    }
    // Sibling modules (`.cli.ts`, `.zod.ts`, …) count too: the composed entry is
    // written after the per-api runs and must not land on any of them.
    for (const file of result.files) {
      seenOutputs.add(file.path);
    }
    const fileCount = `${result.files.length} ${pluralize('file', result.files.length)}`;
    const summary = `Client successfully generated: ${fileCount} (${
      result.bytes
    } bytes) at ${yellow(result.outputPath)}.`;
    logger.info('\n' + blue(summary) + '\n');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    generateClientTelemetry.generate_client_error_category = categorizeGenerateClientError(message);
    throw new HandledError(`\n❌  Failed to generate client for ${name}.\n   ${message}\n`);
  }
}

/** The composed entry: one binary over every api that emitted a cli module, each behind
 * its alias as a namespace. */
async function writeComposedCliEntry(
  cliOutput: string,
  configuredBinName: string | undefined,
  { configDir, seenOutputs, composable }: GenerationRun
): Promise<void> {
  const { renderComposedCliEntry } = await import('@redocly/client-generator/generate');
  const entryPath = resolvePath(configDir, cliOutput);
  if (!entryPath.endsWith('.ts')) {
    throw new HandledError(
      `\n❌  client.cliOutput must point at a TypeScript file (ending in .ts).\n   Got: ${entryPath}\n`
    );
  }
  if (seenOutputs.has(entryPath)) {
    throw new HandledError(
      `\n❌  client.cliOutput resolves to a file this run generated: ${entryPath}.\n   Give the composed entry its own path.\n`
    );
  }
  const binName =
    configuredBinName ??
    basename(entryPath, extname(entryPath))
      .replace(/[^A-Za-z0-9]+/g, '-')
      .toLowerCase();
  const content = renderComposedCliEntry(
    composable.map(({ alias, cliPath }) => ({
      alias,
      modulePath: `./${relative(dirname(entryPath), cliPath).split('\\').join('/')}`,
    })),
    binName
  );
  await mkdir(dirname(entryPath), { recursive: true });
  await writeFile(entryPath, content, 'utf-8');
  generateClientTelemetry.generate_client_composed_apis_count = composable.length;
  logger.info(
    '\n' +
      blue(
        `Composed CLI written to ${yellow(relative(process.cwd(), entryPath))} — ${composable
          .map(({ alias }) => alias)
          .join(', ')} behind one \`${binName}\` binary.`
      ) +
      '\n'
  );
}

/** A custom generator shared by several apis counts once, like the built-in names. */
const seenCustomEntries = new Set<string>();

/** Telemetry: allowlisted built-in names, custom count, and OUR helper names a
 * path generator imports — never user code, paths, or names. */
export function collectGeneratorUsage(
  entries: string[],
  knownHelpers: readonly string[],
  configDir: string
): void {
  const builtins = new Set(generateClientTelemetry.generate_client_builtin_generators ?? []);
  const toolkitImports = new Set(generateClientTelemetry.generate_client_toolkit_imports ?? []);
  const ejected = new Set(generateClientTelemetry.generate_client_ejected_generators ?? []);
  let customCount = generateClientTelemetry.generate_client_custom_generators_count ?? 0;
  for (const entry of entries) {
    if (BUILTIN_GENERATOR_NAMES.has(entry)) {
      builtins.add(entry);
      continue;
    }
    if (seenCustomEntries.has(entry)) continue;
    seenCustomEntries.add(entry);
    customCount++;
    if (entry.startsWith('.') || isAbsolute(entry)) {
      try {
        // Relative entries resolve against the config's directory, like the pipeline does.
        const source = readFileSync(resolvePath(configDir, entry), 'utf-8');
        for (const helper of collectToolkitImports(source, knownHelpers)) {
          toolkitImports.add(helper);
        }
        const provenance = parseEjectedProvenance(source);
        if (provenance) ejected.add(`${provenance.name}@${provenance.version}`);
      } catch {
        // Unreadable path: generation fails later with its own error; nothing to record.
      }
    }
  }
  generateClientTelemetry.generate_client_builtin_generators = [...builtins];
  generateClientTelemetry.generate_client_custom_generators_count = customCount;
  generateClientTelemetry.generate_client_toolkit_imports = [...toolkitImports];
  generateClientTelemetry.generate_client_ejected_generators = [...ejected];
}
