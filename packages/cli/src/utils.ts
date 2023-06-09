import { basename, dirname, extname, join, resolve, relative, isAbsolute } from 'path';
import { blue, gray, green, red, yellow } from 'colorette';
import { performance } from 'perf_hooks';
import * as glob from 'glob-promise';
import * as fs from 'fs';
import * as readline from 'readline';
import { Writable } from 'stream';
import {
  BundleOutputFormat,
  StyleguideConfig,
  ResolveError,
  YamlParseError,
  ResolvedApi,
  parseYaml,
  stringifyYaml,
  isAbsoluteUrl,
  loadConfig,
  RawConfig,
  Region,
  Config,
  Oas3Definition,
  Oas2Definition,
} from '@redocly/openapi-core';
import { Totals, outputExtensions, Entrypoint, ConfigApis } from './types';
import { isEmptyObject } from '@redocly/openapi-core/lib/utils';
import * as process from "process";

export async function getFallbackApisOrExit(
    argsApis: string[] | undefined,
    config: ConfigApis
): Promise<Entrypoint[]> {
  const { apis } = config;
  const shouldFallbackToAllDefinitions =
    !isNotEmptyArray(argsApis) && apis && Object.keys(apis).length > 0;
  const res = shouldFallbackToAllDefinitions
    ? fallbackToAllDefinitions(apis, config)
    : await expandGlobsInEntrypoints(argsApis!, config);

  const filteredInvalidEntrypoints = res.filter(({ path }) => !isApiPathValid(path));
  if (isNotEmptyArray(filteredInvalidEntrypoints)) {
    for (const { path } of filteredInvalidEntrypoints) {
      process.stderr.write(
        yellow(
          `\n${relative(process.cwd(), path)} ${red(
            `does not exist or is invalid.\n\n`
          )}`
        )
      );
    }
    exitWithError('Please provide a valid path.');
  }
  return res;
}

function getConfigDirectory(config: ConfigApis) {
  return config.configFile ? dirname(config.configFile) : process.cwd();
}

function isNotEmptyArray<T>(args?: T[]): boolean {
  return Array.isArray(args) && !!args.length;
}

function isApiPathValid(apiPath: string): string | void {
  if (!apiPath.trim()) {
    exitWithError('Path cannot be empty.');
    return;
  }
  return fs.existsSync(apiPath) || isAbsoluteUrl(apiPath) ? apiPath : undefined;
}

function fallbackToAllDefinitions(
  apis: Record<string, ResolvedApi>,
  config: ConfigApis
): Entrypoint[] {
  return Object.entries(apis).map(([alias, { root }]) => ({
    path: isAbsoluteUrl(root) ? root : resolve(getConfigDirectory(config), root),
    alias,
  }));
}

function getAliasOrPath(config: ConfigApis, aliasOrPath: string): Entrypoint {
  return config.apis[aliasOrPath]
    ? { path: config.apis[aliasOrPath]?.root, alias: aliasOrPath }
    : {
        path: aliasOrPath,
        // find alias by path, take the first match
        alias:
          Object.entries(config.apis).find(([_alias, api]) => {
            return resolve(api.root) === resolve(aliasOrPath);
          })?.[0] ?? undefined,
      };
}

async function expandGlobsInEntrypoints(args: string[], config: ConfigApis) {
  return (
    await Promise.all(
      (args as string[]).map(async (aliasOrPath) => {
        return glob.hasMagic(aliasOrPath) && !isAbsoluteUrl(aliasOrPath)
          ? (await glob(aliasOrPath)).map((g: string) => getAliasOrPath(config, g))
          : getAliasOrPath(config, aliasOrPath);
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
  process.stderr.write(gray(`\n${api}: ${commandName} processed in ${elapsed}\n\n`));
}

export function pathToFilename(path: string, pathSeparator: string) {
  return path
    .replace(/~1/g, '/')
    .replace(/~0/g, '~')
    .replace(/^\//, '')
    .replace(/\//g, pathSeparator);
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

export function dumpBundle(obj: any, format: BundleOutputFormat, dereference?: boolean): string {
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

export function writeYaml(data: any, filename: string, noRefs = false) {
  const content = stringifyYaml(data, { noRefs });

  if (process.env.NODE_ENV === 'test') {
    process.stderr.write(content);
    return;
  }
  fs.mkdirSync(dirname(filename), { recursive: true });
  fs.writeFileSync(filename, content);
}

export function pluralize(label: string, num: number) {
  if (label.endsWith('is')) {
    [label] = label.split(' ');
    return num === 1 ? `${label} is` : `${label}s are`;
  }
  return num === 1 ? `${label}` : `${label}s`;
}

export function handleError(e: Error, ref: string) {
  switch (e.constructor) {
    case HandledError: {
      throw e;
    }
    case ResolveError:
      return exitWithError(`Failed to resolve api definition at ${ref}:\n\n  - ${e.message}.`);
    case YamlParseError:
      return exitWithError(`Failed to parse api definition at ${ref}:\n\n  - ${e.message}.`);
    // TODO: codeframe
    case CircularJSONNotSupportedError: {

      return exitWithError(
        `Detected circular reference which can't be converted to JSON.\n` +
      `Try to use ${blue('yaml')} output or remove ${blue('--dereferenced')}.`)
  
    }
    case SyntaxError:
      return exitWithError(`Syntax error: ${e.message} ${e.stack?.split('\n\n')?.[0]}`);
    default: {
      console.error(e.stack);
      exitWithError(`Something went wrong when processing ${ref}:\n\n  - ${e.message}.`);
    }
  }
}

export class HandledError extends Error {
}

export function printLintTotals(totals: Totals, definitionsCount: number) {
  const ignored = totals.ignored
    ? yellow(`${totals.ignored} ${pluralize('problem is', totals.ignored)} explicitly ignored.\n\n`)
    : '';

  if (totals.errors > 0) {
    process.stderr.write(
      red(
        `❌ Validation failed with ${totals.errors} ${pluralize('error', totals.errors)}${
          totals.warnings > 0
            ? ` and ${totals.warnings} ${pluralize('warning', totals.warnings)}`
            : ''
        }.\n${ignored}`
      )
    );
  } else if (totals.warnings > 0) {
    process.stderr.write(
      green(`Woohoo! Your OpenAPI ${pluralize('definition is', definitionsCount)} valid. 🎉\n`)
    );
    process.stderr.write(
      yellow(`You have ${totals.warnings} ${pluralize('warning', totals.warnings)}.\n${ignored}`)
    );
  } else {
    process.stderr.write(
      green(
        `Woohoo! Your OpenAPI ${pluralize('definition is', definitionsCount)} valid. 🎉\n${ignored}`
      )
    );
  }

  if (totals.errors > 0) {
    process.stderr.write(
      gray(`run \`redocly lint --generate-ignore-file\` to add all problems to the ignore file.\n`)
    );
  }

  process.stderr.write('\n');
}

export function printConfigLintTotals(totals: Totals): void {
  if (totals.errors > 0) {
    process.stderr.write(
      red(
        `❌ Your config has ${totals.errors} ${pluralize('error', totals.errors)}${
          totals.warnings > 0
            ? ` and ${totals.warnings} ${pluralize('warning', totals.warnings)}`
            : ''
        }.\n`
      )
    );
  } else if (totals.warnings > 0) {
    process.stderr.write(
      yellow(`You have ${totals.warnings} ${pluralize('warning', totals.warnings)}.\n`)
    );
  }
}

export function getOutputFileName(
  entrypoint: string,
  entries: number,
  output?: string,
  ext?: BundleOutputFormat
) {
  if (!output) {
    return { outputFile: 'stdout', ext: ext || 'yaml' };
  }

  let outputFile = output;
  if (entries > 1) {
    ext = ext || (extname(entrypoint).substring(1) as BundleOutputFormat);
    if (!outputExtensions.includes(ext as any)) {
      throw new Error(`Invalid file extension: ${ext}.`);
    }
    outputFile = join(output, basename(entrypoint, extname(entrypoint))) + '.' + ext;
  } else {
    if (output) {
      ext = ext || (extname(output).substring(1) as BundleOutputFormat);
    }
    ext = ext || (extname(entrypoint).substring(1) as BundleOutputFormat);
    if (!outputExtensions.includes(ext as any)) {
      throw new Error(`Invalid file extension: ${ext}.`);
    }
    outputFile = join(dirname(outputFile), basename(outputFile, extname(outputFile))) + '.' + ext;
  }
  return { outputFile, ext };
}

export function printUnusedWarnings(config: StyleguideConfig) {
  const { preprocessors, rules, decorators } = config.getUnusedRules();
  if (rules.length) {
    process.stderr.write(
      yellow(
        `[WARNING] Unused rules found in ${blue(config.configFile || '')}: ${rules.join(', ')}.\n`
      )
    );
  }
  if (preprocessors.length) {
    process.stderr.write(
      yellow(
        `[WARNING] Unused preprocessors found in ${blue(
          config.configFile || ''
        )}: ${preprocessors.join(', ')}.\n`
      )
    );
  }
  if (decorators.length) {
    process.stderr.write(
      yellow(
        `[WARNING] Unused decorators found in ${blue(config.configFile || '')}: ${decorators.join(
          ', '
        )}.\n`
      )
    );
  }

  if (rules.length || preprocessors.length) {
    process.stderr.write(`Check the spelling and verify the added plugin prefix.\n`);
  }
}

export function exitWithError(message: string) {
  process.stderr.write(red(message) + '\n\n');
  throw new HandledError(message);
}

/**
 * Checks if dir is subdir of parent
 */
export function isSubdir(parent: string, dir: string): boolean {
  const relativePath = relative(parent, dir);
  return !!relativePath && !/^..($|\/)/.test(relativePath) && !isAbsolute(relativePath);
}

export async function loadConfigAndHandleErrors(
  options: {
    configPath?: string;
    customExtends?: string[];
    processRawConfig?: (rawConfig: RawConfig) => void | Promise<void>;
    files?: string[];
    region?: Region;
  } = {}
): Promise<Config> {
  try {
    return await loadConfig(options);
  } catch (e) {
    handleError(e, '');
    return new Config({ apis: {}, styleguide: {} });
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

export function checkIfRulesetExist(rules: typeof StyleguideConfig.prototype.rules) {
  const ruleset = {
    ...rules.oas2,
    ...rules.oas3_0,
    ...rules.oas3_0,
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
