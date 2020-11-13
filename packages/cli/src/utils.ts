import { performance } from "perf_hooks";
import * as colors from 'colorette';
import * as glob from 'glob-promise';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { BundleOutputFormat, Config, NormalizedProblem } from "@redocly/openapi-core";
import { dirname, resolve } from 'path';
import { Totals } from './types';

export async function getFallbackEntryPointsOrExit(argsEntrypoints: string[] | undefined, config: Config) {
  const { apiDefinitions } = config;
  const shouldFallbackToAllDefinitions = !isNotEmptyArray(argsEntrypoints) && apiDefinitions && Object.keys(apiDefinitions).length > 0;
  const res = shouldFallbackToAllDefinitions
    ? Object.values(apiDefinitions).map((fileName) => resolve(getConfigDirectory(config), fileName))
    : await expandGlobsInEntrypoints(argsEntrypoints!, config);

  if (!isNotEmptyArray(res)) {
    process.stderr.write('error: missing required argument `entrypoints`.\n');
    process.exit(1);
  }
  return res;
}

function getConfigDirectory(config: Config) {
  return config.configFile ? dirname(config.configFile) : process.cwd();
}

function isNotEmptyArray(args?: string[]): boolean {
  return Array.isArray(args) && !!args.length;
}
function getAliasOrPath(config: Config, aliasOrPath: string) {
  return config.apiDefinitions[aliasOrPath] || aliasOrPath;
}

async function expandGlobsInEntrypoints(args: string[], config: Config) {
  return (await Promise.all((args as string[]).map(async aliasOrPath => {
    return glob.hasMagic(aliasOrPath)
      ? (await glob(aliasOrPath)).map((g: string) => getAliasOrPath(config, g))
      : getAliasOrPath(config, aliasOrPath);
  }))).flat();
}

export function getTotals(problems: (NormalizedProblem & { ignored?: boolean })[]): Totals {
  let errors = 0;
  let warnings = 0;
  let ignored = 0;

  for (const m of problems) {
    if (m.ignored) {
      ignored++;
      continue;
    }
    if (m.severity === 'error') errors++;
    if (m.severity === 'warn') warnings++;
  }

  return {
    errors,
    warnings,
    ignored,
  };
}

export function getExecutionTime(startedAt: number) {
  return process.env.NODE_ENV === 'test'
    ? '<test>ms'
    : `${Math.ceil(performance.now() - startedAt)}ms`;
}

export function printExecutionTime(commandName: string, startedAt: number, entrypoint: string) {
  const elapsed = getExecutionTime(startedAt);
  process.stderr.write(colors.gray(`\n${entrypoint}: ${commandName} processed in ${elapsed}\n\n`));
}

export function pathToFilename(path: string) {
  return path
    .replace(/~1/g, '/')
    .replace(/~0/g, '~')
    .substring(1)
    .replace(/\//g, '@');
}

export class CircularJSONNotSupportedError extends Error {
  constructor(public originalError: Error) {
    super(originalError.message);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, CircularJSONNotSupportedError.prototype);
  }
}

export function dumpBundle(obj: any, format: BundleOutputFormat, dereference?: boolean) {
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
    return yaml.safeDump(obj, {
      noRefs: !dereference,
    });
  }
}

export function saveBundle(filename: string, output: string) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, output);
}

export async function promptUser(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${query}:\n\n  `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export function readYaml(filename: string) {
  return yaml.safeLoad(fs.readFileSync(filename, 'utf-8'), { filename });
}

export function writeYaml(data: any, filename: string) {
  return fs.writeFileSync(filename, yaml.safeDump(data));
}
