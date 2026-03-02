import {
  ResolveError,
  YamlParseError,
  parseYaml,
  stringifyYaml,
  isAbsoluteUrl,
  loadConfig,
  isEmptyObject,
  isNotEmptyArray,
  isNotEmptyObject,
  pluralize,
  ConfigValidationError,
  logger,
  HandledError,
} from '@redocly/openapi-core';
import type { Config, Oas3Definition, Oas2Definition, Exact } from '@redocly/openapi-core';
import { blue, gray, green, red, yellow } from 'colorette';
import { hasMagic, glob } from 'glob';
import * as fs from 'node:fs';
import { basename, dirname, extname, join, resolve, relative } from 'node:path';
import * as process from 'node:process';
import * as readline from 'node:readline';
import { Writable } from 'node:stream';
import { performance } from 'perf_hooks';

import { handleLintConfig } from '../commands/lint.js';
import { outputExtensions } from '../types.js';
import type { Totals, Entrypoint, OutputExtension, CommandArgv } from '../types.js';
import { exitWithError } from './error.js';

export type ExitCode = 0 | 1 | 2;

export async function getFallbackApisOrExit(
  argsApis: string[] | undefined,
  config: Config
): Promise<Entrypoint[]> {
  const shouldFallbackToAllDefinitions =
    !isNotEmptyArray(argsApis) && isNotEmptyObject(config.resolvedConfig.apis);
  const res = shouldFallbackToAllDefinitions
    ? fallbackToAllDefinitions(config)
    : await expandGlobsInEntrypoints(argsApis!, config);

  const filteredInvalidEntrypoints = res.filter(({ path }) => !isApiPathValid(path));
  if (isNotEmptyArray(filteredInvalidEntrypoints)) {
    for (const { path } of filteredInvalidEntrypoints) {
      logger.warn(`\n${formatPath(path)} ${red(`does not exist or is invalid.\n\n`)}`);
    }
    exitWithError('Please provide a valid path.');
  }
  return res;
}

export function getConfigDirectory(config: Config) {
  return config.configPath ? dirname(config.configPath) : process.cwd();
}

function isApiPathValid(apiPath: string): string | void {
  if (!apiPath.trim()) {
    exitWithError('Path cannot be empty.');
    return;
  }
  return fs.existsSync(apiPath) || isAbsoluteUrl(apiPath) ? apiPath : undefined;
}

function fallbackToAllDefinitions(config: Config): Entrypoint[] {
  return Object.entries(config.resolvedConfig.apis || {}).map(([alias, { root, output }]) => ({
    path: isAbsoluteUrl(root) ? root : resolve(getConfigDirectory(config), root),
    alias,
    output: output && resolve(getConfigDirectory(config), output),
  }));
}

export function getAliasOrPath(config: Config, aliasOrPath: string): Entrypoint {
  const configDir = getConfigDirectory(config);
  const aliasApi = config.resolvedConfig.apis?.[aliasOrPath];
  return aliasApi
    ? {
        path: isAbsoluteUrl(aliasApi.root) ? aliasApi.root : resolve(configDir, aliasApi.root),
        alias: aliasOrPath,
        output: aliasApi.output && resolve(configDir, aliasApi.output),
      }
    : {
        path: aliasOrPath,
        // find alias by path, take the first match
        alias:
          Object.entries(config.resolvedConfig.apis || {}).find(([_alias, api]) => {
            return resolve(configDir, api.root) === resolve(aliasOrPath);
          })?.[0] ?? undefined,
      };
}

async function expandGlobsInEntrypoints(argApis: string[], config: Config) {
  return (
    await Promise.all(
      argApis.map(async (aliasOrPath) => {
        const shouldResolveGlob = hasMagic(aliasOrPath) && !isAbsoluteUrl(aliasOrPath);

        if (shouldResolveGlob) {
          const data = await glob(aliasOrPath, {
            cwd: getConfigDirectory(config),
          });

          return data.map((g: string) => getAliasOrPath(config, g));
        }

        return getAliasOrPath(config, aliasOrPath);
      })
    )
  ).flat();
}

export function getExecutionTime(startedAt: number) {
  return process.env.NODE_ENV === 'test'
    ? '<test>ms'
    : `${Math.ceil(performance.now() - startedAt)}ms`;
}

export function printExecutionTime(commandName: string, startedAt: number, api: string) {
  const elapsed = getExecutionTime(startedAt);
  logger.info(gray(`\n${api}: ${commandName} processed in ${elapsed}\n\n`));
}

export function pathToFilename(path: string, pathSeparator: string) {
  if (path === '/') {
    return pathSeparator;
  }

  return path
    .replaceAll('~1', '/')
    .replaceAll('~0', '~')
    .replace(/^\//, '')
    .replaceAll('/', pathSeparator);
}

export function escapeLanguageName(lang: string) {
  return lang.replace(/#/g, '_sharp').replace(/\//, '_').replace(/\s/g, '');
}

export function langToExt(lang: string) {
  const langObj: any = {
    php: '.php',
    'c#': '.cs',
    shell: '.sh',
    curl: '.sh',
    bash: '.sh',
    javascript: '.js',
    js: '.js',
    python: '.py',
    c: '.c',
    'c++': '.cpp',
    coffeescript: '.litcoffee',
    dart: '.dart',
    elixir: '.ex',
    go: '.go',
    groovy: '.groovy',
    java: '.java',
    kotlin: '.kt',
    'objective-c': '.m',
    perl: '.pl',
    powershell: '.ps1',
    ruby: '.rb',
    rust: '.rs',
    scala: '.sc',
    swift: '.swift',
    typescript: '.ts',
    tsx: '.tsx',
    'visual basic': '.vb',
    'c/al': '.al',
  };
  return langObj[lang.toLowerCase()];
}

export class CircularJSONNotSupportedError extends Error {
  constructor(public originalError: Error) {
    super(originalError.message);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, CircularJSONNotSupportedError.prototype);
  }
}

export function dumpBundle(obj: any, format: OutputExtension, dereference?: boolean): string {
  if (format === 'json') {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      if (e.message.indexOf('circular') > -1) {
        throw new CircularJSONNotSupportedError(e);
      }
      throw e;
    }
  } else {
    return stringifyYaml(obj, {
      noRefs: !dereference,
      lineWidth: -1,
    });
  }
}

export function saveBundle(filename: string, output: string) {
  fs.mkdirSync(dirname(filename), { recursive: true });
  fs.writeFileSync(filename, output);
}

export async function promptUser(query: string, hideUserInput = false): Promise<string> {
  return new Promise((resolve) => {
    let output: Writable = process.stdout;
    let isOutputMuted = false;

    if (hideUserInput) {
      output = new Writable({
        write: (chunk, encoding, callback) => {
          if (!isOutputMuted) {
            process.stdout.write(chunk, encoding);
          }
          callback();
        },
      });
    }

    const rl = readline.createInterface({
      input: process.stdin,
      output,
      terminal: true,
      historySize: hideUserInput ? 0 : 30,
    });

    rl.question(`${query}:\n\n  `, (answer) => {
      rl.close();
      resolve(answer);
    });

    isOutputMuted = hideUserInput;
  });
}

export function readYaml(filename: string) {
  return parseYaml(fs.readFileSync(filename, 'utf-8'), { filename });
}

export function writeToFileByExtension(data: unknown, filePath: string, noRefs?: boolean) {
  const ext = getAndValidateFileExtension(filePath);

  if (ext === 'json') {
    writeJson(data, filePath);
    return;
  }

  writeYaml(data, filePath, noRefs);
}

export function writeYaml(data: any, filename: string, noRefs = false) {
  const content = stringifyYaml(data, { noRefs });

  if (process.env.NODE_ENV === 'test') {
    logger.info(content);
    return;
  }
  fs.mkdirSync(dirname(filename), { recursive: true });
  fs.writeFileSync(filename, content);
}

export function writeJson(data: unknown, filename: string) {
  const content = JSON.stringify(data, null, 2);

  if (process.env.NODE_ENV === 'test') {
    logger.info(content);
    return;
  }
  fs.mkdirSync(dirname(filename), { recursive: true });
  fs.writeFileSync(filename, content);
}

export function getAndValidateFileExtension(fileName: string): NonNullable<OutputExtension> {
  const ext = fileName.split('.').pop();
  if (outputExtensions.includes(ext as OutputExtension)) {
    return ext as OutputExtension;
  }
  logger.warn(`Unsupported file extension: ${ext}. Using yaml.\n`);
  return 'yaml';
}

export function handleError(e: Error, ref: string): never {
  switch (e.constructor) {
    case HandledError: {
      throw e;
    }
    case ResolveError:
      exitWithError(`Failed to resolve API description at ${ref}:\n\n  - ${e.message}`);
      break;
    case YamlParseError:
      exitWithError(`Failed to parse API description at ${ref}:\n\n  - ${e.message}`);
      break;
    case CircularJSONNotSupportedError: {
      exitWithError(
        `Detected circular reference which can't be converted to JSON.\n` +
          `Try to use ${blue('yaml')} output or remove ${blue('--dereferenced')}.`
      );
      break;
    }
    case SyntaxError:
      exitWithError(`Syntax error: ${e.message} ${e.stack?.split('\n\n')?.[0]}`);
      break;
    case ConfigValidationError:
      exitWithError(e.message);
      break;
    default: {
      exitWithError(`Something went wrong when processing ${ref}:\n\n  - ${e.message}`);
    }
  }
}

export function printLintTotals(totals: Totals, definitionsCount: number) {
  const ignored = totals.ignored
    ? yellow(`${totals.ignored} ${pluralize('problem is', totals.ignored)} explicitly ignored.\n\n`)
    : '';

  if (totals.errors > 0) {
    logger.error(
      `❌ Validation failed with ${totals.errors} ${pluralize('error', totals.errors)}${
        totals.warnings > 0
          ? ` and ${totals.warnings} ${pluralize('warning', totals.warnings)}`
          : ''
      }.\n${ignored}`
    );
  } else if (totals.warnings > 0) {
    logger.info(
      green(`Woohoo! Your API ${pluralize('description is', definitionsCount)} valid. 🎉\n`)
    );
    logger.warn(
      `You have ${totals.warnings} ${pluralize('warning', totals.warnings)}.\n${ignored}`
    );
  } else {
    logger.info(
      green(
        `Woohoo! Your API ${pluralize('description is', definitionsCount)} valid. 🎉\n${ignored}`
      )
    );
  }

  if (totals.errors > 0) {
    logger.info(
      gray(`run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.\n`)
    );
  }

  logger.info('\n');
}

export function printConfigLintTotals(totals: Totals, command?: string | number): void {
  if (totals.errors > 0) {
    logger.error(`❌ Your config has ${totals.errors} ${pluralize('error', totals.errors)}.\n`);
  } else if (totals.warnings > 0) {
    logger.warn(
      `⚠️ Your config has ${totals.warnings} ${pluralize('warning', totals.warnings)}.\n`
    );
  } else if (command === 'check-config') {
    logger.info(green('✅  Your config is valid.\n'));
  }
}

export function getOutputFileName({
  entrypoint,
  output,
  argvOutput,
  ext,
  entries,
}: {
  entrypoint: string;
  output?: string;
  argvOutput?: string;
  ext?: OutputExtension;
  entries: number;
}) {
  let outputFile = output || argvOutput;
  if (!outputFile) {
    return { ext: ext || 'yaml' };
  }

  if (entries > 1 && argvOutput) {
    ext = ext || (extname(entrypoint).substring(1) as OutputExtension);
    if (!outputExtensions.includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}.`);
    }
    outputFile = join(argvOutput, basename(entrypoint, extname(entrypoint))) + '.' + ext;
  } else {
    ext =
      ext ||
      (extname(outputFile).substring(1) as OutputExtension) ||
      (extname(entrypoint).substring(1) as OutputExtension);
    if (!outputExtensions.includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}.`);
    }
    outputFile = join(dirname(outputFile), basename(outputFile, extname(outputFile))) + '.' + ext;
  }
  return { outputFile, ext };
}

export function printUnusedWarnings(config: Config) {
  const { preprocessors, rules, decorators } = config.getUnusedRules();
  if (rules.length) {
    logger.warn(
      `[WARNING] Unused rules found in ${blue(config.configPath || '')}: ${rules.join(', ')}.\n`
    );
  }
  if (preprocessors.length) {
    logger.warn(
      `[WARNING] Unused preprocessors found in ${blue(
        config.configPath || ''
      )}: ${preprocessors.join(', ')}.\n`
    );
  }
  if (decorators.length) {
    logger.warn(
      `[WARNING] Unused decorators found in ${blue(config.configPath || '')}: ${decorators.join(
        ', '
      )}.\n`
    );
  }

  if (rules.length || preprocessors.length) {
    logger.warn(`Check the spelling and verify the added plugin prefix.\n`);
  }
}

export async function loadConfigAndHandleErrors(
  argv: Exact<CommandArgv>,
  version: string
): Promise<Config> {
  try {
    const config = await loadConfig({
      configPath: argv.config,
      customExtends: argv.extends as string[] | undefined,
    });
    await handleLintConfig(argv, version, config);
    return config;
  } catch (e) {
    handleError(e, '');
  }
}

export function sortTopLevelKeysForOas(
  document: Oas3Definition | Oas2Definition
): Oas3Definition | Oas2Definition {
  if ('swagger' in document) {
    return sortOas2Keys(document);
  }
  return sortOas3Keys(document as Oas3Definition);
}

function sortOas2Keys(document: Oas2Definition): Oas2Definition {
  const orderedKeys = [
    'swagger',
    'info',
    'host',
    'basePath',
    'schemes',
    'consumes',
    'produces',
    'security',
    'tags',
    'externalDocs',
    'paths',
    'definitions',
    'parameters',
    'responses',
    'securityDefinitions',
  ];
  const result: any = {};
  for (const key of orderedKeys as (keyof Oas2Definition)[]) {
    if (document.hasOwnProperty(key)) {
      result[key] = document[key];
    }
  }
  // merge any other top-level keys (e.g. vendor extensions)
  return Object.assign(result, document);
}
function sortOas3Keys(document: Oas3Definition): Oas3Definition {
  const orderedKeys = [
    'openapi',
    'info',
    'jsonSchemaDialect',
    'servers',
    'security',
    'tags',
    'externalDocs',
    'paths',
    'webhooks',
    'x-webhooks',
    'components',
  ];
  const result: any = {};
  for (const key of orderedKeys as (keyof Oas3Definition)[]) {
    if (document.hasOwnProperty(key)) {
      result[key] = document[key];
    }
  }
  // merge any other top-level keys (e.g. vendor extensions)
  return Object.assign(result, document);
}

export function checkIfRulesetExist(rules: typeof Config.prototype.rules) {
  const ruleset = {
    ...rules.oas2,
    ...rules.oas3_0,
    ...rules.oas3_1,
    ...rules.oas3_2,
    ...rules.async2,
    ...rules.async3,
    ...rules.arazzo1,
    ...rules.overlay1,
  };

  if (isEmptyObject(ruleset)) {
    exitWithError(
      '⚠️ No rules were configured. Learn how to configure rules: https://redocly.com/docs/cli/rules/'
    );
  }
}

export function cleanColors(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/\x1b\[\d+m/g, '');
}

export function formatPath(path: string) {
  if (isAbsoluteUrl(path)) {
    return path;
  }
  return relative(process.cwd(), path);
}

export function capitalize(s: string) {
  if (s?.length > 0) {
    return s[0].toUpperCase() + s.slice(1);
  }
  return s;
}
